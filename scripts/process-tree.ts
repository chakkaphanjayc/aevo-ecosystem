type ProcessTableEntry = {
  pid: number;
  parentPid: number;
  command: string;
};

function processTable(): ProcessTableEntry[] {
  const result = Bun.spawnSync(["ps", "-axo", "pid=,ppid=,command="]);
  const output = new TextDecoder().decode(result.stdout);
  return output.split(/\r?\n/u).flatMap((line) => {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/u.exec(line);
    if (!match) return [];
    return [{ pid: Number(match[1]), parentPid: Number(match[2]), command: match[3] ?? "" }];
  });
}

function listeningPids(port: number): number[] {
  const result = Bun.spawnSync(["lsof", "-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"]);
  const output = new TextDecoder().decode(result.stdout);
  return output.split(/\r?\n/u).flatMap((line) => {
    const pid = Number(line.trim());
    return Number.isInteger(pid) && pid > 0 ? [pid] : [];
  });
}

function processWorkingDirectory(pid: number): string | undefined {
  const result = Bun.spawnSync(["lsof", "-a", "-p", String(pid), "-d", "cwd", "-Fn"]);
  const output = new TextDecoder().decode(result.stdout);
  const match = /(?:^|\n)n([^\n]*)/u.exec(output);
  return match?.[1];
}

function workspaceProcessRoot(pid: number, workspaceRoot: string, table: ProcessTableEntry[]): number | undefined {
  const byPid = new Map(table.map((entry) => [entry.pid, entry]));
  const visited = new Set<number>();
  let root: number | undefined;
  let currentPid = pid;
  while (currentPid > 1 && !visited.has(currentPid)) {
    visited.add(currentPid);
    const entry = byPid.get(currentPid);
    if (!entry) return root;
    if (entry.command.includes(workspaceRoot) || processWorkingDirectory(currentPid)?.startsWith(workspaceRoot)) {
      root = currentPid;
    }
    currentPid = entry.parentPid;
  }
  return root;
}

function descendantsOf(rootPid: number): number[] {
  const childrenByParent = new Map<number, number[]>();
  for (const { pid, parentPid } of processTable()) {
    const children = childrenByParent.get(parentPid) ?? [];
    children.push(pid);
    childrenByParent.set(parentPid, children);
  }

  const descendants: number[] = [];
  function visit(parentPid: number): void {
    for (const childPid of childrenByParent.get(parentPid) ?? []) {
      visit(childPid);
      descendants.push(childPid);
    }
  }
  visit(rootPid);
  return descendants;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function workspaceLauncherPids(workspaceRoot: string, table: ProcessTableEntry[]): number[] {
  return table
    .filter(({ pid, command }) => {
      if (pid === process.pid || !command.includes("scripts/local-dev.ts")) return false;
      return command.includes(workspaceRoot) || processWorkingDirectory(pid)?.startsWith(workspaceRoot) === true;
    })
    .map(({ pid }) => pid);
}

function workspaceRuntimePids(workspaceRoot: string, table: ProcessTableEntry[]): number[] {
  return table
    .filter(({ pid, command }) => {
      if (pid === process.pid) return false;
      const inWorkspace = command.includes(workspaceRoot) || processWorkingDirectory(pid)?.startsWith(workspaceRoot) === true;
      if (!inWorkspace) return false;
      return command.includes("dotnet watch") || command.includes("dotnet-watch.dll") || command.includes("Aevo.CoreApi");
    })
    .map(({ pid }) => pid);
}

/** Stop a launcher child and every Bun/Wrangler/Vite process it spawned. */
export function killProcessTree(rootPid: number, signal: "SIGTERM" | "SIGKILL" = "SIGTERM"): void {
  for (const pid of descendantsOf(rootPid)) {
    try {
      process.kill(pid, signal);
    } catch {
      // The process may have exited between the ps snapshot and kill().
    }
  }
  try {
    process.kill(rootPid, signal);
  } catch {
    // The root may already have exited.
  }
}

async function portsInUse(ports: number[]): Promise<number[]> {
  return ports.filter((port) => listeningPids(port).length > 0);
}

/** Stop an existing Aevo local session before starting the requested apps. */
export async function stopWorkspaceProcessesOnPorts(ports: number[], workspaceRoot: string): Promise<void> {
  const uniquePorts = [...new Set(ports)];
  const table = processTable();
  const listeners = uniquePorts.flatMap((port) => listeningPids(port).map((pid) => ({ pid, port })));
  const launchers = workspaceLauncherPids(workspaceRoot, table);
  const runtimes = workspaceRuntimePids(workspaceRoot, table);
  if (listeners.length === 0 && launchers.length === 0 && runtimes.length === 0) return;

  const foreign = listeners.flatMap(({ pid, port }) => {
    const rootPid = workspaceProcessRoot(pid, workspaceRoot, table);
    return rootPid === undefined ? [{ pid, port }] : [];
  });
  if (foreign.length > 0) {
    const details = foreign.map(({ pid, port }) => `${port} (pid ${pid})`).join(", ");
    throw new Error(`Port(s) are occupied by a process outside this Aevo workspace: ${details}`);
  }

  const pids = [...new Set([
    ...launchers,
    ...runtimes,
    ...listeners.flatMap(({ pid }) => {
      const rootPid = workspaceProcessRoot(pid, workspaceRoot, table);
      return rootPid === undefined ? [] : [rootPid];
    })
  ])].filter((pid) => pid !== process.pid);
  console.log(`[Aevo Platform] stopping existing local process(es)${listeners.length > 0 ? ` on port(s): ${uniquePorts.join(", ")}` : ""}`);
  for (const pid of pids) killProcessTree(pid);

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const remainingPorts = await portsInUse(uniquePorts);
    const remainingLaunchers = workspaceLauncherPids(workspaceRoot, processTable());
    const remainingRuntimes = workspaceRuntimePids(workspaceRoot, processTable());
    if (remainingPorts.length === 0 && remainingLaunchers.length === 0 && remainingRuntimes.length === 0 && pids.every((pid) => !processAlive(pid))) return;
    await Bun.sleep(100);
  }

  const remaining = await portsInUse(uniquePorts);
  const remainingPids = [
    ...remaining.flatMap((port) => listeningPids(port)),
    ...workspaceLauncherPids(workspaceRoot, processTable()),
    ...workspaceRuntimePids(workspaceRoot, processTable())
  ];
  for (const pid of [...new Set(remainingPids)].filter((pid) => pid !== process.pid)) killProcessTree(pid, "SIGKILL");
  await Bun.sleep(100);
  const stillRunning = await portsInUse(uniquePorts);
  const stillLaunchers = workspaceLauncherPids(workspaceRoot, processTable());
  const stillRuntimes = workspaceRuntimePids(workspaceRoot, processTable());
  if (stillRunning.length > 0 || stillLaunchers.length > 0 || stillRuntimes.length > 0) {
    const details = [
      stillRunning.length > 0 ? `port(s): ${stillRunning.join(", ")}` : "",
      stillLaunchers.length > 0 ? `launcher pid(s): ${stillLaunchers.join(", ")}` : "",
      stillRuntimes.length > 0 ? `runtime pid(s): ${stillRuntimes.join(", ")}` : ""
    ].filter(Boolean).join("; ");
    throw new Error(`Existing Aevo process(es) did not stop (${details})`);
  }
}

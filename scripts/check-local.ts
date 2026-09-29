type AppName = "hub" | "admin" | "play" | "pos" | "go";

interface Probe {
  label: string;
  url: string;
  expectedStatus?: number;
  bodyIncludes?: string;
}

const probes: Record<AppName, Probe[]> = {
  hub: [
    { label: "Edge API health", url: "http://localhost:4000/health" },
    { label: "Edge API readiness", url: "http://localhost:4000/ready" },
    { label: "Core API liveness", url: "http://localhost:5099/health/live" },
    { label: "Hub contract metadata", url: "http://localhost:4000/api/v1/hub/contract", bodyIncludes: "aevo-core-api" },
    { label: "Hub web shell", url: "http://localhost:4330/", bodyIncludes: "Aevo Hub" }
  ],
  admin: [
    { label: "Admin edge health", url: "http://localhost:4001/health" },
    { label: "Admin edge readiness", url: "http://localhost:4001/ready" },
    { label: "Admin web shell", url: "http://localhost:4335/", bodyIncludes: "Aevo Admin" }
  ],
  play: [
    { label: "Play API health", url: "http://localhost:3002/health" },
    { label: "Play API readiness", url: "http://localhost:3002/ready" },
    { label: "Play web shell", url: "http://localhost:4331/", bodyIncludes: "Aevo" }
  ],
  pos: [
    { label: "POS API health", url: "http://localhost:3003/health" },
    { label: "POS API readiness", url: "http://localhost:3003/ready" },
    { label: "POS web shell", url: "http://localhost:4332/", bodyIncludes: "Aevo POS" }
  ],
  go: [
    { label: "Go web shell", url: "http://localhost:4324/", bodyIncludes: "Aevocado Go" }
  ]
};

function requestedApps(argumentsList: string[]): AppName[] {
  const requested = argumentsList.filter((value): value is AppName => value === "hub" || value === "admin" || value === "play" || value === "pos" || value === "go");
  if (argumentsList.includes("all") || requested.length === 0) return ["hub", "admin", "play", "pos"];
  return [...new Set(requested)];
}

async function probe(probeTarget: Probe): Promise<void> {
  const startedAt = performance.now();
  try {
    const response = await fetch(probeTarget.url, {
      signal: AbortSignal.timeout(3_000),
      headers: { accept: "application/json,text/html" }
    });
    const expectedStatus = probeTarget.expectedStatus ?? 200;
    if (probeTarget.bodyIncludes) {
      const body = await response.text();
      if (!body.includes(probeTarget.bodyIncludes)) {
        throw new Error(`response did not contain ${probeTarget.bodyIncludes}`);
      }
    }
    const elapsed = Math.round(performance.now() - startedAt);
    if (response.status !== expectedStatus) {
      throw new Error(`HTTP ${response.status}, expected ${expectedStatus}`);
    }
    console.log(`PASS  ${probeTarget.label.padEnd(22)} ${String(elapsed).padStart(4)} ms  ${probeTarget.url}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL  ${probeTarget.label.padEnd(22)} ${probeTarget.url}  ${message}`);
    throw error;
  }
}

const apps = requestedApps(process.argv.slice(2));
const suggestedCommand = apps.length === 4 && apps.includes("hub") && apps.includes("admin")
  ? 'bun run dev:all'
  : apps.length === 2 && apps.includes('play') && apps.includes('pos')
    ? 'bun run dev:play+pos'
    : `bun run dev:${apps.join('+')}`;
let failures = 0;
for (const app of apps) {
  console.log(`\nChecking ${app}...`);
  for (const probeTarget of probes[app]) {
    try {
      await probe(probeTarget);
    } catch {
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} local probe(s) failed. Start the required app with ${suggestedCommand} first.`);
  process.exitCode = 1;
} else {
  console.log("\nAll requested local surfaces are reachable.");
}

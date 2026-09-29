import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "bun";

type Check = {
  label: string;
  directory: string;
  command: string;
  args: string[];
  environment?: Record<string, string>;
};

const root = resolve(import.meta.dir, "..");
const integration = process.argv.includes("--integration");
const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
);

function readEnvironmentValue(file: string, key: string): string | undefined {
  try {
    const line = readFileSync(file, "utf8")
      .split(/\r?\n/u)
      .find((entry) => entry.trimStart().startsWith(`${key}=`));
    return line?.slice(key.length + 1).trim().replace(/^(["'])(.*)\1$/u, "$2");
  } catch {
    return undefined;
  }
}

const coreDatabaseUrl = process.env.AEVO_DATABASE_URL?.trim()
  || readEnvironmentValue(resolve(root, "aevo-core-api/.env"), "AEVO_DATABASE_URL");

const checks: Check[] = [
  {
    label: "Versioned contract artifact sync",
    directory: ".",
    command: "bun",
    args: ["run", "sync:contracts"]
  },
  {
    label: "Contracts check",
    directory: "aevo-contracts",
    command: "bun",
    args: ["run", "check"]
  },
  {
    label: "Core API build",
    directory: "aevo-core-api",
    command: "dotnet",
    args: ["build", "src/Aevo.CoreApi/Aevo.CoreApi.csproj", "--no-restore"]
  },
  {
    label: "Core API migrator build",
    directory: "aevo-core-api",
    command: "dotnet",
    args: ["build", "src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj", "--no-restore"]
  },
  {
    label: "Core API unit and tenant tests",
    directory: "aevo-core-api",
    command: "dotnet",
    args: ["test", "tests/Aevo.CoreApi.Tests/Aevo.CoreApi.Tests.csproj", "--no-restore"]
  },
  {
    label: "Core RLS transaction-context check",
    directory: "aevo-core-api",
    command: "dotnet",
    args: ["run", "--no-build", "--project", "src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj", "--", "--rls-check"],
    environment: coreDatabaseUrl ? { AEVO_DATABASE_URL: coreDatabaseUrl } : undefined
  },
  {
    label: "Core migration dry-run",
    directory: "aevo-core-api",
    command: "dotnet",
    args: ["run", "--no-build", "--project", "src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj", "--", "--dry-run"]
  },
  {
    label: "Core legacy compatibility removal check",
    directory: "aevo-core-api",
    command: "dotnet",
    args: ["run", "--no-build", "--project", "src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj", "--", "--legacy-removal-check"],
    environment: coreDatabaseUrl ? { AEVO_DATABASE_URL: coreDatabaseUrl } : undefined
  },
  {
    label: "Infrastructure ownership check",
    directory: "aevo-infrastructure",
    command: "bun",
    args: ["run", "check"]
  },
  {
    label: "Hub typecheck",
    directory: "aevo-hub",
    command: "bun",
    args: ["run", "typecheck"]
  },
  {
    label: "Hub unit and tenant tests",
    directory: "aevo-hub",
    command: "bun",
    args: ["test", "packages/auth-client", "packages/app-access", "packages/tenant-context", "packages/permissions", "packages/api-contract"]
  },
  {
    label: "Accounts checks",
    directory: "aevo-accounts",
    command: "bun",
    args: ["run", "typecheck"]
  },
  {
    label: "Accounts tests",
    directory: "aevo-accounts",
    command: "bun",
    args: ["test"]
  },
  {
    label: "Edge gateway checks",
    directory: "aevo-edge-gateway",
    command: "bun",
    args: ["run", "typecheck"]
  },
  {
    label: "Edge gateway tests",
    directory: "aevo-edge-gateway",
    command: "bun",
    args: ["test"]
  },
  {
    label: "Admin check",
    directory: "aevo-admin",
    command: "bun",
    args: ["run", "check"]
  },
  {
    label: "Play typecheck",
    directory: "aevo-play",
    command: "bun",
    args: ["run", "typecheck"]
  },
  {
    label: "Play integration and tenant tests",
    directory: "aevo-play",
    command: "bun",
    args: ["test"],
    environment: { AEVO_TEST_MODE: "1" }
  },
  {
    label: "POS typecheck",
    directory: "aevo-pos",
    command: "bun",
    args: ["run", "typecheck"]
  },
  {
    label: "POS integration and tenant tests",
    directory: "aevo-pos",
    command: "bun",
    args: ["test", "packages", "apps"],
    environment: { AEVO_TEST_MODE: "1" }
  },
  {
    label: "Aevo Go typecheck",
    directory: "aevo-go",
    command: "bun",
    args: ["run", "typecheck"]
  },
  {
    label: "Aevo Go tests",
    directory: "aevo-go",
    command: "bun",
    args: ["run", "test", "--", "--run"]
  },
  {
    label: "Background worker checks",
    directory: "aevo-background-worker",
    command: "bun",
    args: ["run", "typecheck"]
  },
  {
    label: "Background worker tests",
    directory: "aevo-background-worker",
    command: "bun",
    args: ["test"]
  },
  {
    label: "Digital Sign independent checks",
    directory: "aevo-digital-sing",
    command: "bun",
    args: ["run", "typecheck"]
  },
  {
    label: "Digital Sign independent tests",
    directory: "aevo-digital-sing",
    command: "bun",
    args: ["run", "test"]
  }
];

if (integration) {
  checks.splice(7, 0, {
    label: "Hub live Core/Edge tenant-security integration",
    directory: "aevo-hub",
    command: "bun",
    args: ["test", "test/security-architecture.test.ts"],
    environment: { EDGE_URL: process.env.EDGE_URL?.trim() || "http://localhost:4000" }
  });
}

async function run(check: Check): Promise<number> {
  console.log(`\n▶ ${check.label}`);
  const child = spawn([check.command, ...check.args], {
    cwd: resolve(root, check.directory),
    env: { ...inheritedEnvironment, ...(check.environment ?? {}) },
    stdout: "inherit",
    stderr: "inherit"
  });
  const exitCode = await child.exited;
  console.log(`◀ ${check.label}: ${exitCode === 0 ? "PASS" : `FAIL (${exitCode})`}`);
  return exitCode;
}

const failures: string[] = [];
for (const check of checks) {
  if ((await run(check)) !== 0) failures.push(check.label);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${checks.length} Aevo application checks passed${integration ? " (including live Hub tenant-security integration)" : ""}.`);
}

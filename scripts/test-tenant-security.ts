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
    label: "Versioned contract boundary",
    directory: "aevo-contracts",
    command: "bun",
    args: ["run", "check"]
  },
  {
    label: "Core app-session and authorization build",
    directory: "aevo-core-api",
    command: "dotnet",
    args: ["build", "src/Aevo.CoreApi/Aevo.CoreApi.csproj", "--no-restore"]
  },
  {
    label: "Core authorization and tenant tests",
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
    label: "Core legacy compatibility removal check",
    directory: "aevo-core-api",
    command: "dotnet",
    args: ["run", "--project", "src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj", "--", "--legacy-removal-check"],
    environment: coreDatabaseUrl ? { AEVO_DATABASE_URL: coreDatabaseUrl } : undefined
  },
  {
    label: "Hub Core/Edge tenant-security integration",
    directory: "aevo-hub",
    command: "bun",
    args: ["test", "test/security-architecture.test.ts"],
    environment: { EDGE_URL: process.env.EDGE_URL?.trim() || "http://localhost:4000" }
  },
  {
    label: "Hub authorization unit tests",
    directory: "aevo-hub",
    command: "bun",
    args: ["test", "packages/auth-client", "packages/app-access", "packages/tenant-context", "packages/permissions", "packages/api-contract"]
  },
  {
    label: "Accounts app-session broker tests",
    directory: "aevo-accounts",
    command: "bun",
    args: ["test"]
  },
  {
    label: "Edge ingress security tests",
    directory: "aevo-edge-gateway",
    command: "bun",
    args: ["test"]
  },
  {
    label: "Admin Core authorization check",
    directory: "aevo-admin",
    command: "bun",
    args: ["run", "check"]
  },
  {
    label: "Play tenant-boundary tests",
    directory: "aevo-play",
    command: "bun",
    args: ["test", "apps/api/src/app.test.ts", "domains/sports/src/venue.test.ts"],
    environment: { AEVO_TEST_MODE: "1" }
  },
  {
    label: "POS tenant-boundary and API tests",
    directory: "aevo-pos",
    command: "bun",
    args: ["test", "packages/db/test/tenant-isolation.test.ts", "apps/api/test/app.test.ts", "apps/api/test/gateway-v1.test.ts"],
    environment: { AEVO_TEST_MODE: "1" }
  },
  {
    label: "Aevo Go customer-boundary tests",
    directory: "aevo-go",
    command: "bun",
    args: ["run", "test", "--", "--run", "src/lib/public-api.test.ts", "src/lib/customer-api.test.ts"]
  },
  {
    label: "Background worker trust-boundary tests",
    directory: "aevo-background-worker",
    command: "bun",
    args: ["test"]
  },
  {
    label: "Digital Sign isolated security suite",
    directory: "aevo-digital-sing",
    command: "bun",
    args: ["run", "test"]
  }
];

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
  console.error(`\n${failures.length} tenant-security check(s) failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${checks.length} tenant-security checks passed.`);
}

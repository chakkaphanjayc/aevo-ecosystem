import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const workspaceRoot = process.cwd();
const inventoryDirectory = join(workspaceRoot, "docs/hub-system/inventory");
const inventoryFiles = [
  "repositories.json",
  "origins.json",
  "routes.json",
  "sessions.json",
  "applications.json",
  "contracts.json",
  "writers.json",
  "tables.json",
  "events.json",
  "infrastructure.json",
  "redundancy.json"
] as const;

interface InventoryEnvelope {
  schema: string;
  inventoryVersion: number;
  batch: string;
  generatedAt: string;
  entries: unknown[];
}

const supportedInventoryBatches = /^(?:BATCH-HUB-\d{3}|HUB-\d{3})$/u;

const secretPatterns: readonly RegExp[] = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /SERVICE_ROLE_KEY/i,
  /sk_live_[A-Za-z0-9]/i,
  /whsec_[A-Za-z0-9]/i,
  /-----BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY-----/i,
  /(?:password|secret|token)\s*=/i
];

const staleReferencePatterns: readonly string[] = [
  "localhost:4321",
  "127.0.0.1:4321",
  "/modern/organize",
  "apps/gateway",
  "\"/workspace\"",
  "\"/setup\""
];

function isInventoryEnvelope(value: unknown): value is InventoryEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.schema === "string"
    && typeof candidate.inventoryVersion === "number"
    && typeof candidate.batch === "string"
    && typeof candidate.generatedAt === "string"
    && Array.isArray(candidate.entries);
}

function runReferenceScan(pattern: string, repository: string): string[] {
  try {
    const output = execFileSync(
      "rg",
      [
        "-n",
        "--hidden",
        "--no-heading",
        "--color",
        "never",
        "-g",
        "!.git",
        "-g",
        "!node_modules",
        "-g",
        "!test",
        "-g",
        "!tests",
        "-g",
        "!dist",
        "-g",
        "!build",
        "-g",
        "!.env",
        "-g",
        "!.env.*",
        "-F",
        pattern,
        repository
      ],
      { cwd: workspaceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return output.trim().length === 0 ? [] : output.trim().split("\n");
  } catch (error) {
    const exitCode = typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: number }).status
      : undefined;
    if (exitCode === 1) return [];
    throw error;
  }
}

let failures = 0;
console.log("Hub baseline check (report-only for stale references)");
console.log(`Batch: BATCH-HUB-000`);

for (const fileName of inventoryFiles) {
  const filePath = join(inventoryDirectory, fileName);
  if (!existsSync(filePath)) {
    console.error(`FAIL  missing inventory: ${fileName}`);
    failures += 1;
    continue;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL  invalid JSON: ${fileName} (${message})`);
    failures += 1;
    continue;
  }

  if (!isInventoryEnvelope(parsed)) {
    console.error(`FAIL  invalid inventory envelope: ${fileName}`);
    failures += 1;
    continue;
  }

  if (parsed.inventoryVersion < 1 || !supportedInventoryBatches.test(parsed.batch)) {
    console.error(`FAIL  unsupported inventory metadata: ${fileName} (version=${parsed.inventoryVersion}, batch=${parsed.batch})`);
    failures += 1;
  } else if (parsed.inventoryVersion !== 1 || parsed.batch !== "BATCH-HUB-000") {
    console.log(`INFO  ${fileName.padEnd(22)} revision=${parsed.batch}`);
  }

  const raw = readFileSync(filePath, "utf8");
  const matchedSecretPattern = secretPatterns.find((pattern) => pattern.test(raw));
  if (matchedSecretPattern) {
    console.error(`FAIL  possible secret pattern in inventory: ${fileName}`);
    failures += 1;
  }

  console.log(`PASS  ${fileName.padEnd(22)} entries=${String(parsed.entries.length).padStart(3)}`);
}

const scannedRepositories = [
  "aevo-hub",
  "aevo-core-api",
  "aevo-edge-gateway",
  "aevo-accounts",
  "aevo-admin",
  "aevo-contracts",
  "aevo-background-worker",
  "aevo-infrastructure"
] as const;

console.log("\nReport-only stale reference scan (not a failure in HUB-000):");
for (const pattern of staleReferencePatterns) {
  const matches = scannedRepositories.flatMap((repository) => runReferenceScan(pattern, repository));
  if (matches.length === 0) {
    console.log(`INFO  ${pattern}: no matches`);
    continue;
  }
  console.warn(`WARN  ${pattern}: ${matches.length} match(es)`);
  for (const match of matches.slice(0, 8)) console.warn(`      ${match}`);
  if (matches.length > 8) console.warn(`      ... ${matches.length - 8} more`);
}

if (failures > 0) {
  console.error(`\n${failures} baseline check failure(s).`);
  process.exitCode = 1;
} else {
  console.log("\nBaseline inventories are valid. Stale references above are report-only evidence for a later batch.");
}

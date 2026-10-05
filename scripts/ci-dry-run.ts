import { resolve } from "node:path";
import { spawn } from "bun";

type PipelineStep = {
  service: string;
  stage: "CI Verification" | "Artifact Build" | "Deploy Preparation";
  directory: string;
  command: string;
  args: string[];
};

const root = resolve(import.meta.dir, "..");

const steps: PipelineStep[] = [
  // Core API
  { service: "aevo-core-api", stage: "CI Verification", directory: "aevo-core-api", command: "dotnet", args: ["test", "tests/Aevo.CoreApi.Tests/Aevo.CoreApi.Tests.csproj", "--no-restore"] },
  { service: "aevo-core-api", stage: "Artifact Build", directory: "aevo-core-api", command: "dotnet", args: ["build", "src/Aevo.CoreApi/Aevo.CoreApi.csproj", "--configuration", "Release"] },
  
  // Contracts
  { service: "aevo-contracts", stage: "CI Verification", directory: "aevo-contracts", command: "bun", args: ["run", "check"] },
  { service: "aevo-contracts", stage: "Artifact Build", directory: "aevo-contracts", command: "bun", args: ["run", "build"] },

  // Edge Gateway
  { service: "aevo-edge-gateway", stage: "CI Verification", directory: "aevo-edge-gateway", command: "bun", args: ["test"] },
  { service: "aevo-edge-gateway", stage: "Artifact Build", directory: "aevo-edge-gateway", command: "bun", args: ["run", "build"] },

  // Accounts
  { service: "aevo-accounts", stage: "CI Verification", directory: "aevo-accounts", command: "bun", args: ["test"] },
  { service: "aevo-accounts", stage: "Artifact Build", directory: "aevo-accounts", command: "bun", args: ["run", "build"] },

  // Hub
  { service: "aevo-hub", stage: "CI Verification", directory: "aevo-hub", command: "bun", args: ["run", "typecheck"] },
  { service: "aevo-hub", stage: "Artifact Build", directory: "aevo-hub", command: "bun", args: ["run", "build:modern"] },

  // Admin
  { service: "aevo-admin", stage: "CI Verification", directory: "aevo-admin", command: "bun", args: ["run", "typecheck"] },
  { service: "aevo-admin", stage: "Artifact Build", directory: "aevo-admin", command: "bun", args: ["run", "build"] },

  // Go (Customer App)
  { service: "aevo-go", stage: "CI Verification", directory: "aevo-go", command: "bun", args: ["run", "typecheck"] },
  { service: "aevo-go", stage: "Artifact Build", directory: "aevo-go", command: "bun", args: ["run", "build"] },

  // Play
  { service: "aevo-play", stage: "CI Verification", directory: "aevo-play", command: "bun", args: ["run", "typecheck"] },
  { service: "aevo-play", stage: "Artifact Build", directory: "aevo-play", command: "bun", args: ["run", "build"] },

  // POS
  { service: "aevo-pos", stage: "CI Verification", directory: "aevo-pos", command: "bun", args: ["run", "typecheck"] },
  { service: "aevo-pos", stage: "Artifact Build", directory: "aevo-pos", command: "bun", args: ["run", "build"] },

  // Background Worker
  { service: "aevo-background-worker", stage: "CI Verification", directory: "aevo-background-worker", command: "bun", args: ["test"] },
  { service: "aevo-background-worker", stage: "Artifact Build", directory: "aevo-background-worker", command: "bun", args: ["run", "build"] },

  // Infrastructure
  { service: "aevo-infrastructure", stage: "CI Verification", directory: "aevo-infrastructure", command: "bun", args: ["run", "check"] }
];

async function runStep(step: PipelineStep): Promise<boolean> {
  const label = `[${step.service}] ${step.stage} (${step.command} ${step.args.join(" ")})`;
  process.stdout.write(`\n▶ ${label}... `);
  const child = spawn([step.command, ...step.args], {
    cwd: resolve(root, step.directory),
    stdout: "ignore",
    stderr: "pipe"
  });

  const exitCode = await child.exited;
  if (exitCode === 0) {
    console.log("✅ PASS");
    return true;
  } else {
    console.log(`❌ FAIL (exit ${exitCode})`);
    const stderr = await new Response(child.stderr).text();
    console.error(stderr.slice(0, 1000));
    return false;
  }
}

console.log("=================================================");
console.log("   Aevo Ecosystem CI/CD Dry-Run Pipeline Check   ");
console.log("=================================================");

let failed = 0;
for (const step of steps) {
  const ok = await runStep(step);
  if (!ok) failed++;
}

console.log("\n=================================================");
if (failed === 0) {
  console.log(`🎉 ALL ${steps.length} CI/CD PIPELINE STEPS PASSED SUCCESSFULLY!`);
  console.log("All submodules are fully prepared for CI/CD test and deployment.");
} else {
  console.error(`⚠️ ${failed} step(s) failed during CI/CD dry-run.`);
  process.exitCode = 1;
}
console.log("=================================================\n");

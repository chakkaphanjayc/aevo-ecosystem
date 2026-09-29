import { resolve } from "node:path";
import { spawn } from "bun";

type SyncStep = {
  label: string;
  directory: string;
  args: string[];
};

const ecosystemRoot = resolve(import.meta.dir, "..");
const steps: SyncStep[] = [
  {
    label: "Synchronize Hub OpenAPI artifact",
    directory: "aevo-contracts",
    args: ["run", "sync:openapi"]
  },
  {
    label: "Build versioned contracts",
    directory: "aevo-contracts",
    args: ["run", "build"]
  },
  {
    label: "Refresh Hub contract dependency",
    directory: "aevo-hub",
    args: ["install", "--force", "--offline"]
  },
  {
    label: "Refresh Admin contract dependency",
    directory: "aevo-admin",
    args: ["install", "--force", "--offline"]
  }
];

for (const step of steps) {
  console.log(`\n▶ ${step.label}`);
  const child = spawn(["bun", ...step.args], {
    cwd: resolve(ecosystemRoot, step.directory),
    stdout: "inherit",
    stderr: "inherit"
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    console.error(`◀ ${step.label}: FAIL (${exitCode})`);
    process.exitCode = exitCode;
    process.exit();
  }
  console.log(`◀ ${step.label}: PASS`);
}

console.log("\nVersioned contracts are built and linked into Hub/Admin local installs.");

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts/supply-chain/Invoke-ContainerTechnicalSmoke.ps1");
if (!fs.existsSync(scriptPath)) throw new Error("Container technical smoke runner is missing.");
const source = fs.readFileSync(scriptPath, "utf8");
for (const [name, expected] of [
  ["Contract validation is mandatory", "CONTAINER_SMOKE_CONTRACT_INVALID"],
  ["Image presence is mandatory", "CONTAINER_SMOKE_IMAGE_MISSING"],
  ["Loopback-only publishing is mandatory", "127.0.0.1:$hostPort`:8080"],
  ["Read-only root filesystem is mandatory", "'--read-only'"],
  ["Tmpfs is mandatory", "'--tmpfs'"],
  ["Capability drop is mandatory", "'--cap-drop','ALL'"],
  ["No-new-privileges is mandatory", "'no-new-privileges'"],
  ["PIDs limit is mandatory", "'--pids-limit'"],
  ["Technical profile is mandatory", "SPRING_PROFILES_ACTIVE"],
  ["Readiness timeout fails closed", "CONTAINER_SMOKE_READINESS_TIMEOUT"],
  ["Hardening drift fails closed", "CONTAINER_SMOKE_HARDENING_DRIFT"],
  ["Explicit Docker executable is mandatory", "$script:dockerExe"],
  ["Cleanup is mandatory", "rm --force $name"],
  ["Smoke phases are classified", "$smokePhase = 'startup'"],
  ["Unknown smoke failures are sanitized", "CONTAINER_SMOKE_UNCLASSIFIED_FAILED"],
]) {
  if (!source.includes(expected)) throw new Error(`${name}: missing ${expected}`);
  process.stdout.write(`[PASS] ${name}\n`);
}
process.stdout.write("Container technical smoke contract tests: PASS\n");

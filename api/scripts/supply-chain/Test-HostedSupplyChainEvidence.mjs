import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { allowedFiles, validateEvidenceRoot } from "./Validate-HostedSupplyChainEvidence.mjs";

const commit = "0123456789abcdef0123456789abcdef01234567";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "apx-hosted-evidence-"));
const summary = { schemaVersion: 1, workflow: "supply-chain", commit, executionState: "PASS", policyState: "BLOCKED", reviewState: "NOT_REQUIRED", deltaState: "NOT_APPLICABLE", failureCode: "NONE" };
const sanitizedFinding = {
  scanner: "trivy", findingId: "CVE-2026-0001", source: "ghsa", targetType: "sbom",
  target: "services/identity-profile-service/target/bom.json", "package/component": "example:component",
  affectedVersion: "1.0.0", fixedVersion: null, severity: "HIGH", severitySource: "ghsa",
  status: "observed", dispositionId: null
};
try {
  for (const file of allowedFiles) {
    const value = file === "run-summary.json"
      ? summary
      : ["vulnerability-inventory.json", "gitleaks-inventory.json", "container-vulnerability-inventory.json"].includes(file)
        ? { schemaVersion: 1, commit, findings: [] }
        : { schemaVersion: 1, commit };
    fs.writeFileSync(path.join(root, file), JSON.stringify(value));
  }
  validateEvidenceRoot(root, commit);
  process.stdout.write("[PASS] Exact sanitized evidence allowlist accepted\n");
  fs.writeFileSync(path.join(root, "raw.json"), "{}");
  let rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_UNEXPECTED_EVIDENCE_ACCEPTED");
  fs.unlinkSync(path.join(root, "raw.json"));
  const inventory = path.join(root, "vulnerability-inventory.json");
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit, Description: "raw scanner text" }));
  rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_RAW_FIELD_ACCEPTED");
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit: "abcdefabcdefabcdefabcdefabcdefabcdefabcd" }));
  rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_COMMIT_MISMATCH_ACCEPTED");
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit, path: "C:\\Users\\admin\\secret.txt" }));
  rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_ABSOLUTE_PATH_ACCEPTED");
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit, findings: [sanitizedFinding] }));
  validateEvidenceRoot(root, commit);
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit, findings: [{ ...sanitizedFinding, unexpected: "scanner-private" }] }));
  rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_UNEXPECTED_FINDING_FIELD_ACCEPTED");
  process.stdout.write("[PASS] Unexpected files, raw scanner fields, commit mismatch, and absolute paths rejected\n");
  process.stdout.write("[PASS] Only the approved twelve vulnerability finding fields are accepted\n");
} finally { fs.rmSync(root, { recursive: true, force: true }); }

process.stdout.write("Hosted supply-chain evidence tests: PASS\n");

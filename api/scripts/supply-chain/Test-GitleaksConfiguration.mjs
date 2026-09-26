import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const configPath = path.join(repoRoot, "security/tooling/gitleaks.toml");
const ignorePath = path.join(repoRoot, "security/tooling/gitleaks-empty-ignore.txt");

function assert(condition, message) {
  if (!condition) throw new Error(message);
  process.stdout.write("[PASS] " + message + "\n");
}

if (!fs.existsSync(configPath)) throw new Error("Gitleaks configuration is missing.");
if (!fs.existsSync(ignorePath)) throw new Error("Canonical empty Gitleaks ignore file is missing.");

const config = fs.readFileSync(configPath, "utf8");
const ignore = fs.readFileSync(ignorePath, "utf8");

assert(/^title\s*=\s*"Auction Pro Max API Gitleaks configuration"\s*$/m.test(config), "Configuration title is pinned");
assert(/^\[extend\]\s*$/m.test(config) && /^useDefault\s*=\s*true\s*$/m.test(config), "Built-in Gitleaks rules are extended");
assert(/^id\s*=\s*"apx-controlled-secret-fixture"\s*$/m.test(config), "Controlled fixture rule is present");
assert(/^regex\s*=\s*'''APX_FIXTURE_SECRET_\[A-Z0-9_\]\{24,\}'''\s*$/m.test(config), "Controlled fixture regex is constrained");
assert(/^keywords\s*=\s*\["APX_FIXTURE_SECRET_"\]\s*$/m.test(config), "Controlled fixture keyword prefilter is pinned");
assert(!/disabledRules\s*=|\[\[?allowlists?\]?\]/.test(config), "Scanner-side rule disabling and allowlists are absent");
assert(!/APX_FIXTURE_SECRET_[A-Z0-9_]{24,}/.test(config), "Configuration contains no raw fixture value");
assert(ignore.split(/\r?\n/).every((line) => line.trim() === "" || line.trim().startsWith("#")), "Scanner-side ignore file contains comments only");

process.stdout.write("Gitleaks configuration contract tests: PASS\n");

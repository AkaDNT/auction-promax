import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const validSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^0{40}$/.test(value);
const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readServiceCatalog() {
  try {
    const registry = JSON.parse(fs.readFileSync(path.join(moduleRoot, "api/service-foundation/services.json"), "utf8"));
    if (!registry || Array.isArray(registry) || Object.keys(registry).sort().join("|") !== "schemaVersion|services"
      || registry.schemaVersion !== 1 || !Array.isArray(registry.services) || registry.services.length !== 5) {
      throw new Error("invalid registry shape");
    }
    const variants = new Map();
    for (const record of registry.services) {
      if (!record || typeof record !== "object" || Array.isArray(record)
        || typeof record.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(record.id)
        || !["relational", "gateway"].includes(record.variant) || variants.has(record.id)) {
        throw new Error("invalid registry record");
      }
      variants.set(record.id, record.variant);
    }
    return { ids: [...variants.keys()].sort(), variants };
  } catch {
    throw new Error("SERVICE_REGISTRY_INVALID");
  }
}

const serviceCatalog = readServiceCatalog();
const serviceIds = serviceCatalog.ids;
const serviceVariants = serviceCatalog.variants;
const all = (diagnostic = "CLASSIFICATION_UNTRUSTED_DIFF") => withServiceSelection(
  { api: true, web: true, contracts: true, shared: true }, [], diagnostic,
);

function withServiceSelection(components, paths, diagnostic) {
  let selected = new Set();
  let removed = new Set();
  if (paths.length === 0) selected = new Set(serviceIds);
  for (const name of paths) {
    if (typeof name !== "string" || !name || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) {
      selected = new Set(serviceIds);
      break;
    }
    if (/^api\/services\/[^/]+(?:\/|$)/.test(name)) {
      const [, id] = name.match(/^api\/services\/([^/]+)(?:\/|$)/) ?? [];
      if (!serviceVariants.has(id)) { selected = new Set(serviceIds); break; }
      selected.add(id);
    } else if (name.startsWith("api/service-foundation/") || name.startsWith("api/scripts/foundation/")
      || name.startsWith("api/scripts/supply-chain/") || name.startsWith("api/security/")
      || name.startsWith(".github/") || name.startsWith("scripts/migration/")) {
      selected = new Set(serviceIds);
    } else if (name.startsWith("docs/") || name.startsWith("api/docs/") || name.startsWith("web/docs/")
      || name.startsWith("web/") || name.startsWith("api/infra/") || name.startsWith("api/contracts/")) {
      // These paths have repository/component checks but no service artifact of their own.
    } else if (name.startsWith("api/")) {
      selected = new Set(serviceIds);
    } else {
      selected = new Set(serviceIds);
    }
  }
  const result = { ...components };
  Object.defineProperties(result, {
    services: { value: [...selected].sort(), enumerable: false },
    removedServiceIds: { value: [...removed].sort(), enumerable: false, configurable: true },
    ...(diagnostic ? { diagnostic: { value: diagnostic, enumerable: false } } : {}),
  });
  return result;
}

export function classifyChangedPaths(paths) {
  const result = { api: false, web: false, contracts: false, shared: false };
  if (!Array.isArray(paths) || paths.length === 0) return all("CLASSIFICATION_EMPTY_OR_INVALID_DIFF");
  for (const name of paths) {
    if (typeof name !== "string" || !name || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) return all("CLASSIFICATION_INVALID_PATH");
    if (name.startsWith("api/contracts/")) {
      result.api = result.web = result.contracts = true;
    } else if (name.startsWith("api/docs/") || name.startsWith("web/docs/") || name.startsWith("docs/")) {
      // Project documentation does not require component builds.
    } else if (name.startsWith("api/")) {
      result.api = true;
    } else if (name.startsWith("web/")) {
      result.web = true;
    } else {
      result.api = result.web = result.shared = true;
    }
  }
  const unknownTarget = paths.some((name) => /^api\/services\/[^/]+(?:\/|$)/.test(name)
    && !serviceVariants.has(name.match(/^api\/services\/([^/]+)(?:\/|$)/)?.[1]));
  return unknownTarget ? all("CLASSIFICATION_UNKNOWN_SERVICE_PATH") : withServiceSelection(result, paths);
}

function classifyNameStatus(records) {
  const classification = classifyChangedPaths(records.flatMap(({ paths }) => paths));
  const removedServiceIds = [...new Set(records
    .filter(({ status }) => status === "D")
    .flatMap(({ paths }) => paths)
    .map((name) => name.match(/^api\/services\/([^/]+)(?:\/|$)/)?.[1])
    .filter((id) => serviceVariants.has(id)))].sort();
  Object.defineProperty(classification, "removedServiceIds", { value: removedServiceIds, enumerable: false, configurable: true });
  return classification;
}

export function parseNameStatusRecords(bytes) {
  const parts = bytes.toString("utf8").split("\0");
  if (parts.pop() !== "" || parts.length === 0) throw new Error("DIFF_STATUS_INVALID");
  const records = [];
  for (let index = 0; index < parts.length;) {
    const status = parts[index++];
    if (!/^(?:[AMDT]|R[0-9]{1,3}|C[0-9]{1,3})$/.test(status)) throw new Error("DIFF_STATUS_INVALID");
    const count = /^[RC]/.test(status) ? 2 : 1;
    const names = parts.slice(index, index + count);
    if (names.length !== count || names.some((name) => !name)) throw new Error("DIFF_PATH_INVALID");
    index += count;
    records.push({ status, paths: names });
  }
  return records;
}

export function validateServiceMatrixResults({ selectedServiceIds, commit, results }) {
  if (!validSha(commit) || !Array.isArray(selectedServiceIds) || !Array.isArray(results)) throw new Error("SERVICE_MATRIX_INPUT_INVALID");
  const selected = new Set();
  for (const id of selectedServiceIds) {
    if (!serviceVariants.has(id)) throw new Error("SERVICE_MATRIX_SELECTION_INVALID");
    if (selected.has(id)) throw new Error("SERVICE_MATRIX_SELECTION_DUPLICATE");
    selected.add(id);
  }
  const seen = new Set();
  for (const result of results) {
    if (!result || typeof result !== "object" || Array.isArray(result)
      || Object.keys(result).sort().join("|") !== ["commit", "result", "schemaVersion", "serviceId", "variant"].sort().join("|")) {
      throw new Error("SERVICE_MATRIX_RESULT_INVALID");
    }
    if (!serviceVariants.has(result.serviceId)) throw new Error("SERVICE_MATRIX_RESULT_UNKNOWN");
    if (!selected.has(result.serviceId)) throw new Error("SERVICE_MATRIX_RESULT_EXTRA");
    if (seen.has(result.serviceId)) throw new Error("SERVICE_MATRIX_RESULT_DUPLICATE");
    seen.add(result.serviceId);
    if (result.schemaVersion !== 1 || result.variant !== serviceVariants.get(result.serviceId)) throw new Error("SERVICE_MATRIX_RESULT_INVALID");
    if (result.commit !== commit) throw new Error("SERVICE_MATRIX_REVISION_MISMATCH");
    if (result.result !== "success") throw new Error("SERVICE_MATRIX_RESULT_FAILED");
  }
  if (seen.size !== selected.size || [...selected].some((id) => !seen.has(id))) throw new Error("SERVICE_MATRIX_RESULT_MISSING");
  return { serviceIds: [...selected].sort(), commit };
}

export function parseNameStatus(bytes) {
  return parseNameStatusRecords(bytes).flatMap(({ paths }) => paths);
}

export function selectDiff(eventName, event, githubSha, git) {
  try {
    if (!validSha(githubSha)) return all("CLASSIFICATION_INVALID_EXECUTION_SHA");
    let base;
    let head;
    if (eventName === "pull_request") {
      base = event?.pull_request?.base?.sha;
      head = event?.pull_request?.head?.sha;
      if (!validSha(base) || !validSha(head)) return all("CLASSIFICATION_INVALID_PR_DIFF");
      const mergeBase = git("merge-base", base, head);
      if (!validSha(mergeBase)) return all("CLASSIFICATION_INVALID_MERGE_BASE");
      base = mergeBase;
    } else if (eventName === "push") {
      base = event?.before;
      head = event?.after;
      if (!validSha(base) || !validSha(head) || head !== githubSha) return all("CLASSIFICATION_INVALID_PUSH_DIFF");
    } else {
      return all("CLASSIFICATION_UNSUPPORTED_EVENT");
    }
    return classifyNameStatus(parseNameStatusRecords(git("diff", base, head)));
  } catch {
    return all("CLASSIFICATION_DIFF_READ_FAILED");
  }
}

export function evaluateAggregate({ classify, apiRequired, webRequired, apiResult, webResult, lifecycleResult }) {
  if (classify !== "success" || lifecycleResult !== "success") return false;
  for (const [required, actual] of [[apiRequired, apiResult], [webRequired, webResult]]) {
    if (required !== "true" && required !== "false") return false;
    if (actual !== (required === "true" ? "success" : "skipped")) return false;
  }
  return true;
}

function runGit(kind, base, head) {
  const args = kind === "merge-base" ? ["merge-base", base, head] : ["diff", "--name-status", "-z", "-M", base, head, "--"];
  const result = spawnSync("git", args, { encoding: kind === "merge-base" ? "utf8" : "buffer", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error("GIT_DIFF_UNAVAILABLE");
  return kind === "merge-base" ? result.stdout.trim() : result.stdout;
}

function main() {
  if (process.argv[2] !== "--classify") throw new Error("USAGE: --classify");
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const result = selectDiff(process.env.GITHUB_EVENT_NAME, event, process.env.GITHUB_SHA, runGit);
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT_UNAVAILABLE");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, [
    ...Object.entries(result).map(([key, value]) => `${key}=${value}`),
    `services=${JSON.stringify(result.services)}`,
    `removedServices=${JSON.stringify(result.removedServiceIds)}`,
    ...(result.diagnostic ? [`classificationDiagnostic=${result.diagnostic}`] : []),
    "",
  ].join("\n"));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();

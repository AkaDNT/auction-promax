import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const all = () => ({ api: true, web: true, contracts: true, shared: true });
const validSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^0{40}$/.test(value);

export function classifyChangedPaths(paths) {
  const result = { api: false, web: false, contracts: false, shared: false };
  if (paths.length === 0) return all();
  for (const name of paths) {
    if (typeof name !== "string" || !name || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) return all();
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
  return result;
}

export function parseNameStatus(bytes) {
  const parts = bytes.toString("utf8").split("\0");
  if (parts.pop() !== "" || parts.length === 0) throw new Error("DIFF_STATUS_INVALID");
  const paths = [];
  for (let index = 0; index < parts.length;) {
    const status = parts[index++];
    if (!/^(?:[AMDT]|R[0-9]{1,3}|C[0-9]{1,3})$/.test(status)) throw new Error("DIFF_STATUS_INVALID");
    const count = /^[RC]/.test(status) ? 2 : 1;
    for (let offset = 0; offset < count; offset++) {
      const name = parts[index++];
      if (!name) throw new Error("DIFF_PATH_INVALID");
      paths.push(name);
    }
  }
  return paths;
}

export function selectDiff(eventName, event, githubSha, git) {
  try {
    if (!validSha(githubSha)) return all();
    let base;
    let head;
    if (eventName === "pull_request") {
      base = event?.pull_request?.base?.sha;
      head = event?.pull_request?.head?.sha;
      if (!validSha(base) || !validSha(head)) return all();
      const mergeBase = git("merge-base", base, head);
      if (!validSha(mergeBase)) return all();
      base = mergeBase;
    } else if (eventName === "push") {
      base = event?.before;
      head = event?.after;
      if (!validSha(base) || !validSha(head) || head !== githubSha) return all();
    } else {
      return all();
    }
    return classifyChangedPaths(parseNameStatus(git("diff", base, head)));
  } catch {
    return all();
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
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(result).map(([key, value]) => `${key}=${value}\n`).join(""));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();

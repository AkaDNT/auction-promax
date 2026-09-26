import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const restrictedFieldNames = new Set([
  "email", "phone", "address", "password", "token", "refreshtoken",
  "accesstoken", "secret", "apikey", "authorization", "cookie",
  "connectionstring", "displayname", "firstname", "lastname",
]);

function violation(code, path, message) {
  return { code, path, message };
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareNode(baseline, candidate, path, violations) {
  if (!baseline || typeof baseline !== "object") return;
  if (!candidate || typeof candidate !== "object") {
    violations.push(violation("PROPERTY_REMOVED", path, "Schema node was removed."));
    return;
  }

  if ("type" in baseline && (!("type" in candidate) || !valuesEqual(baseline.type, candidate.type))) {
    violations.push(violation("PROPERTY_TYPE_CHANGED", path, "Existing property type changed."));
  }
  if ("const" in baseline && (!("const" in candidate) || !valuesEqual(baseline.const, candidate.const))) {
    violations.push(violation("CONST_CHANGED", path, "Existing const changed."));
  }
  if (Array.isArray(baseline.enum)) {
    const candidateEnum = Array.isArray(candidate.enum) ? candidate.enum : [];
    if (baseline.enum.some((value) => !candidateEnum.some((next) => valuesEqual(value, next)))) {
      violations.push(violation("ENUM_NARROWED", path, "Candidate removed an existing enum value."));
    }
  }

  for (const [keyword, code, comparator] of [
    ["minimum", "MINIMUM_TIGHTENED", (oldValue, newValue) => newValue > oldValue],
    ["maximum", "MAXIMUM_TIGHTENED", (oldValue, newValue) => newValue < oldValue],
    ["minLength", "MIN_LENGTH_TIGHTENED", (oldValue, newValue) => newValue > oldValue],
    ["maxLength", "MAX_LENGTH_TIGHTENED", (oldValue, newValue) => newValue < oldValue],
  ]) {
    if (keyword in baseline && (!(keyword in candidate) || comparator(baseline[keyword], candidate[keyword]))) {
      violations.push(violation(code, path, `Candidate tightened ${keyword}.`));
    }
  }

  if ("pattern" in baseline && baseline.pattern !== candidate.pattern) {
    violations.push(violation("PATTERN_CHANGED", path, "Existing pattern changed or was removed."));
  }
  if (baseline.additionalProperties !== false && candidate.additionalProperties === false) {
    violations.push(violation("ADDITIONAL_PROPERTIES_RESTRICTED", path, "Candidate disallows properties previously accepted."));
  }

  const baselineRequired = new Set(baseline.required ?? []);
  const candidateRequired = new Set(candidate.required ?? []);
  for (const key of baselineRequired) {
    if (!candidateRequired.has(key)) violations.push(violation("REQUIRED_PROPERTY_REMOVED", `${path}.${key}`, "Candidate made an existing required field optional."));
  }
  for (const key of candidateRequired) {
    if (!baselineRequired.has(key)) violations.push(violation("REQUIRED_PROPERTY_ADDED", `${path}.${key}`, "Candidate added a required field."));
  }

  for (const [property, baselineProperty] of Object.entries(baseline.properties ?? {})) {
    if (!(property in (candidate.properties ?? {}))) {
      violations.push(violation("PROPERTY_REMOVED", `${path}.${property}`, "Candidate removed an existing property."));
    } else {
      compareNode(baselineProperty, candidate.properties[property], `${path}.${property}`, violations);
    }
  }
}

export function compareSchemaCompatibility(baseline, candidate) {
  const violations = [];
  compareNode(baseline, candidate, "$", violations);
  return { compatible: violations.length === 0, violations };
}

export function validateRegistryPath(path) {
  const normalized = path.replaceAll("\\", "/");
  const patterns = [
    /^openapi\/[^/]+\/v\d+\/[^/]+\.openapi\.ya?ml$/,
    /^events\/[^/]+\/v\d+\/[^/]+\.event\.schema\.json$/,
    /^realtime\/v\d+\/[^/]+\.schema\.json$/,
    /^compatibility\/baseline\/openapi\/[^/]+\/v\d+\/[^/]+\.openapi\.ya?ml$/,
    /^compatibility\/baseline\/events\/[^/]+\/v\d+\/[^/]+\.event\.schema\.json$/,
    /^compatibility\/baseline\/realtime\/v\d+\/[^/]+\.schema\.json$/,
    /^fixtures\/malformed\/[^/]+\.json$/,
    /^fixtures\/prohibited-breaking-change\/openapi\/[^/]+\.ya?ml$/,
  ];
  return { valid: patterns.some((pattern) => pattern.test(normalized)) };
}

function inspectValue(value, path, violations) {
  if (Array.isArray(value)) return value.forEach((entry, index) => inspectValue(entry, `${path}[${index}]`, violations));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (restrictedFieldNames.has(key.toLowerCase())) {
      violations.push(violation("PROHIBITED_PII_FIELD", `${path}.${key}`, "Restricted field is not permitted in a contract example."));
    }
    inspectValue(child, `${path}.${key}`, violations);
  }
}

export function inspectExamplesForRestrictedData(examples) {
  const violations = [];
  inspectValue(examples, "$examples", violations);
  return { safe: violations.length === 0, violations };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function verifyRegistryGovernance(contractsRoot) {
  const definitions = [
    {
      current: "events/identity-profile-service/v1/identity-profile-sample-recorded.event.schema.json",
      baseline: "compatibility/baseline/events/identity-profile-service/v1/identity-profile-sample-recorded.event.schema.json",
    },
    {
      current: "realtime/v1/realtime-message.placeholder.schema.json",
      baseline: "compatibility/baseline/realtime/v1/realtime-message.placeholder.schema.json",
    },
  ];
  const violations = [];
  for (const definition of definitions) {
    for (const relativePath of [definition.current, definition.baseline]) {
      if (!validateRegistryPath(relativePath).valid) violations.push(violation("INVALID_REGISTRY_PATH", relativePath, "Path does not match registry ownership policy."));
    }
    const current = await readJson(resolve(contractsRoot, definition.current));
    const baseline = await readJson(resolve(contractsRoot, definition.baseline));
    violations.push(...compareSchemaCompatibility(baseline, current).violations);
    violations.push(...inspectExamplesForRestrictedData(current.examples ?? []).violations);
  }
  return { valid: violations.length === 0, violations };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname.replace(/^\//, process.platform === "win32" ? "" : "/")) {
  const registry = await verifyRegistryGovernance(resolve(import.meta.dirname, ".."));
  for (const item of registry.violations) console.error(`[${item.code}] ${item.path}: ${item.message}`);
  if (!registry.valid) process.exitCode = 1;
}

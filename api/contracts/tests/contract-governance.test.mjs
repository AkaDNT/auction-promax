import assert from "node:assert/strict";
import { resolve } from "node:path";
import {
  compareSchemaCompatibility,
  inspectExamplesForRestrictedData,
  validateRegistryPath,
  verifyRegistryGovernance,
} from "../scripts/verify-contract-governance.mjs";

const baseline = { type: "object", required: ["eventId"], properties: { eventId: { type: "string" }, traceparent: { type: "string" } } };
const candidate = { type: "object", required: ["eventId", "traceparent"], properties: { eventId: { type: "string" }, traceparent: { type: "string" } } };
const comparison = compareSchemaCompatibility(baseline, candidate);
assert.equal(comparison.compatible, false);
assert.ok(comparison.violations.some(({ code }) => code === "REQUIRED_PROPERTY_ADDED"));
assert.equal(validateRegistryPath("events/identity-profile-service/v1/identity-profile-sample-recorded.event.schema.json").valid, true);
assert.equal(validateRegistryPath("events/v1/identity-profile-sample-recorded.event.schema.json").valid, false);
const security = inspectExamplesForRestrictedData([{ purpose: "PHASE_0_BASELINE", email: "redacted" }]);
assert.equal(security.safe, false);
assert.ok(security.violations.some(({ code }) => code === "PROHIBITED_PII_FIELD"));
const registry = await verifyRegistryGovernance(resolve(import.meta.dirname, ".."));
assert.equal(registry.valid, true, JSON.stringify(registry.violations));
console.log("PASS: governance fixtures were rejected and registry governance passed.");

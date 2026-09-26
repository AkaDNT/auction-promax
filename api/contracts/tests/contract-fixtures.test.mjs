import assert from "node:assert/strict";
import { resolve } from "node:path";
import { validateSchemaFile } from "../scripts/validate-json-schemas.mjs";

const malformedFixture = resolve(
  import.meta.dirname,
  "..",
  "fixtures",
  "malformed",
  "identity-profile-sample-recorded.invalid.schema.json",
);

const result = await validateSchemaFile(malformedFixture);

assert.equal(result.valid, false, "Malformed schema fixture must be rejected.");
assert.equal(
  result.code,
  "MALFORMED_SCHEMA",
  "Malformed schema rejection must use stable code MALFORMED_SCHEMA.",
);

console.log("PASS: malformed schema fixture was rejected.");

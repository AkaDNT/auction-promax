import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

function createAjv() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: true,
  });

  addFormats(ajv);
  return ajv;
}

function serializeErrors(errors) {
  return (errors ?? []).map((error) => ({
    instancePath: error.instancePath,
    keyword: error.keyword,
    message: error.message,
    params: error.params,
  }));
}

export async function validateSchemaFile(schemaPath) {
  let rawSchema;

  try {
    rawSchema = await readFile(schemaPath, "utf8");
  } catch (error) {
    return {
      valid: false,
      code: "SCHEMA_FILE_UNREADABLE",
      errors: [{ message: error.message }],
    };
  }

  let schema;

  try {
    schema = JSON.parse(rawSchema);
  } catch (error) {
    return {
      valid: false,
      code: "MALFORMED_SCHEMA",
      errors: [{ message: error.message }],
    };
  }

  const ajv = createAjv();

  try {
    if (!ajv.validateSchema(schema)) {
      return {
        valid: false,
        code: "INVALID_SCHEMA",
        errors: serializeErrors(ajv.errors),
      };
    }

    ajv.compile(schema);

    return {
      valid: true,
      code: "VALID_SCHEMA",
      errors: [],
    };
  } catch (error) {
    return {
      valid: false,
      code: "INVALID_SCHEMA",
      errors: [{ message: error.message }],
    };
  }
}

async function main() {
  const registryRoot = resolve(import.meta.dirname, "..");
  const requiredSchemas = [
    resolve(
      registryRoot,
      "events",
      "identity-profile-service",
      "v1",
      "identity-profile-sample-recorded.event.schema.json",
    ),
    resolve(
      registryRoot,
      "realtime",
      "v1",
      "realtime-message.placeholder.schema.json",
    ),
  ];

  const results = await Promise.all(
    requiredSchemas.map(async (schemaPath) => ({
      schemaPath,
      result: await validateSchemaFile(schemaPath),
    })),
  );

  for (const { schemaPath, result } of results) {
    console.log(`[${result.code}] ${schemaPath}`);
    for (const error of result.errors) {
      console.error(`  ${error.message}`);
    }
  }

  if (results.some(({ result }) => !result.valid)) {
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  await main();
}

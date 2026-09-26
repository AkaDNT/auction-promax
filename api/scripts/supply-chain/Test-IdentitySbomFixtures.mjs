import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const canonicalBomPath = path.join(repoRoot, "services/identity-profile-service/target/bom.json");
const validatorPath = path.join(import.meta.dirname, "Validate-IdentitySbom.mjs");
const trustedSchemaRoot = path.join(repoRoot, "security/schemas/cyclonedx/1.6");
const trustedManifestPath = path.join(repoRoot, "security/tooling/cyclonedx-schemas.json");

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${label} is malformed JSON.`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(root, name, value) {
  const target = path.join(root, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
}

function writeFixture(root, name, mutate) {
  const value = clone(canonicalBom);
  mutate(value);
  return writeJson(root, `${name}.json`, value);
}

function rootDependencyIndex(value) {
  const rootRef = value.metadata?.component?.["bom-ref"];
  const index = value.dependencies?.findIndex((entry) => entry.ref === rootRef) ?? -1;
  if (!rootRef || index < 0) throw new Error("Canonical fixture does not contain the root dependency graph entry.");
  return index;
}

function assertScenario(name, bomPath, expectedValid, options = {}, expectedFailureCode) {
  const args = [
    validatorPath,
    "--bom", bomPath,
    "--schema-root", options.schemaRoot ?? fixtureSchemaRoot,
    "--trust-manifest", options.trustManifest ?? fixtureManifestPath,
  ];
  if (options.referenceBom) args.push("--reference-bom", options.referenceBom);
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  const valid = result.status === 0;
  if (valid !== expectedValid) {
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}.`);
  }
  if (!expectedValid) {
    const expectedOutput = "Identity SBOM validation: FAIL (" + expectedFailureCode + ")";
    if (!expectedFailureCode || !result.stderr.includes(expectedOutput)) {
      throw new Error(name + ": expected failure code " + expectedFailureCode + ", got " + JSON.stringify(result.stderr) + ".");
    }
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

function assertArgumentFailure(name, args, expectedFailureCode) {
  const result = spawnSync(process.execPath, [validatorPath, ...args], { encoding: "utf8" });
  const expectedOutput = "Identity SBOM validation: FAIL (" + expectedFailureCode + ")";
  if (result.status === 0 || !result.stderr.includes(expectedOutput)) {
    throw new Error(name + ": expected failure code " + expectedFailureCode + ", got " + JSON.stringify(result.stderr) + ".");
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

const canonicalBom = readJson(canonicalBomPath, "Canonical generated SBOM fixture source");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "auction-promax-sbom-fixture-"));
const fixtureSchemaRoot = path.join(temporaryRoot, "schemas");
const fixtureManifestPath = path.join(temporaryRoot, "cyclonedx-schemas.json");

try {
  fs.cpSync(trustedSchemaRoot, fixtureSchemaRoot, { recursive: true, errorOnExist: true });
  fs.copyFileSync(trustedManifestPath, fixtureManifestPath);

  const canonicalFixture = writeJson(temporaryRoot, "canonical.json", canonicalBom);
  const emptyFixture = path.join(temporaryRoot, "empty.json");
  const malformedFixture = path.join(temporaryRoot, "malformed.json");
  fs.writeFileSync(emptyFixture, "", "utf8");
  fs.writeFileSync(malformedFixture, "{ not valid json", "utf8");

  const fixtures = [
    ["Canonical SBOM accepted", canonicalFixture, true],
    ["Missing SBOM rejected", path.join(temporaryRoot, "does-not-exist.json"), false],
    ["Empty SBOM rejected", emptyFixture, false],
    ["Malformed SBOM rejected", malformedFixture, false],
    ["Wrong bomFormat rejected", writeFixture(temporaryRoot, "wrong-bom-format", (value) => { value.bomFormat = "SPDX"; }), false],
    ["Wrong specVersion rejected", writeFixture(temporaryRoot, "wrong-spec-version", (value) => { value.specVersion = "1.5"; }), false],
    ["Missing root component rejected", writeFixture(temporaryRoot, "missing-root", (value) => { delete value.metadata.component; }), false],
    ["Wrong root type rejected", writeFixture(temporaryRoot, "wrong-root-type", (value) => { value.metadata.component.type = "library"; }), false],
    ["Wrong root group rejected", writeFixture(temporaryRoot, "wrong-root-group", (value) => { value.metadata.component.group = "example.invalid"; }), false],
    ["Wrong root name rejected", writeFixture(temporaryRoot, "wrong-root-name", (value) => { value.metadata.component.name = "wrong-service"; }), false],
    ["Wrong root version rejected", writeFixture(temporaryRoot, "wrong-root-version", (value) => { value.metadata.component.version = "9.9.9"; }), false],
    ["Missing component inventory rejected", writeFixture(temporaryRoot, "missing-components", (value) => { delete value.components; }), false],
    ["Empty component inventory rejected", writeFixture(temporaryRoot, "empty-components", (value) => { value.components = []; }), false],
    ["Missing dependency graph rejected", writeFixture(temporaryRoot, "missing-dependencies", (value) => { delete value.dependencies; }), false],
    ["Empty dependency graph rejected", writeFixture(temporaryRoot, "empty-dependencies", (value) => { value.dependencies = []; }), false],
    ["Missing root dependency rejected", writeFixture(temporaryRoot, "missing-root-dependency", (value) => { value.dependencies.splice(rootDependencyIndex(value), 1); }), false],
    ["Duplicate component reference rejected", writeFixture(temporaryRoot, "duplicate-component-ref", (value) => { value.components[1]["bom-ref"] = value.components[0]["bom-ref"]; }), false],
    ["Duplicate dependency reference rejected", writeFixture(temporaryRoot, "duplicate-dependency-ref", (value) => { value.dependencies[1].ref = value.dependencies[0].ref; }), false],
    ["Unknown dependency reference rejected", writeFixture(temporaryRoot, "unknown-dependency-ref", (value) => {
      const index = rootDependencyIndex(value) === 0 ? 1 : 0;
      value.dependencies[index].ref = "pkg:maven/example.invalid/missing@1.0.0?type=jar";
    }), false],
    ["Known test-only component rejected", writeFixture(temporaryRoot, "test-only-component", (value) => {
      const component = clone(value.components[0]);
      component.group = "org.junit.jupiter";
      component.name = "junit-jupiter";
      component.version = "5.12.0";
      component["bom-ref"] = "pkg:maven/org.junit.jupiter/junit-jupiter@5.12.0?type=jar";
      component.purl = "pkg:maven/org.junit.jupiter/junit-jupiter@5.12.0?type=jar";
      value.components.push(component);
    }), false],
    ["Testcontainers component rejected", writeFixture(temporaryRoot, "testcontainers-component", (value) => {
      const component = clone(value.components[0]);
      component.group = "org.testcontainers";
      component.name = "postgresql";
      component.version = "1.21.0";
      component["bom-ref"] = "pkg:maven/org.testcontainers/postgresql@1.21.0?type=jar";
      component.purl = component["bom-ref"];
      value.components.push(component);
    }), false],
    ["ArchUnit component rejected", writeFixture(temporaryRoot, "archunit-component", (value) => {
      const component = clone(value.components[0]);
      component.group = "com.tngtech.archunit";
      component.name = "archunit-junit5";
      component.version = "1.4.1";
      component["bom-ref"] = "pkg:maven/com.tngtech.archunit/archunit-junit5@1.4.1?type=jar";
      component.purl = component["bom-ref"];
      value.components.push(component);
    }), false]
  ];

  const missingReferenceRoot = path.join(temporaryRoot, "schemas-missing-spdx");
  fs.cpSync(fixtureSchemaRoot, missingReferenceRoot, { recursive: true });
  fs.rmSync(path.join(missingReferenceRoot, "spdx.schema.json"));
  fixtures.push(["Missing referenced schema rejected", canonicalFixture, false, { schemaRoot: missingReferenceRoot }]);

  const missingJsfReferenceRoot = path.join(temporaryRoot, "schemas-missing-jsf");
  fs.cpSync(fixtureSchemaRoot, missingJsfReferenceRoot, { recursive: true });
  fs.rmSync(path.join(missingJsfReferenceRoot, "jsf-0.82.schema.json"));
  fixtures.push(["Missing JSF referenced schema rejected", canonicalFixture, false, { schemaRoot: missingJsfReferenceRoot }]);

  const alteredManifest = readJson(fixtureManifestPath, "Fixture trust manifest");
  alteredManifest.assets[0].sha256 = "a".repeat(64);
  const alteredManifestPath = writeJson(temporaryRoot, "tampered-trust-manifest.json", alteredManifest);
  fixtures.push(["Trust manifest checksum mismatch rejected", canonicalFixture, false, { trustManifest: alteredManifestPath }]);

  const volatileReference = clone(canonicalBom);
  volatileReference.serialNumber = "urn:uuid:00000000-0000-0000-0000-000000000001";
  volatileReference.metadata.timestamp = "2000-01-01T00:00:00Z";
  const volatileReferencePath = writeJson(temporaryRoot, "volatile-reference.json", volatileReference);
  fixtures.push(["Serial and timestamp-only difference accepted", canonicalFixture, true, { referenceBom: volatileReferencePath }]);

  const semanticDrift = clone(canonicalBom);
  semanticDrift.components[0].version = "9999.0.0";
  const semanticDriftPath = writeJson(temporaryRoot, "semantic-drift.json", semanticDrift);
  fixtures.push(["Component version drift rejected", canonicalFixture, false, { referenceBom: semanticDriftPath }]);

  const reorderedReference = clone(canonicalBom);
  reorderedReference.components.reverse();
  reorderedReference.dependencies.reverse();
  for (const dependency of reorderedReference.dependencies) dependency.dependsOn?.reverse();
  const reorderedReferencePath = writeJson(temporaryRoot, "reordered-reference.json", reorderedReference);
  fixtures.push(["Order-only difference accepted", canonicalFixture, true, { referenceBom: reorderedReferencePath }]);

  const dependencyEdgeDrift = clone(canonicalBom);
  const dependencyWithChildren = dependencyEdgeDrift.dependencies.find((dependency) => Array.isArray(dependency.dependsOn));
  if (!dependencyWithChildren) throw new Error("Canonical fixture does not contain a dependency edge.");
  dependencyWithChildren.dependsOn.push("pkg:maven/example.invalid/missing-edge@1.0.0?type=jar");
  const dependencyEdgeDriftPath = writeJson(temporaryRoot, "dependency-edge-drift.json", dependencyEdgeDrift);
  fixtures.push(["Unknown dependency edge rejected", dependencyEdgeDriftPath, false]);

  const semanticDependencyEdgeDrift = clone(canonicalBom);
  const semanticDependency = semanticDependencyEdgeDrift.dependencies.find((dependency) => dependency.dependsOn?.length > 0);
  if (!semanticDependency) throw new Error("Canonical fixture does not contain a dependency edge for semantic comparison.");
  const alternateReference = semanticDependencyEdgeDrift.components
    .map((component) => component["bom-ref"])
    .find((reference) => reference !== semanticDependency.dependsOn[0]);
  if (!alternateReference) throw new Error("Canonical fixture does not contain an alternate component reference.");
  semanticDependency.dependsOn[0] = alternateReference;
  const semanticDependencyEdgeDriftPath = writeJson(temporaryRoot, "semantic-dependency-edge-drift.json", semanticDependencyEdgeDrift);
  fixtures.push(["Dependency edge semantic drift rejected", canonicalFixture, false, { referenceBom: semanticDependencyEdgeDriftPath }]);

  if (!fs.existsSync(validatorPath)) {
    throw new Error("RED: Validate-IdentitySbom.mjs is not implemented; Cycle 2 fixtures are ready for the validator step.");
  }

  const expectedFailureCodes = new Map([
    ["Missing SBOM rejected", "SBOM_MISSING_OR_EMPTY"],
    ["Empty SBOM rejected", "SBOM_MISSING_OR_EMPTY"],
    ["Malformed SBOM rejected", "SBOM_MALFORMED"],
    ["Wrong bomFormat rejected", "SBOM_SCHEMA_VALIDATION_FAILED"],
    ["Wrong specVersion rejected", "INVALID_SPEC_VERSION"],
    ["Missing root component rejected", "ROOT_COMPONENT_MISSING"],
    ["Wrong root type rejected", "ROOT_COMPONENT_TYPE_INVALID"],
    ["Wrong root group rejected", "ROOT_COMPONENT_GROUP_INVALID"],
    ["Wrong root name rejected", "ROOT_COMPONENT_NAME_INVALID"],
    ["Wrong root version rejected", "ROOT_COMPONENT_VERSION_INVALID"],
    ["Missing component inventory rejected", "COMPONENT_INVENTORY_EMPTY"],
    ["Empty component inventory rejected", "COMPONENT_INVENTORY_EMPTY"],
    ["Missing dependency graph rejected", "DEPENDENCY_GRAPH_EMPTY"],
    ["Empty dependency graph rejected", "DEPENDENCY_GRAPH_EMPTY"],
    ["Missing root dependency rejected", "ROOT_DEPENDENCY_MISSING"],
    ["Duplicate component reference rejected", "DUPLICATE_COMPONENT_REFERENCE"],
    ["Duplicate dependency reference rejected", "DUPLICATE_DEPENDENCY_REFERENCE"],
    ["Unknown dependency reference rejected", "DEPENDENCY_REFERENCE_UNKNOWN"],
    ["Known test-only component rejected", "TEST_SCOPE_COMPONENT_PRESENT"],
    ["Testcontainers component rejected", "TEST_SCOPE_COMPONENT_PRESENT"],
    ["ArchUnit component rejected", "TEST_SCOPE_COMPONENT_PRESENT"],
    ["Missing referenced schema rejected", "REFERENCED_SCHEMA_MISSING"],
    ["Missing JSF referenced schema rejected", "REFERENCED_SCHEMA_MISSING"],
    ["Trust manifest checksum mismatch rejected", "TRUST_MANIFEST_INVALID"],
    ["Component version drift rejected", "SBOM_SEMANTIC_REPRODUCIBILITY_FAILED"],
    ["Unknown dependency edge rejected", "DEPENDENCY_EDGE_REFERENCE_UNKNOWN"],
    ["Dependency edge semantic drift rejected", "SBOM_SEMANTIC_REPRODUCIBILITY_FAILED"]
  ]);
  for (const [name, bomPath, expectedValid, options] of fixtures) {
    assertScenario(name, bomPath, expectedValid, options, expectedFailureCodes.get(name));
  }
  const canonicalArguments = ["--bom", canonicalFixture, "--schema-root", fixtureSchemaRoot, "--trust-manifest", fixtureManifestPath];
  assertArgumentFailure("Duplicate CLI argument rejected", [...canonicalArguments, "--bom", canonicalFixture], "INVALID_ARGUMENTS");
  assertArgumentFailure("Unsupported CLI argument rejected", [...canonicalArguments, "--unexpected", "value"], "UNSUPPORTED_ARGUMENT");
  process.stdout.write("Identity SBOM fixture tests: PASS\n");
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

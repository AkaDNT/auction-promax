import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInventory, expandLiteral } from './ServiceGeneratorCore.mjs';

const referenceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tokens = new Set(['__SERVICE_ID__', '__PACKAGE_NAME__', '__PACKAGE_PATH__', '__ENTRY_CLASS__',
  '__DB_NAME__', '__TEST_DB_NAME__', '__SCHEMA_NAME__', '__ENV_PREFIX__']);
const wrapperTokens = new Set(['__MVNW_ARG0_NAME__', '__MVNW_CMD__', '__MVNW_ERROR__']);
function requireCondition(value) { if (!value) throw new Error('TEMPLATE_CONFORMANCE_FAILED'); }
function normalized(file) { return readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); }

export function validateTemplateConformance(root) {
  const entries = validateInventory(root);
  const texts = new Map(entries.map(entry => [entry.source,
    normalized(path.join(root, 'api/service-foundation', entry.source))]));
  const logging = texts.get('templates/common/StructuredLoggingTest.java') ?? '';
  const probeController = texts.get('templates/common/TechnicalProbeController.java') ?? '';
  requireCondition(/public\s+TechnicalValidationResponse\s+validate\(@Valid\s+@RequestBody\s+TechnicalValidationRequest\s+request\)/.test(probeController));
  for (const pattern of [/new StructuredLogEncoder\(/, /encoder\.encode\(/,
    /STRICT_DUPLICATE_DETECTION/, /@NullSource/, /fixture-correlation/, /outer-correlation/,
    /TechnicalProbeController\.class/, /new CorrelationIdFilter\(\)\.doFilter/,
    /prepareForDeferredProcessing/, /MDC\.getCopyOfContextMap\(\)\)\.isEqualTo\(expectedMdc\)/,
    /doesNotContain\(raw\)/]) requireCondition(pattern.test(logging));
  const architecture = texts.get('templates/common/ArchitectureTest.java') ?? '';
  for (const fixture of ['InvalidAdapterDependency', 'InvalidFrameworkDependency', 'InvalidInboundDependency']) {
    requireCondition(architecture.includes(`.hasMessageContaining("${fixture}")`));
  }
  requireCondition((architecture.match(/\.isInstanceOf\(AssertionError\.class\)/g) ?? []).length === 3);
  requireCondition(architecture.includes('APPLICATION_RULE.check(fixture)') && architecture.includes('INBOUND_RULE.check(fixture)'));
  for (const rule of ['DOMAIN_RULE', 'APPLICATION_RULE', 'PORTS_RULE']) {
    requireCondition(architecture.includes(`${rule}.allowEmptyShould(true).check(PRODUCTION)`));
  }
  requireCondition(!/allowEmptyShould\(true\)\.check\(fixture\)/.test(architecture));
  const problemAdvice = texts.get('templates/common/TechnicalProblemAdvice.java') ?? '';
  requireCondition(/ResponseEntity<Object> unexpected\(Exception exception, HttpServletRequest request\)/.test(problemAdvice));
  for (const entry of entries) {
    const text = texts.get(entry.source);
    const values = Object.fromEntries([...tokens].filter(token => !entry.variants.includes('gateway')
      || !/^__(?:DB_NAME|TEST_DB_NAME|SCHEMA_NAME|ENV_PREFIX)__$/.test(token)).map(token => [token, 'fixture']));
    try {
      expandLiteral(entry.destination, values);
      expandLiteral(text, values, entry.source);
    } catch { requireCondition(false); }
    if (['mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties'].includes(entry.destination)) {
      requireCondition(text === normalized(path.join(referenceRoot, 'api/services/identity-profile-service', entry.destination)));
    }
  }
  const requiredCommon = ['pom.xml', 'mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties',
    'Dockerfile', 'README.md', 'src/main/resources/application.yaml', 'src/main/resources/application-local.yaml',
    'src/main/java/__PACKAGE_PATH__/__ENTRY_CLASS__.java',
    'src/main/java/__PACKAGE_PATH__/configuration/TechnicalConfiguration.java',
    'src/test/java/__PACKAGE_PATH__/TechnicalHttpTest.java', 'src/test/java/__PACKAGE_PATH__/StructuredLoggingTest.java',
    'src/test/java/__PACKAGE_PATH__/architecture/ArchitectureTest.java'];
  for (const variant of ['relational', 'gateway']) {
    const selected = entries.filter(entry => entry.variants.includes(variant));
    const paths = new Set(selected.map(entry => entry.destination));
    requireCondition(requiredCommon.every(destination => paths.has(destination)));
    const pom = texts.get(selected.find(entry => entry.destination === 'pom.xml').source);
    const selector = variant === 'gateway' ? '**/GatewayNoDatastoreIT.java' : '**/*TestcontainersIT.java';
    requireCondition(pom.includes(`<include>${selector}</include>`) && !/<skipITs>\s*true/.test(pom));
    const className = variant === 'gateway' ? 'GatewayNoDatastoreIT' : 'RelationalBoundaryTestcontainersIT';
    requireCondition(paths.has(`src/test/java/__PACKAGE_PATH__/${className}.java`));
    if (variant === 'gateway') {
      requireCondition(!/spring-boot-starter-(?:data-jpa|jdbc)|<artifactId>spring-jdbc<|org\.postgresql|flyway|<artifactId>postgresql</i.test(pom));
      for (const entry of selected) {
        const text = texts.get(entry.source);
        requireCondition(!/migration|bootstrap|TestcontainersIT/.test(entry.destination));
        if (/\.ya?ml$/.test(entry.destination)) requireCondition(!/datasource|flyway|jdbc|postgres|readinessState,db/i.test(text));
        if (/\.java$/.test(entry.destination)) requireCondition(!/^\s*import\s+(?:static\s+)?(?:java\.sql|javax\.sql|org\.springframework\.jdbc|org\.postgresql|org\.flywaydb|org\.testcontainers)/m.test(text));
      }
    }
  }
  return { files: entries.length, variants: ['relational', 'gateway'] };
}

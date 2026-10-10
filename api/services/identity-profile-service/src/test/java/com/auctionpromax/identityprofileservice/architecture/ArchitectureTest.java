package com.auctionpromax.identityprofileservice.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ArchitectureTest {

  private static final String BASE_PACKAGE = "com.auctionpromax.identityprofileservice";

  private static final JavaClasses PRODUCTION_CLASSES = new ClassFileImporter().importPackages(
      BASE_PACKAGE + ".domain",
      BASE_PACKAGE + ".application",
      BASE_PACKAGE + ".adapter",
      BASE_PACKAGE + ".ports",
      BASE_PACKAGE + ".configuration");

  private static final ArchRule DOMAIN_MUST_NOT_DEPEND_ON_ADAPTERS = noClasses()
      .that().resideInAPackage("..domain..")
      .should().dependOnClassesThat()
      .resideInAnyPackage(
          "..adapter..",
          "org.springframework..",
          "jakarta.persistence..",
          "jakarta.servlet..",
          "org.slf4j..")
      .because("domain must remain independent of delivery and framework adapters");

  private static final ArchRule APPLICATION_MUST_NOT_DEPEND_ON_FRAMEWORKS_OR_ADAPTERS = noClasses()
      .that().resideInAPackage("..application..")
      .should().dependOnClassesThat()
      .resideInAnyPackage(
          "..adapter..",
          "org.springframework..",
          "org.slf4j..",
          "com.fasterxml.jackson..",
          "tools.jackson..",
          "io.micrometer..",
          "java.sql..",
          "javax.sql..",
          "jakarta.persistence..",
          "jakarta.servlet..")
      .because("application orchestration must depend only on domain, ports, and Java");

  private static final ArchRule PORTS_MUST_NOT_DEPEND_ON_ADAPTERS_OR_FRAMEWORKS = noClasses()
      .that().resideInAPackage("..ports..")
      .should().dependOnClassesThat()
      .resideInAnyPackage(
          "..adapter..",
          "org.springframework..",
          "org.slf4j..",
          "com.fasterxml.jackson..",
          "tools.jackson..",
          "io.micrometer..",
          "java.sql..",
          "javax.sql..",
          "jakarta..")
      .because("ports must remain technology independent");

  private static final ArchRule INBOUND_ADAPTERS_MUST_USE_INBOUND_PORTS = noClasses()
      .that().resideInAPackage("..adapter.in..")
      .should().dependOnClassesThat()
      .resideInAPackage("..application..")
      .because("inbound adapters must invoke application behavior through inbound ports");

  @Test
  void domainMustNotDependOnAdaptersOrFrameworks() {
    DOMAIN_MUST_NOT_DEPEND_ON_ADAPTERS.check(PRODUCTION_CLASSES);
  }

  @Test
  void applicationMustNotDependOnFrameworksOrAdapters() {
    APPLICATION_MUST_NOT_DEPEND_ON_FRAMEWORKS_OR_ADAPTERS.check(PRODUCTION_CLASSES);
  }

  @Test
  void portsMustRemainTechnologyIndependent() {
    PORTS_MUST_NOT_DEPEND_ON_ADAPTERS_OR_FRAMEWORKS.check(PRODUCTION_CLASSES);
  }

  @Test
  void inboundAdaptersMustUseInboundPorts() {
    INBOUND_ADAPTERS_MUST_USE_INBOUND_PORTS.check(PRODUCTION_CLASSES);
  }

  @Test
  void topLevelPackagesMustBeFreeOfCycles() {
    slices()
        .matching(BASE_PACKAGE + ".(*)..")
        .should().beFreeOfCycles()
        .check(PRODUCTION_CLASSES);
  }

  @Test
  void applicationBoundaryRuleDetectsDeliberateAdapterViolation() {
    JavaClasses invalidFixtureClasses = new ClassFileImporter()
        .importPackages("com.auctionpromax.architecturefixture");

    assertThatThrownBy(() ->
        APPLICATION_MUST_NOT_DEPEND_ON_FRAMEWORKS_OR_ADAPTERS.check(invalidFixtureClasses))
        .isInstanceOf(AssertionError.class)
        .hasMessageContaining("InvalidApplicationDependency");
  }

  @Test
  void applicationBoundaryRuleDetectsDeliberateFrameworkViolation() {
    JavaClasses invalidFixtureClasses = new ClassFileImporter()
        .importPackages("com.auctionpromax.frameworkleakfixture");

    assertThatThrownBy(() ->
        APPLICATION_MUST_NOT_DEPEND_ON_FRAMEWORKS_OR_ADAPTERS.check(invalidFixtureClasses))
        .isInstanceOf(AssertionError.class)
        .hasMessageContaining("FrameworkLeakingApplication")
        .hasMessageContaining("JdbcTemplate");
  }

  @Test
  void inboundAdapterRuleDetectsDeliberateApplicationDependency() {
    JavaClasses invalidFixtureClasses = new ClassFileImporter()
        .importPackages("com.auctionpromax.inboundadapterfixture");

    assertThatThrownBy(() -> INBOUND_ADAPTERS_MUST_USE_INBOUND_PORTS.check(invalidFixtureClasses))
        .isInstanceOf(AssertionError.class)
        .hasMessageContaining("InvalidInboundAdapterDependency")
        .hasMessageContaining("CreateSampleService");
  }
}

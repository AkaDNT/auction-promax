package __PACKAGE_NAME__.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ArchitectureTest {
    private static final String BASE = "__PACKAGE_NAME__";
    private static final JavaClasses PRODUCTION = new ClassFileImporter().importPackages(
        BASE + ".domain", BASE + ".application", BASE + ".adapter", BASE + ".ports", BASE + ".configuration");
    private static final ArchRule DOMAIN_RULE = noClasses().that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAnyPackage("..adapter..", "org.springframework..",
            "jakarta.persistence..", "jakarta.servlet..", "org.slf4j..");
    private static final ArchRule APPLICATION_RULE = noClasses().that().resideInAPackage("..application..")
        .should().dependOnClassesThat().resideInAnyPackage("..adapter..", "org.springframework..", "org.slf4j..",
            "com.fasterxml.jackson..", "io.micrometer..", "java.sql..", "javax.sql..",
            "jakarta.persistence..", "jakarta.servlet..");
    private static final ArchRule PORTS_RULE = noClasses().that().resideInAPackage("..ports..")
        .should().dependOnClassesThat().resideInAnyPackage("..adapter..", "org.springframework..", "org.slf4j..",
            "com.fasterxml.jackson..", "io.micrometer..", "java.sql..", "javax.sql..", "jakarta..");
    private static final ArchRule INBOUND_RULE = noClasses().that().resideInAPackage("..adapter.in..")
        .should().dependOnClassesThat().resideInAPackage("..application..");

    @Test void domainHasNoAdapterOrFrameworkDependencies() { DOMAIN_RULE.allowEmptyShould(true).check(PRODUCTION); }
    @Test void applicationHasNoAdapterOrFrameworkDependencies() { APPLICATION_RULE.allowEmptyShould(true).check(PRODUCTION); }
    @Test void portsRemainTechnologyIndependent() { PORTS_RULE.allowEmptyShould(true).check(PRODUCTION); }
    @Test void inboundAdaptersUseApplicationPorts() { INBOUND_RULE.check(PRODUCTION); }
    @Test void topLevelPackagesHaveNoCycles() {
        slices().matching(BASE + ".(*)..").should().beFreeOfCycles().check(PRODUCTION);
    }
    @Test void deliberateAdapterDependencyIsRejected() {
        JavaClasses fixture = new ClassFileImporter().importPackages("com.auctionpromax.foundationfixtures.application");
        assertThatThrownBy(() -> APPLICATION_RULE.check(fixture)).isInstanceOf(AssertionError.class)
            .hasMessageContaining("InvalidAdapterDependency");
    }
    @Test void deliberateFrameworkDependencyIsRejected() {
        JavaClasses fixture = new ClassFileImporter().importPackages("com.auctionpromax.foundationfixtures.application");
        assertThatThrownBy(() -> APPLICATION_RULE.check(fixture)).isInstanceOf(AssertionError.class)
            .hasMessageContaining("InvalidFrameworkDependency").hasMessageContaining("ApplicationContext");
    }
    @Test void deliberateInboundDependencyIsRejected() {
        JavaClasses fixture = new ClassFileImporter().importPackages("com.auctionpromax.foundationfixtures.adapter.in");
        assertThatThrownBy(() -> INBOUND_RULE.check(fixture)).isInstanceOf(AssertionError.class)
            .hasMessageContaining("InvalidInboundDependency").hasMessageContaining("FoundationApplicationFixture");
    }
}

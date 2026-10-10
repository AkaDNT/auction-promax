package __PACKAGE_NAME__;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("testcontainers")
@Testcontainers
class RelationalBoundaryTestcontainersIT {
    private static final String DATABASE = "__TEST_DB_NAME__";
    private static final String APP_USER = "__ENV_PREFIX___test_app".toLowerCase(java.util.Locale.ROOT);
    private static final String APP_PASSWORD = "test-only-app-not-a-secret";
    private static final String MIGRATOR_USER = "__ENV_PREFIX___test_migrator".toLowerCase(java.util.Locale.ROOT);
    private static final String MIGRATOR_PASSWORD = "test-only-migrator-not-a-secret";
    private static final DockerImageName IMAGE = DockerImageName.parse(
        "postgres:17.11-bookworm@sha256:84560e3b9c6874893fc4e2854f5dc3e7c1a37bc9d1dfd7a8c641310ae22ba5ad")
        .asCompatibleSubstituteFor("postgres");

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(IMAGE)
        .withDatabaseName(DATABASE).withUsername("tc_bootstrap")
        .withPassword("test-only-bootstrap-not-a-secret")
        .withInitScript("db/testcontainers/bootstrap.sql");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", () -> APP_USER);
        registry.add("spring.datasource.password", () -> APP_PASSWORD);
        registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
        registry.add("spring.flyway.user", () -> MIGRATOR_USER);
        registry.add("spring.flyway.password", () -> MIGRATOR_PASSWORD);
        registry.add("spring.flyway.default-schema", () -> "__SCHEMA_NAME__");
        registry.add("spring.flyway.schemas", () -> "__SCHEMA_NAME__");
        registry.add("spring.flyway.placeholders.runtimeRole", () -> APP_USER);
        registry.add("management.endpoint.health.group.readiness.include", () -> "readinessState,db");
    }

    private final JdbcTemplate jdbc;
    private final MockMvc mockMvc;

    @Autowired
    RelationalBoundaryTestcontainersIT(JdbcTemplate jdbc, MockMvc mockMvc) {
        this.jdbc = jdbc;
        this.mockMvc = mockMvc;
    }

    @Test
    void runtimeRoleHasOnlyProbeDataPrivilegesAndCannotReadFlywayHistory() {
        assertThat(jdbc.queryForObject("SELECT current_user", String.class)).isEqualTo(APP_USER);
        jdbc.update("INSERT INTO __SCHEMA_NAME__.technical_probe(probe_value) VALUES (?)", "safe");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM __SCHEMA_NAME__.technical_probe", Integer.class)).isEqualTo(1);
        assertThat(Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT has_table_privilege(current_user, '__SCHEMA_NAME__.flyway_schema_history', 'SELECT')", Boolean.class))).isFalse();
    }

    @Test
    void readinessIncludesDatabaseConnectivity() throws Exception {
        mockMvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
    }

    @Test
    void datasourceCannotCrossIntoAnotherRegisteredDatabase() throws Exception {
        String foreignUrl = POSTGRES.getJdbcUrl().replace("/" + DATABASE, "/postgres");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> java.sql.DriverManager.getConnection(
            foreignUrl, APP_USER, APP_PASSWORD)).isInstanceOf(java.sql.SQLException.class)
            .satisfies(error -> assertThat(((java.sql.SQLException) error).getSQLState()).isEqualTo("42501"));
    }
}

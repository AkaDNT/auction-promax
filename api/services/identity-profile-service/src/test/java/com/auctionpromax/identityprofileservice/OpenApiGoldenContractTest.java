package com.auctionpromax.identityprofileservice;

import com.auctionpromax.identityprofileservice.adapter.in.web.baseline.TechnicalBaselineController;
import com.auctionpromax.identityprofileservice.adapter.in.web.sample.CreateSampleController;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleResult;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleUseCase;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Tests the real springdoc generator with both public controller contracts and no persistence. */
@SpringBootTest(classes = OpenApiGoldenContractTest.ContractApplication.class,
    properties = "auction.sample-flow.enabled=true")
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("t03")
class OpenApiGoldenContractTest {
  @Autowired MockMvc mockMvc;

  @Configuration(proxyBeanMethods = false)
  @EnableAutoConfiguration
  @Import({TechnicalBaselineController.class, CreateSampleController.class})
  static class ContractApplication {
    @Bean CreateSampleUseCase createSampleUseCase() {
      return command -> new CreateSampleResult(
          UUID.fromString("0192f1c0-0000-7000-8000-000000000021"), "RECORDED", false);
    }
  }

  @Test
  void preservesSampleHttpSuccessBytesAndCreatedStatus() throws Exception {
    mockMvc.perform(post("/api/v1/identity-profile-samples")
            .header("Idempotency-Key", "spring-baseline-001")
            .contentType("application/json")
            .content("{\"purpose\":\"PHASE_0_BASELINE\",\"sampleRequestId\":null}"))
        .andExpect(status().isCreated())
        .andExpect(content().contentTypeCompatibleWith("application/json"))
        .andExpect(content().string(
            "{\"sampleId\":\"0192f1c0-0000-7000-8000-000000000021\",\"status\":\"RECORDED\"}"));
  }

  @Test
  void preservesActualOpenApiOperationsAndSchemaContracts() throws Exception {
    var mapper = new ObjectMapper();
    String body = mockMvc.perform(get("/v3/api-docs"))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    ObjectNode actual = (ObjectNode) mapper.readTree(body);
    // The generated server address depends on the request host; no other metadata is removed.
    for (var server : actual.path("servers")) {
      ((ObjectNode) server).put("url", "http://baseline.invalid");
    }
    assertThat(actual.path("paths").has("/api/v1/identity-profile-samples")).isTrue();
    assertThat(actual.path("paths").has("/internal/technical-baseline/validate")).isTrue();
    if (Boolean.getBoolean("springRemediation.captureBaseline")) {
      Path output = Path.of("target", "spring-remediation", "openapi-baseline.json");
      Files.createDirectories(output.getParent());
      Files.writeString(output, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(actual));
      return;
    }
    try (var expected = getClass().getResourceAsStream("/spring-remediation/openapi-golden.json")) {
      assertThat(expected).as("reviewed Boot 3.5.16 OpenAPI baseline must exist").isNotNull();
      assertThat(actual).isEqualTo(mapper.readTree(expected));
    }
  }
}

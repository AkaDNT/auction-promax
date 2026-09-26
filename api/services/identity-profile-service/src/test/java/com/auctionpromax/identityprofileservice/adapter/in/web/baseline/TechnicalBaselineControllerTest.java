package com.auctionpromax.identityprofileservice.adapter.in.web.baseline;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;

import com.auctionpromax.identityprofileservice.adapter.in.web.correlation.CorrelationIdFilter;
import com.auctionpromax.identityprofileservice.configuration.TechnicalBaselineSecurityConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON;

@WebMvcTest(TechnicalBaselineController.class)
@Import({
    TechnicalBaselineSecurityConfiguration.class
})
public class TechnicalBaselineControllerTest {
  @Autowired
  private MockMvc mockMvc;

  @Test
  void permitsTechnicalValidationPostWithoutCsrfToken() throws Exception {
    mockMvc.perform(post("/internal/technical-baseline/validate")
        .contentType(APPLICATION_JSON)
        .content("""
            {
              "value": "hello"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accepted").value(true))
        .andExpect(jsonPath("$.valueLength").value(5));
  }

  @Test
  void deniesUnknownPaths() throws Exception {
    mockMvc.perform(get("/not-allowed"))
        .andExpect(status().isForbidden());
  }

  @Test
  void rejectsBlankValue() throws Exception {
    mockMvc.perform(post("/internal/technical-baseline/validate")
        .contentType(APPLICATION_JSON)
        .content("""
            {
              "value": ""
            }
            """))
        .andExpect(status().isBadRequest());
  }

  @Test
  void rejectsWhitespaceOnlyValue() throws Exception {
    mockMvc.perform(post("/internal/technical-baseline/validate")
        .contentType(APPLICATION_JSON)
        .content("""
            {
              "value": "   "
            }
            """))
        .andExpect(status().isBadRequest());
  }

  @Test
  void rejectsValueLongerThanOneHundredCharacters() throws Exception {
    String value = "x".repeat(101);

    mockMvc.perform(post("/internal/technical-baseline/validate")
        .contentType(APPLICATION_JSON)
        .content("""
            {
              "value": "%s"
            }
            """.formatted(value)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void preservesValidCorrelationIdInHttpResponse() throws Exception {
    mockMvc.perform(post("/internal/technical-baseline/validate")
        .header(CorrelationIdFilter.HEADER_NAME, "t03-local-001")
        .contentType(APPLICATION_JSON)
        .content("""
            {
              "value": "hello"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(header().string(
            CorrelationIdFilter.HEADER_NAME,
            "t03-local-001"));
  }

  @Test
  void replacesInvalidCorrelationIdInHttpResponse() throws Exception {
    String maliciousValue = "<script>alert(1)</script>";

    mockMvc.perform(post("/internal/technical-baseline/validate")
        .header(CorrelationIdFilter.HEADER_NAME, maliciousValue)
        .contentType(APPLICATION_JSON)
        .content("""
            {
              "value": "hello"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(header().exists(CorrelationIdFilter.HEADER_NAME))
        .andExpect(header().string(
            CorrelationIdFilter.HEADER_NAME,
            org.hamcrest.Matchers.not(maliciousValue)));
  }

  @Test
  void returnsProblemDetailForBlankValue() throws Exception {
    mockMvc.perform(post("/internal/technical-baseline/validate")
        .header(CorrelationIdFilter.HEADER_NAME, "t03-validation-001")
        .contentType(APPLICATION_JSON)
        .content("""
            {
              "value": ""
            }
            """))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.type").value(
            "urn:auction-promax:problem:validation-failed"))
        .andExpect(jsonPath("$.title").value("Request validation failed"))
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.detail").value("The request is invalid."))
        .andExpect(jsonPath("$.instance").value(
            "/internal/technical-baseline/validate"))
        .andExpect(jsonPath("$.correlationId").value("t03-validation-001"))
        .andExpect(content().string(not(containsString("stackTrace"))))
        .andExpect(content().string(not(containsString("exceptionClass"))))
        .andExpect(content().string(not(containsString("\"value\":\"\""))));
  }

  @Test
  void returnsProblemDetailForMalformedJson() throws Exception {
    mockMvc.perform(post("/internal/technical-baseline/validate")
        .header(CorrelationIdFilter.HEADER_NAME, "t03-malformed-001")
        .contentType(APPLICATION_JSON)
        .content("{\"value\":"))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(APPLICATION_PROBLEM_JSON))
        .andExpect(header().string(
            CorrelationIdFilter.HEADER_NAME,
            "t03-malformed-001"))
        .andExpect(jsonPath("$.type").value(
            "urn:auction-promax:problem:malformed-request"))
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.correlationId").value("t03-malformed-001"))
        .andExpect(content().string(not(containsString("{\"value\":"))));
  }
}

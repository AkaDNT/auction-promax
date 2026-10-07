package __PACKAGE_NAME__;

import __PACKAGE_NAME__.adapter.in.web.CorrelationIdFilter;
import __PACKAGE_NAME__.adapter.in.web.TechnicalProblemAdvice;
import __PACKAGE_NAME__.configuration.TechnicalConfiguration;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = __PACKAGE_NAME__.adapter.in.web.TechnicalProbeController.class)
@Import({TechnicalConfiguration.class, CorrelationIdFilter.class, TechnicalProblemAdvice.class})
class TechnicalHttpTest {
    @Autowired MockMvc mockMvc;

    @Test
    void correlationFilterRestoresAbsentMatchingAndDifferentPriorMdc() throws Exception {
        CorrelationIdFilter filter = new CorrelationIdFilter();
        for (String prior : new String[] {null, "request-correlation", "outer-correlation"}) {
            MDC.clear();
            if (prior != null) MDC.put(CorrelationIdFilter.MDC_KEY, prior);
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader(CorrelationIdFilter.HEADER_NAME, "request-correlation");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, (ignoredRequest, ignoredResponse) ->
                org.assertj.core.api.Assertions.assertThat(MDC.get(CorrelationIdFilter.MDC_KEY))
                    .isEqualTo("request-correlation"));
            org.assertj.core.api.Assertions.assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isEqualTo(prior);
            org.assertj.core.api.Assertions.assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
                .isEqualTo("request-correlation");
        }
        MDC.clear();
    }

    @Test
    void correlationFilterRestoresPriorMdcWhenChainThrows() {
        MDC.put(CorrelationIdFilter.MDC_KEY, "outer-correlation");
        CorrelationIdFilter filter = new CorrelationIdFilter();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> filter.doFilter(
                new MockHttpServletRequest(), new MockHttpServletResponse(),
                (ignoredRequest, ignoredResponse) -> { throw new jakarta.servlet.ServletException("fixture"); }))
            .isInstanceOf(jakarta.servlet.ServletException.class);
        org.assertj.core.api.Assertions.assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isEqualTo("outer-correlation");
        MDC.clear();
    }

    @Test
    void missingCorrelationHeaderGetsCanonicalUuid() throws Exception {
        CorrelationIdFilter filter = new CorrelationIdFilter();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {});
        String id = response.getHeader(CorrelationIdFilter.HEADER_NAME);
        org.assertj.core.api.Assertions.assertThat(id).matches("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$");
        org.assertj.core.api.Assertions.assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }

    @Test
    void acceptsNonblankValueAtMaximumLength() throws Exception {
        mockMvc.perform(post("/internal/technical-baseline/validate")
                .contentType(APPLICATION_JSON).content("{\"value\":\"" + "x".repeat(100) + "\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.accepted").value(true))
            .andExpect(jsonPath("$.valueLength").value(100));
    }

    @Test
    void rejectsEmptyAndOverlongValues() throws Exception {
        mockMvc.perform(post("/internal/technical-baseline/validate").contentType(APPLICATION_JSON)
                .content("{\"value\":\"\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mockMvc.perform(post("/internal/technical-baseline/validate").contentType(APPLICATION_JSON)
                .content("{\"value\":\"" + "x".repeat(101) + "\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void deniesUnlistedRoutesAndOtherTechnicalBaselineMethodsAndPaths() throws Exception {
        mockMvc.perform(get("/not-a-technical-route")).andExpect(status().isForbidden());
        mockMvc.perform(get("/internal/technical-baseline/validate")).andExpect(status().isForbidden());
        mockMvc.perform(post("/internal/technical-baseline/future"))
            .andExpect(status().isForbidden());
    }
}

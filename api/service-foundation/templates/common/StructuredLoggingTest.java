package __PACKAGE_NAME__;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import __PACKAGE_NAME__.adapter.in.web.CorrelationIdFilter;
import __PACKAGE_NAME__.adapter.in.web.TechnicalProbeController;
import __PACKAGE_NAME__.adapter.in.web.TechnicalValidationRequest;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.logging.logback.StructuredLogEncoder;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class StructuredLoggingTest {
    private static final String LOGGER_NAME = "foundation.structured.logging.fixture";

    @AfterEach
    void clearMdc() { MDC.clear(); }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"fixture-correlation", "outer-correlation"})
    void ecsEncoderWritesOneCorrelationFieldAndNoRawValue(String outerCorrelation) throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(TechnicalProbeController.class);
        Level priorLevel = logger.getLevel();
        boolean priorAdditive = logger.isAdditive();
        Map<String, String> priorMdc = MDC.getCopyOfContextMap();
        ListAppender<ILoggingEvent> appender = new ListAppender<>() {
            @Override protected void append(ILoggingEvent event) {
                event.prepareForDeferredProcessing();
                super.append(event);
            }
        };
        LoggerContext encoderContext = new LoggerContext();
        encoderContext.putObject(Environment.class.getName(), new MockEnvironment());
        StructuredLogEncoder encoder = new StructuredLogEncoder();
        encoder.setContext(encoderContext);
        encoder.setFormat("ecs");
        try {
            encoder.start();
            appender.setContext(logger.getLoggerContext());
            appender.start();
            logger.addAppender(appender);
            logger.setLevel(Level.INFO);
            logger.setAdditive(false);
            MDC.clear();
            if (outerCorrelation != null) MDC.put("correlationId", outerCorrelation);
            Map<String, String> expectedMdc = MDC.getCopyOfContextMap();
            String raw = "DO-NOT-LOG-THIS-RAW-VALUE";
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader(CorrelationIdFilter.HEADER_NAME, "fixture-correlation");
            new CorrelationIdFilter().doFilter(request, new MockHttpServletResponse(),
                (ignoredRequest, ignoredResponse) -> new TechnicalProbeController()
                    .validate(new TechnicalValidationRequest(raw)));
            assertThat(MDC.getCopyOfContextMap()).isEqualTo(expectedMdc);

            assertThat(appender.list).hasSize(1);
            byte[] encoded = encoder.encode(appender.list.getFirst());
            String jsonLine = new String(encoded, StandardCharsets.UTF_8);
            JsonFactory factory = JsonFactory.builder()
                .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
            JsonNode json = new ObjectMapper(factory).readTree(jsonLine);
            assertThat(json.path("event").asText()).isEqualTo("technical_validation.accepted");
            assertThat(json.path("valueLength").asInt()).isEqualTo(raw.length());
            assertThat(json.path("correlationId").asText()).isEqualTo("fixture-correlation");
            assertThat(jsonLine).doesNotContain(raw);
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(priorLevel);
            logger.setAdditive(priorAdditive);
            appender.stop();
            encoder.stop();
            encoderContext.stop();
            MDC.clear();
            if (priorMdc != null) MDC.setContextMap(priorMdc);
        }
    }
}

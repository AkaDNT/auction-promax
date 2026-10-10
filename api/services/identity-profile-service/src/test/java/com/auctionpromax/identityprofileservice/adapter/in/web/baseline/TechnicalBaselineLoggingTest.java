package com.auctionpromax.identityprofileservice.adapter.in.web.baseline;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.auctionpromax.identityprofileservice.adapter.in.web.correlation.CorrelationIdFilter;
import com.auctionpromax.identityprofileservice.adapter.in.web.error.GlobalProblemDetailHandler;
import com.auctionpromax.identityprofileservice.configuration.TechnicalBaselineSecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.event.KeyValuePair;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TechnicalBaselineController.class)
@Import({
        TechnicalBaselineSecurityConfiguration.class,
        CorrelationIdFilter.class,
        GlobalProblemDetailHandler.class
})
class TechnicalBaselineLoggingTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void logsSuccessEventWithoutRawRequestValue() throws Exception {
        String rawValue = "SUPER-SECRET-RAW-VALUE";

        try (LogCapture logs = LogCapture.forLogger(
                TechnicalBaselineController.class)) {

            mockMvc.perform(post("/internal/technical-baseline/validate")
                    .contentType(APPLICATION_JSON)
                    .content("""
                            {
                              "value": "%s"
                            }
                            """.formatted(rawValue)))
                    .andExpect(status().isOk());

            ILoggingEvent event = logs.singleEvent("event", "technical_validation.accepted");

            assertThat(event.getLevel())
                    .isEqualTo(Level.INFO);

            assertThat(event.getFormattedMessage())
                    .isEqualTo("Technical validation accepted");

            assertThat(keyValue(event, "event"))
                    .isEqualTo("technical_validation.accepted");

            assertThat(keyValue(event, "valueLength"))
                    .isEqualTo(rawValue.length());

            assertDoesNotExpose(event, rawValue);
        }
    }

    @Test
    void logsSafeFixedEventForValidationFailure() throws Exception {
        try (LogCapture logs = LogCapture.forLogger(
                GlobalProblemDetailHandler.class)) {

            mockMvc.perform(post("/internal/technical-baseline/validate")
                    .contentType(APPLICATION_JSON)
                    .content("""
                            {
                              "value": ""
                            }
                            """))
                    .andExpect(status().isBadRequest());

            ILoggingEvent event = logs.singleEvent("event", "request_validation.failed");

            assertThat(event.getLevel())
                    .isEqualTo(Level.WARN);

            assertThat(event.getFormattedMessage())
                    .isEqualTo("Request rejected");

            assertThat(keyValue(event, "event"))
                    .isEqualTo("request_validation.failed");
        }
    }

    private static Object keyValue(
            ILoggingEvent event,
            String key) {

        List<KeyValuePair> pairs = event.getKeyValuePairs();

        if (pairs == null) {
            return null;
        }

        return pairs.stream()
                .filter(pair -> key.equals(pair.key))
                .map(pair -> pair.value)
                .findFirst()
                .orElse(null);
    }

    /**
     * Security assertion for the application logging event itself.
     *
     * This intentionally does not inspect global console output because
     * framework/test diagnostics may legitimately contain request data.
     */
    private static void assertDoesNotExpose(
            ILoggingEvent event,
            String forbiddenValue) {

        assertThat(event.getFormattedMessage())
                .doesNotContain(forbiddenValue);

        Object[] arguments = event.getArgumentArray();

        if (arguments != null) {
            assertThat(arguments)
                    .extracting(String::valueOf)
                    .noneMatch(value -> value.contains(forbiddenValue));
        }

        List<KeyValuePair> pairs = event.getKeyValuePairs();

        if (pairs != null) {
            assertThat(pairs)
                    .extracting(pair -> String.valueOf(pair.value))
                    .noneMatch(value -> value.contains(forbiddenValue));
        }

        Map<String, String> mdc = event.getMDCPropertyMap();

        if (mdc != null) {
            assertThat(mdc.values())
                    .noneMatch(value -> value != null && value.contains(forbiddenValue));
        }
    }

    private static final class LogCapture implements AutoCloseable {

        private final Logger logger;
        private final ListAppender<ILoggingEvent> appender;

        private LogCapture(
                Logger logger,
                ListAppender<ILoggingEvent> appender) {

            this.logger = logger;
            this.appender = appender;
        }

        static LogCapture forLogger(Class<?> loggerType) {
            Logger logger = (Logger) LoggerFactory.getLogger(loggerType);

            ListAppender<ILoggingEvent> appender = new ListAppender<>();

            appender.setContext(logger.getLoggerContext());
            appender.start();

            logger.addAppender(appender);

            return new LogCapture(logger, appender);
        }

        ILoggingEvent singleEvent(
                String key,
                Object expectedValue) {

            List<ILoggingEvent> matchingEvents = appender.list.stream()
                    .filter(event -> hasKeyValue(event, key, expectedValue))
                    .toList();

            assertThat(matchingEvents)
                    .as(
                            "Expected exactly one log event with %s=%s",
                            key,
                            expectedValue)
                    .hasSize(1);

            return matchingEvents.getFirst();
        }

        @Override
        public void close() {
            logger.detachAppender(appender);
            appender.stop();
        }

        private static boolean hasKeyValue(
                ILoggingEvent event,
                String key,
                Object expectedValue) {

            List<KeyValuePair> pairs = event.getKeyValuePairs();

            if (pairs == null) {
                return false;
            }

            return pairs.stream()
                    .anyMatch(pair -> key.equals(pair.key)
                            && expectedValue.equals(pair.value));
        }
    }
}

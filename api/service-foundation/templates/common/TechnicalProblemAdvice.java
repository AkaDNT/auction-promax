package __PACKAGE_NAME__.adapter.in.web;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class TechnicalProblemAdvice extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(TechnicalProblemAdvice.class);

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
        org.springframework.http.HttpHeaders headers, org.springframework.http.HttpStatusCode status,
        WebRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "validation-failed", "The request is invalid.", path(request), correlation(request));
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
        org.springframework.http.converter.HttpMessageNotReadableException ex,
        org.springframework.http.HttpHeaders headers, org.springframework.http.HttpStatusCode status,
        WebRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "malformed-request", "The request is invalid.", path(request), correlation(request));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception exception, HttpServletRequest request) {
        log.atError().addKeyValue("event", "request_processing.failed")
            .addKeyValue("httpStatus", 500).addKeyValue("problemType", "internal-error")
            .log("Request processing failed");
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "internal-error",
            "The request could not be processed.", request.getRequestURI(), correlation(request));
    }

    private static ResponseEntity<Object> problem(HttpStatus status, String code, String detail,
        String path, String correlationId) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setType(java.net.URI.create("urn:auction-promax:problem:" + code));
        body.setTitle(status == HttpStatus.BAD_REQUEST ? "Request rejected" : "Internal server error");
        body.setInstance(java.net.URI.create(path));
        body.setProperty("code", code.replace('-', '_').toUpperCase(java.util.Locale.ROOT));
        body.setProperty("correlationId", correlationId);
        return ResponseEntity.status(status).body(body);
    }

    private static String path(WebRequest request) {
        return request instanceof ServletWebRequest servlet ? servlet.getRequest().getRequestURI() : "/";
    }

    private static String correlation(WebRequest request) {
        return request instanceof ServletWebRequest servlet ? correlation(servlet.getRequest()) : "unknown";
    }

    private static String correlation(HttpServletRequest request) {
        Object value = request.getAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME);
        return value instanceof String text ? text : "unknown";
    }
}

package com.auctionpromax.identityprofileservice.adapter.in.web.error;

import com.auctionpromax.identityprofileservice.adapter.in.web.correlation.CorrelationIdFilter;
import com.auctionpromax.identityprofileservice.ports.in.sample.IdempotencyKeyReusedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;

import java.net.URI;

@RestControllerAdvice
public class GlobalProblemDetailHandler extends ResponseEntityExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalProblemDetailHandler.class);

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return badRequest(
        "validation-failed",
        "Request validation failed",
        requestPath(request),
        correlationId(request));
  }

  @Override
  protected ResponseEntity<Object> handleHandlerMethodValidationException(
      HandlerMethodValidationException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return badRequest(
        "validation-failed",
        "Request validation failed",
        requestPath(request),
        correlationId(request));
  }

  @Override
  protected ResponseEntity<Object> handleHttpMessageNotReadable(
      HttpMessageNotReadableException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return badRequest(
        "malformed-request",
        "Malformed request",
        requestPath(request),
        correlationId(request));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ResponseEntity<ProblemDetail> handleConstraintViolation(
      ConstraintViolationException exception,
      HttpServletRequest request) {
    return problemResponse(
        HttpStatus.BAD_REQUEST,
        "validation-failed",
        "Request validation failed",
        "The request is invalid.",
        request.getRequestURI(),
        correlationId(request));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ProblemDetail> handleUnexpectedException(
      Exception exception,
      HttpServletRequest request) {
    log.atError()
        .addKeyValue("event", "request_processing.failed")
        .addKeyValue("httpStatus", HttpStatus.INTERNAL_SERVER_ERROR.value())
        .addKeyValue("problemType", "internal-error")
        .log("Request processing failed");
    return problemResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "internal-error",
        "Internal server error",
        "The request could not be processed.",
        request.getRequestURI(),
        correlationId(request));
  }

  @ExceptionHandler(IdempotencyKeyReusedException.class)
  ResponseEntity<ProblemDetail> handleIdempotencyKeyReused(
      IdempotencyKeyReusedException exception,
      HttpServletRequest request) {
    return problemResponse(HttpStatus.CONFLICT, "idempotency-key-reused", "Idempotency key reused", "The idempotency key was already used for a different request.", request.getRequestURI(), correlationId(request));
  }

  private ResponseEntity<Object> badRequest(
      String problemType,
      String title,
      String path,
      String correlationId) {
    String event = "malformed-request".equals(problemType)
        ? "request_malformed.failed"
        : "request_validation.failed";

    log.atWarn()
        .addKeyValue("event", event)
        .addKeyValue("httpStatus", HttpStatus.BAD_REQUEST.value())
        .addKeyValue("problemType", problemType)
        .log("Request rejected");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem(
            HttpStatus.BAD_REQUEST,
            problemType,
            title,
            "The request is invalid.",
            path,
            correlationId));
  }

  private ResponseEntity<ProblemDetail> problemResponse(
      HttpStatus status,
      String problemType,
      String title,
      String detail,
      String path,
      String correlationId) {
    return ResponseEntity.status(status)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem(status, problemType, title, detail, path, correlationId));
  }

  private ProblemDetail problem(
      HttpStatus status,
      String problemType,
      String title,
      String detail,
      String path,
      String correlationId) {
    ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, detail);
    problemDetail.setType(URI.create("urn:auction-promax:problem:" + problemType));
    problemDetail.setTitle(title);
    problemDetail.setInstance(URI.create(path));
    problemDetail.setProperty("correlationId", correlationId);
    problemDetail.setProperty("code", problemType.replace('-', '_').toUpperCase());
    return problemDetail;
  }

  private String requestPath(WebRequest request) {
    if (request instanceof ServletWebRequest servletWebRequest) {
      return servletWebRequest.getRequest().getRequestURI();
    }

    return "/";
  }

  private String correlationId(WebRequest request) {
    if (request instanceof ServletWebRequest servletWebRequest) {
      return correlationId(servletWebRequest.getRequest());
    }

    return "unknown";
  }

  private String correlationId(HttpServletRequest request) {
    Object value = request.getAttribute(
        CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME);

    return value instanceof String correlationId ? correlationId : "unknown";
  }
}

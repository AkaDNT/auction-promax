package com.auctionpromax.identityprofileservice.adapter.in.web.sample;
import com.auctionpromax.identityprofileservice.adapter.in.web.correlation.CorrelationIdFilter;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleCommand;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleUseCase;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
@Validated
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
@RequestMapping("/api/v1/identity-profile-samples")
public class CreateSampleController {
  private final CreateSampleUseCase useCase;
  public CreateSampleController(CreateSampleUseCase useCase) { this.useCase = useCase; }
  @PostMapping
  ResponseEntity<CreateSampleResponse> create(
      @RequestHeader("Idempotency-Key") @Size(min = 1, max = 128) @Pattern(regexp = "^[A-Za-z0-9._:-]+$") String key,
      @Valid @RequestBody CreateSampleRequest request,
      HttpServletRequest servletRequest) {
    String correlationId = (String) servletRequest.getAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME);
    var result = useCase.create(new CreateSampleCommand(key, request.purpose().name(), request.sampleRequestId(), correlationId));
    return ResponseEntity.status(HttpStatus.CREATED).body(new CreateSampleResponse(result.sampleId(), result.status()));
  }
}

package com.auctionpromax.identityprofileservice.adapter.in.web.baseline;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TechnicalValidationRequest(
    @NotBlank(message = "value must not be blank") @Size(max = 100, message = "value must not exceed 100 characters") String value) {

}

package __PACKAGE_NAME__.adapter.in.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TechnicalValidationRequest(
    @NotBlank(message = "value must not be blank")
    @Size(max = 100, message = "value must not exceed 100 characters")
    String value) {
}

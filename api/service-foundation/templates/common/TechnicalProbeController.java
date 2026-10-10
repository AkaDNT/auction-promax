package __PACKAGE_NAME__.adapter.in.web;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/technical-baseline")
public class TechnicalProbeController {
    private static final Logger log = LoggerFactory.getLogger(TechnicalProbeController.class);

    @PostMapping("/validate")
    @ResponseStatus(HttpStatus.OK)
    public TechnicalValidationResponse validate(@Valid @RequestBody TechnicalValidationRequest request) {
        int length = request.value().length();
        log.atInfo().addKeyValue("event", "technical_validation.accepted")
            .addKeyValue("valueLength", length).log("Technical validation accepted");
        return new TechnicalValidationResponse(true, length);
    }
}

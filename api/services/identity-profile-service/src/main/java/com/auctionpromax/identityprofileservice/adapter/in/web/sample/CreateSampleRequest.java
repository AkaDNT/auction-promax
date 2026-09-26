package com.auctionpromax.identityprofileservice.adapter.in.web.sample;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
public record CreateSampleRequest(@NotNull Purpose purpose, UUID sampleRequestId) { public enum Purpose { PHASE_0_BASELINE } }

package com.auctionpromax.identityprofileservice.configuration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(
    name = "auction.sample-flow.relay.scheduler-enabled",
    havingValue = "true")
public class SampleRelaySchedulingConfiguration {
}

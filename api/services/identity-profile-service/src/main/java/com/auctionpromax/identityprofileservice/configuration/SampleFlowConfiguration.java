package com.auctionpromax.identityprofileservice.configuration;

import com.auctionpromax.identityprofileservice.application.sample.CreateSampleService;
import com.auctionpromax.identityprofileservice.application.sample.LocalOutboxRelay;
import com.auctionpromax.identityprofileservice.application.sample.SampleEventConsumer;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.OutboxRelayUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.SampleEventHandler;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.LocalEventDeliveryPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SamplePayloadSerializerPort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;
import java.util.concurrent.ThreadLocalRandom;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class SampleFlowConfiguration {

  @Bean
  CreateSampleUseCase createSampleUseCase(
      SampleCommandPersistencePort persistencePort,
      SamplePayloadSerializerPort serializerPort,
      SampleCommandObservabilityPort observabilityPort) {
    return new CreateSampleService(persistencePort, serializerPort, observabilityPort);
  }

  @Bean
  OutboxRelayUseCase outboxRelayUseCase(
      OutboxRelayPersistencePort persistencePort,
      LocalEventDeliveryPort deliveryPort,
      OutboxRelayObservabilityPort observabilityPort) {
    return new LocalOutboxRelay(
        persistencePort,
        deliveryPort,
        observabilityPort,
        Clock.systemUTC(),
        baseBackoff -> ThreadLocalRandom.current().nextLong(
            Math.max(1, Math.min(31, baseBackoff / 4 + 1))));
  }

  @Bean
  SampleEventHandler sampleEventHandler(
      InboxPersistencePort persistencePort,
      InboxObservabilityPort observabilityPort) {
    return new SampleEventConsumer(
        persistencePort,
        observabilityPort,
        Clock.systemUTC());
  }
}

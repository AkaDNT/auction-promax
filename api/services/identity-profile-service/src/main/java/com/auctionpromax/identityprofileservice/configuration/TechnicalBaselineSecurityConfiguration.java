package com.auctionpromax.identityprofileservice.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
public class TechnicalBaselineSecurityConfiguration {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.ignoringRequestMatchers(
            "/internal/technical-baseline/**",
            "/api/v1/identity-profile-samples"))
        .authorizeHttpRequests(authorize -> authorize
            .requestMatchers(
                "/actuator/health/**",
                "/actuator/info",
                "/actuator/metrics/**",
                "/api/v1/identity-profile-samples",
                "/internal/technical-baseline/**")
            .permitAll()
            .anyRequest().denyAll())
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable);

    return http.build();
  }
}

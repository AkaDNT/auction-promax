package com.auctionpromax.frameworkleakfixture.application;

import org.springframework.jdbc.core.JdbcTemplate;

final class FrameworkLeakingApplication {

  private final JdbcTemplate jdbcTemplate;

  FrameworkLeakingApplication(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }
}

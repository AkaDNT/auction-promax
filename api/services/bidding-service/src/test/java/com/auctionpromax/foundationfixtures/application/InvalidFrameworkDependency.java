package com.auctionpromax.foundationfixtures.application;

import org.springframework.context.ApplicationContext;

final class InvalidFrameworkDependency {
    private final ApplicationContext applicationContext;
    InvalidFrameworkDependency(ApplicationContext applicationContext) { this.applicationContext = applicationContext; }
}

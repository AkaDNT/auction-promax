package com.auctionpromax.identityprofileservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Local PostgreSQL integration context. Maven runs this class only with
 * {@code -Pit-local}; it never shares development credentials or a database.
 */
@SpringBootTest
class IdentityProfileServiceApplicationLocalIT {

    @Test
    void contextLoads() {
    }
}

/**
 * HTTP error translation at the inbound adapter boundary.
 *
 * <p>{@code @ControllerAdvice} implementations here produce safe RFC 9457 Problem Details
 * responses and must not expose stack traces, secrets, or personal data.</p>
 */
package com.auctionpromax.identityprofileservice.adapter.in.web.error;

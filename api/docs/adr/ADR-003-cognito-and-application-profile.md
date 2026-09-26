# ADR-003: Cognito Credentials and Application-Owned Profile/Business Roles

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 3.1, 4.1, and 19

## Context

Credential lifecycle and platform-specific profile/role state have different ownership and security needs.

## Decision

Use Amazon Cognito User Pool for credentials, MFA, recovery, verification, and token lifecycle. Identity/Profile Service owns application-user mapping, profile, business roles, seller status, restrictions, and audit state.

## Consequences

Services validate Cognito-issued tokens but do not manage passwords. Phase 1 must define and test the authorization matrix and identity-to-profile mapping.

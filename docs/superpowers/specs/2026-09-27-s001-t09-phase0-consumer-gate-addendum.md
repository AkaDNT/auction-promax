# S001-T09 Phase 0 Consumer Gate Addendum

**Status:** Task 5 execution scope decision. This addendum amends the consumer-compatibility clauses in the S001-T09 snapshot design and implementation plan for the Phase 0 migration. It does not claim that web API compatibility has passed.

## Evidence and boundary

The current `api/` tree implements the Phase 0 `identity-profile-service` sample and an internal technical baseline route. `api/contracts/openapi/` contains only the registered sample OpenAPI. The web application calls product endpoints including `/auctions`, `/auction-categories`, and `/auth/...`; none is implemented or registered as a producer-owned contract in this monorepo. Sprint 001 explicitly places Cognito, registration/login, profile APIs, and auction capabilities after Phase 0. The blueprint assigns auction categories/lifecycle to future `auction-service` and authentication to Cognito/OIDC with application roles in `identity-profile-service`.

The migration therefore cannot validate those web calls against an authoritative producer contract in Phase 0. The frontend types are consumer expectations, not a producer contract. An external implementation, if discovered later, must be reviewed for ownership and canonical contract source before it is used by this gate.

## Amended Task 5 contract

- Keep the canonical `api/contracts/` producer registry and its existing lint, schema, fixture, governance, and N/N-1 checks.
- Implement changed-path classification and a single required `monorepo-required` aggregate. Contract-path changes select both API and web component jobs, so the web lint/build is exercised on the same PR merge result or push revision. This does **not** constitute consumer contract compatibility.
- Implement `.github/CODEOWNERS` and keep automated required checks distinct from optional owner approval.
- Record web consumer contract compatibility as `DEFERRED_NO_PRODUCER_CONTRACT` in Task 5 evidence. Do not create a web verifier that returns PASS without an authoritative producer contract.
- Task 5 can complete its Phase 0 CI/ownership scope after local gate verification and an exact staged-tree rehearsal. The commit message must describe CI and ownership only, not claim a consumer contract gate.

## Amended Task 6 and exit evidence

- Task 6 still runs hosted API-only, web-only, contract-only, docs-only, mixed, and component-failure cases. The contract-only case proves API producer validation, web lint/build selection, and a concluding aggregate. It cannot claim that a web contract break was detected.
- Replace the hosted negative web consumer incompatibility case with an explicit `DEFERRED_NO_PRODUCER_CONTRACT` entry in the private candidate report. Preserve the controlled component-failure negative case.
- The S001-T09 production exit report must state which producer/consumer coverage was executed and which was deferred. `D-005` remains OPEN until Task 7 reviews this amended evidence and the owner accepts the residual risk; a green `monorepo-required` check alone cannot close it.
- A later product API task must identify the producer for each web endpoint group, register or reference its authoritative versioned contract under agreed ownership, implement consumer fixtures for used endpoints and response shapes, and add a negative hosted contract PR before claiming web compatibility.

## CI revision model

- For `pull_request`, classify paths from event base/head through their merge base; run classifier code, API, and web against GitHub's PR merge revision.
- For `push`, classify from event `before` to `after`; run against the pushed tip. A new branch, zero/invalid SHA, missing Git object, or failed diff selects all applicable component jobs.
- Rename classification includes old and new paths; deletes classify the removed path. Unknown or shared CI paths select API and web. Docs-only changes may skip both component jobs while the aggregate still concludes.
- The required workflow has no workflow-level PR path filter. The aggregate accepts only successful required jobs and justified skipped jobs; failure, cancellation, missing outputs, and unjustified skip fail it.

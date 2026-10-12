# Phase 0 exit matrix

Status: **CANDIDATE_READY**. Sprint 002 and roadmap Phase 0 remain open pending owner technical acceptance, protected publication and actual exit/handoff. Frozen candidate/results are recorded in the [exact evidence dossier](../../../docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md); historical increments remain in the [completion log](../../../docs/superpowers/plans/2026-10-12-s002-phase0-completion-log.md).

## Authority and interpretation

Requirement IDs follow the deliverable/exit order in the amended [blueprint Phase 0](../Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md). The approved [S002 design](../../../docs/superpowers/specs/2026-10-05-s002-service-foundation-design.md) defines five core services; supporting Lambda and later optional services retain their later-phase obligations. ADR-026/027 define the revised marketplace boundaries. No bidding, billing, entitlement or authentication product behavior is required here.

Runtime evidence must bind to the frozen implementation candidate. A PR's checked-out execution SHA is recorded separately from its candidate SHA. Source provenance COMMITTED means delivered source exists in that candidate; it does not establish protected publication. Current rows bind to the final frozen candidate and separately recorded CI execution; technical PASS is not owner acceptance. The validator checks consistency and evidence structure; actual GitHub execution, artifacts, runtime logs and applicability still require independent review and owner acceptance.

## Requirement inventory

| ID | Requirement | Scope | Current result |
| --- | --- | --- | --- |
| D01 | ADRs | architecture-decisions | APPROVED_DECISION |
| D02 | Monorepo | repository | PASS |
| D03 | Spring Boot service template | auction-service, bidding-service, billing-service, realtime-gateway | PASS |
| D04 | Java 21 baseline | identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway | PASS |
| D05 | Hexagonal architecture | identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway | PASS |
| D06 | OpenAPI/event contracts | shared-contracts | PASS |
| D07 | Testcontainers | identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway | PASS |
| D08 | Idempotency skeleton | identity-profile-service | PASS |
| D09 | Outbox/inbox skeleton | identity-profile-service | PASS |
| D10 | Flyway | identity-profile-service, auction-service, bidding-service, billing-service | PASS |
| D11 | Structured logging | identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway | PASS |
| D12 | Architecture tests | identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway | PASS |
| E01 | Independent builds | identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway | PASS |
| E02 | No cross-database access | identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway | PASS |
| E03 | Identity sample request/event trace | identity-profile-service | PASS |

Idempotency/outbox/inbox and E03 refer to the Identity technical sample. D07 includes canonical PostgreSQL Testcontainers for four relational services and gateway's actual no-datastore suite. E02 requires four relational isolation results plus explicit NOT_APPLICABLE_GATEWAY; gateway is not silently omitted. D11/D12 cover all five services. Shared OpenAPI/event contracts are the Phase 0 technical sample contracts, not unimplemented product APIs.

## Inherited gap reconciliation

The [Sprint 001 incomplete-work record](../sprints/SPRINT_001.md) and [production coverage](../PRODUCTION_COVERAGE.md) remain historical sources.

| Gap | Disposition | Owning scope and authority |
| --- | --- | --- |
| Service-template and revised database mapping | RESOLVED_PHASE0 technical proof | D03/D04/D05/D07/D10/D11/D12/E01/E02; final frozen rehearsal is verified; protected publication remains pending. |
| Authentication/authorization | OPEN_LATER_PHASE | Blueprint Phase 1 and ADR-003; technical allowlists are not Cognito/product authentication. |
| Product functions | OPEN_LATER_PHASE | Blueprint Phases 2–7, ADR-026/027. Auction-item payment, escrow, payout and monetary wallet remain excluded V1 capabilities, not promised future delivery. |
| Producer/consumer compatibility | DEFERRED_NO_PRODUCER_CONTRACT | Approved [consumer addendum](../../../docs/superpowers/specs/2026-09-27-s001-t09-phase0-consumer-gate-addendum.md); later producer contracts own this proof. No compatibility PASS. |
| Platform/production operations | OPEN_LATER_PHASE | Blueprint Phases 1/9–12: platform foundation, collectors/alerts, managed deployment/backup/restore/rollback, multi-account controls and reliability drills. Local cleanup runbooks do not prove production recovery. |
| Security findings | RESIDUAL_FINDINGS | Fresh frozen-revision inventories/policy passed, retaining summed 20 MEDIUM service observations (not unique vulnerabilities), zero CRITICAL/HIGH/UNKNOWN and the one exact historical false positive. Existing MEDIUM findings are not hidden or accepted by Sprint closure. Historical BLOCKED policy stays historical; actual current policy must be recorded separately. |

## Acceptance and publication

Owner technical acceptance: PENDING. Protected technical publication: PENDING. Actual Phase 0 exit/handoff confirmation: PENDING (T07). Technical matrix validation passes CANDIDATE_READY while Phase 0 remains open; `--require-exit` must fail until the verified publication record is complete. This record neither permits merge nor advances the authoritative phase.

## Machine-readable evidence

```json
{
  "schemaVersion": 1,
  "phase": 0,
  "status": "CANDIDATE_READY",
  "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
  "implementationTree": "63aa3ee5dd5cea3870e94bea92c28951a8a76026",
  "requirements": [
    {
      "requirementId": "D01",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "architecture-decisions"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "DECISION",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md"
        }
      ],
      "result": "APPROVED_DECISION",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D02",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "repository"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927293"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D03",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "auction-service",
        "bidding-service",
        "billing-service",
        "realtime-gateway"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "SOURCE",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D04",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service",
        "auction-service",
        "bidding-service",
        "billing-service",
        "realtime-gateway"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D05",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service",
        "auction-service",
        "bidding-service",
        "billing-service",
        "realtime-gateway"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D06",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "shared-contracts"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "CONTRACT",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D07",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service",
        "auction-service",
        "bidding-service",
        "billing-service",
        "realtime-gateway"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D08",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D09",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D10",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service",
        "auction-service",
        "bidding-service",
        "billing-service"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D11",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service",
        "auction-service",
        "bidding-service",
        "billing-service",
        "realtime-gateway"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "D12",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service",
        "auction-service",
        "bidding-service",
        "billing-service",
        "realtime-gateway"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "E01",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service",
        "auction-service",
        "bidding-service",
        "billing-service",
        "realtime-gateway"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "E02",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service",
        "auction-service",
        "bidding-service",
        "billing-service",
        "realtime-gateway"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        },
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    },
    {
      "requirementId": "E03",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "scope": [
        "identity-profile-service"
      ],
      "implementationRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "evidence": [
        {
          "kind": "RUNTIME",
          "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
          "reference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
        }
      ],
      "result": "PASS",
      "ownerAcceptanceReference": null
    }
  ],
  "services": [
    {
      "serviceId": "identity-profile-service",
      "sourceKind": "COMMITTED",
      "build": "PASS",
      "isolation": "PASS",
      "http": "PASS",
      "candidateRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "executionRevision": "13c73e27a145add6eef3e49d38746a683137473c",
      "evidenceReference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
    },
    {
      "serviceId": "auction-service",
      "sourceKind": "COMMITTED",
      "build": "PASS",
      "isolation": "PASS",
      "http": "PASS",
      "candidateRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "executionRevision": "13c73e27a145add6eef3e49d38746a683137473c",
      "evidenceReference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
    },
    {
      "serviceId": "bidding-service",
      "sourceKind": "COMMITTED",
      "build": "PASS",
      "isolation": "PASS",
      "http": "PASS",
      "candidateRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "executionRevision": "13c73e27a145add6eef3e49d38746a683137473c",
      "evidenceReference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
    },
    {
      "serviceId": "billing-service",
      "sourceKind": "COMMITTED",
      "build": "PASS",
      "isolation": "PASS",
      "http": "PASS",
      "candidateRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "executionRevision": "13c73e27a145add6eef3e49d38746a683137473c",
      "evidenceReference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
    },
    {
      "serviceId": "realtime-gateway",
      "sourceKind": "COMMITTED",
      "build": "PASS",
      "isolation": "NOT_APPLICABLE_GATEWAY",
      "http": "PASS",
      "candidateRevision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
      "executionRevision": "13c73e27a145add6eef3e49d38746a683137473c",
      "evidenceReference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490"
    }
  ],
  "consumerCompatibility": "DEFERRED_NO_PRODUCER_CONTRACT",
  "inheritedGaps": [
    {
      "gapId": "service-template",
      "source": "api/docs/sprints/SPRINT_001.md",
      "mandatoryPhase0": true,
      "targetPhase": 0,
      "disposition": "RESOLVED_PHASE0",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "evidenceReference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
    },
    {
      "gapId": "authentication-authorization",
      "source": "api/docs/sprints/SPRINT_001.md",
      "mandatoryPhase0": false,
      "targetPhase": 1,
      "disposition": "OPEN_LATER_PHASE",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "evidenceReference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
    },
    {
      "gapId": "product-functions",
      "source": "api/docs/sprints/SPRINT_001.md",
      "mandatoryPhase0": false,
      "targetPhase": 2,
      "disposition": "OPEN_LATER_PHASE",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "evidenceReference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
    },
    {
      "gapId": "producer-consumer-contracts",
      "source": "api/docs/sprints/SPRINT_001.md",
      "mandatoryPhase0": false,
      "targetPhase": 1,
      "disposition": "DEFERRED_NO_PRODUCER_CONTRACT",
      "authority": "docs/superpowers/specs/2026-09-27-s001-t09-phase0-consumer-gate-addendum.md",
      "evidenceReference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
    },
    {
      "gapId": "production-platform-operations",
      "source": "api/docs/sprints/SPRINT_001.md",
      "mandatoryPhase0": false,
      "targetPhase": 1,
      "disposition": "OPEN_LATER_PHASE",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "evidenceReference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
    },
    {
      "gapId": "security-findings",
      "source": "api/docs/sprints/SPRINT_001.md",
      "mandatoryPhase0": false,
      "targetPhase": 0,
      "disposition": "RESIDUAL_FINDINGS",
      "authority": "api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md",
      "evidenceReference": "docs/superpowers/plans/2026-10-12-s002-frozen-candidate-evidence.md"
    }
  ],
  "security": {
    "executionState": "PASS",
    "policyState": "PASS",
    "revision": "8a6fd2eca7a8ac0da27c98fe71bad051592a3673",
    "evidenceReference": "https://github.com/AkaDNT/auction-promax/actions/runs/38256927490",
    "counts": {
      "CRITICAL": 0,
      "HIGH": 0,
      "MEDIUM": 20,
      "LOW": 0,
      "UNKNOWN": 0
    }
  },
  "ownerAcceptance": null,
  "publication": null
}
```

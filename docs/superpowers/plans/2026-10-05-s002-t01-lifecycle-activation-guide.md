# T01 — Lifecycle an toàn và protected Sprint 002 activation: hướng dẫn tự chứa

> Execute task-by-task using the owner-approved execution method; each task requires its specified review and evidence gates. Steps use checkbox (`- [ ]`) syntax for tracking. Agent-specific skills are execution-environment instructions, not project dependencies.

**Goal:** Chứng minh lifecycle validator chặn phase/status sai, bảo toàn Sprint 001, và chỉ ghi nhận Sprint 002 active sau các gate owner/publication.
**Architecture:** Tách historical closeout khỏi current lifecycle; dùng module validation thuần, adapter Markdown nghiêm ngặt và CI gate luôn chạy. Không tạo framework quản lý sprint tổng quát.
**Tech Stack:** Node built-in modules và các workflow/toolchain hiện hữu; không thêm thư viện runtime.
**Spec:** [Design đã duyệt](../specs/2026-10-05-s002-service-foundation-design.md).
**Parent plan:** [Plan Sprint 002](2026-10-05-s002-phase0-exit-and-service-foundation.md).

Status: T01_LOCAL_AUDIT_GREEN; independent scoped review and trusted local worktree/history secret scan passed on 2026-10-06. See [scan execution log](2026-10-06-s002-gitleaks-path-compatibility-log.md). Candidate commit/tree identity, activation approval and publication remain pending. The source appendix remains the original baseline snapshot, not the current implementation.

## Global Constraints

- Worktree đọc/lập plan: `D:/projects/auction-promax/.worktrees/s002-design`, branch `work/s002-foundation-design`.
- Published baseline PR17: `9a625b96e97cac9900046a89131184e2d4427402`; không khẳng định đây vẫn là remote tip hiện tại nếu chưa read-back.
- Design và toàn bộ parent plan/T01 scope được owner duyệt để thực thi ngày 2026-10-05. Capacity là 72–114 giờ engineering + 14–22 giờ reserve (envelope 86–136h), tối đa bốn engineering weeks; re-estimate bắt buộc sau T03 và STOP/rebaseline nếu vượt 136h hoặc T07 không khả thi. Execution method: direct sequential implementation trong isolated worktree với independent scoped/final review.
- Baseline LF/CRLF harness repair được owner cho phép riêng; phải rerun baseline GREEN trước T01 RED/GREEN. Activation approval CHƯA CẤP; merge authorization riêng CHƯA CẤP cho từng PR; không thực hiện Phase 1 trong Sprint 002.
- T01 không tạo service, sửa business/runtime, reset DB, chấp nhận vulnerability, đổi branch protection hoặc chuyển Phase 1.
- Approval thiết kế không phải approval activation; merge luôn cần quyền riêng.
- Scope `S002-LIFECYCLE-01` phải GREEN trước hoặc cùng thay đổi activation.
- Local fixtures chỉ chứng minh consistency, không chứng minh GitHub run/owner approval là thật. Read-back là gate riêng.
- CRLF được normalize ở parser; không dùng normalize để che duplicate field hay sai giá trị.

## Review Focus

1. Sprint-only phase mutation bị lọt → regression trực tiếp trên old helper và new parser.
2. Sprint 002 active làm mất Sprint 001 closure proof → historical snapshot riêng và toàn bộ T09 fixtures.
3. Docs-only PR có lifecycle sai nhưng aggregate xanh → always-run lifecycle job và test actual aggregate command.
4. Missing/duplicate field hoặc sai heading bị parser chọn nhầm → parser fixtures fail-closed.
5. Published activation bị khai trước merge → candidate/pending state riêng và exact postmerge read-back.

## 1. Context hiện tại, không cần mở repository

Sprint 001 đã COMPLETED/PUBLISHED_VERIFIED, Phase 0 vẫn mở. PR16 published technical outcome, PR17 sửa publication bookkeeping, không triển khai Sprint 002.

Các giá trị đang được tài liệu ghi nhận:

| Trường | Giá trị |
| --- | --- |
| Delivery current sprint | SPRINT-001 |
| Delivery current phase | Phase 0 |
| Sprint 001 publication merge | ab2d8256b25919cc7479fa6d6aad7a41eb964f83 |
| Sprint 001 review date | 2026-10-05 |
| Index current task | Phase 0 remaining-gate assessment |
| Sprint 002 candidate ready | NO |
| Consumer compatibility | DEFERRED_NO_PRODUCER_CONTRACT |
| Release policy | BLOCKED |

Phụ lục cuối tài liệu chứa **đủ từng dòng của bảy file context trực tiếp**: validator T09, Delivery, Index, T08 evidence, workflow monorepo, classifier/aggregate module và toàn bộ tests required-check. Chúng không phải chỉ là pseudocode. Các module mới mô tả ở đây chưa được viết.

### 1.1 Old helper thực sự bỏ sót gì?

Trong `validateSprintLifecycle(sprint, delivery, index, evidence)`, đầu hàm chỉ kiểm tra:

```javascript
if (!delivery.includes('S001-T09 decision traceability: 20/20 approved') ||
  !/^- Current roadmap phase: Phase 0\b/m.test(delivery) ||
  !/^- Roadmap phase: Phase 0\b/m.test(index)) return false;
```

Không có kiểm tra phase của `sprint`. Vì vậy fixture có Sprint Phase 1 nhưng Delivery/Index Phase 0 có thể được accepted. Cần RED bằng assertion **bị thất bại vì helper trả true**, không phải module-not-found.

Tiếp đó helper đòi ba status đều COMPLETED để xác nhận closeout Sprint 001. Nếu đổi Delivery/Index current sang Sprint 002 IN_PROGRESS, old helper sẽ reject lịch sử đúng. Không sửa bằng cách cho phép status tùy ý; phải tách historical state khỏi current state.

### 1.2 Old CI không bảo vệ lifecycle docs-only

Classifier hiện coi `api/docs/`, `web/docs/`, `docs/` là docs-only, bỏ qua API/web. Aggregate chỉ phụ thuộc classify/api/web và chưa chạy T09 closeout hoặc S002 lifecycle. Vì vậy việc chạy test cục bộ chưa đủ để biến lifecycle thành protected activation gate.

T01 phải đưa lifecycle vào `monorepo-required` ngay, không đợi T03 service matrix. Đây là dependency cần thiết để thực hiện mục tiêu activation của design, không thay tên required check.

## 2. Files chính xác và trách nhiệm

| Action | File | Trách nhiệm |
| --- | --- | --- |
| Modify | api/scripts/decisions/Test-S001-T09-Decisions.mjs | Giữ ADR/matrix/fixture; sửa phase regression và chọn historical context đúng |
| Create | api/scripts/decisions/SprintLifecycle.mjs | Pure validation current S001/S002 và parser |
| Create | api/scripts/decisions/Test-S002-Lifecycle.mjs | Fixture runner + --repository CLI |
| Create | api/docs/sprints/SPRINT_002.md | Sprint context/backlog/approvals/activation-pending |
| Create | api/docs/sprints/S002_REVIEW_EVIDENCE.md | Activation approvals/evidence; runtime acceptance chưa thực hiện |
| Modify | api/docs/DELIVERY_STATE.md | Current Position và historical Sprint 001 snapshot |
| Modify | api/docs/SPRINT_INDEX.md | Current/candidate metadata và historical snapshot |
| Modify | .github/workflows/monorepo-verification.yml | Always-run lifecycle job; aggregate dependency |
| Modify | scripts/migration/MonorepoRequiredChecks.mjs | evaluateAggregate thêm lifecycleResult |
| Modify | scripts/migration/Test-MonorepoRequiredChecks.mjs | Actual job/aggregate failure regressions |

Không cần chỉnh coverage maturity ở T01. Không tạo exit-matrix PASS hay thay review Sprint 001. Design/parent plan chỉ chỉnh nếu contract T01 cần đối soát.

## 3. State contract: tránh lẫn chuẩn bị với active

| State | Current sprint / phase | Ý nghĩa |
| --- | --- | --- |
| BASELINE | S001 / Phase 0 | Historical completed S001, chưa S002 approval |
| PLANNED | S001 / Phase 0 | S002 candidate PLANNED; chưa activation approval |
| ACTIVATION_PENDING | S001 / Phase 0 | S002 activation approved locally, publication pending; không chạy T02 |
| ACTIVE | S002 / Phase 0 | Activation prerequisite revision đã merged và hai required push checks SUCCESS |
| CLOSEOUT_PENDING | S002 / Phase 0 | T06/T07 sử dụng sau; không phải T01 completion shortcut |
| COMPLETE/Phase 1 | Không được T01 repository mode accept | Chỉ mở support sau T07 có đủ exit/transition evidence |

Chọn flow **before activation** thay vì ghi IN_PROGRESS ngay trong PR chưa merge. Nó đáp ứng design “before or atomically with activation” và không giả postmerge facts.

Flow đề xuất: approved plan/capacity/method → RED/GREEN → prerequisite activation PR (current vẫn S001) → owner merge → verify exact activation merge/checks → separate factual activation-record PR (references earlier merge) → owner merge/checks/read-back → T01 delivered active. Nếu factual follow-up cần thêm trạng thái pending, phải ghi rõ trạng thái ấy; không tự biết future self-merge SHA.

### Publication semantics và allowed tuples

`sprint.publicationStatus` chỉ nói publication của **technical closeout Sprint 002**, không nói publication activation. T01 chỉ cho phép giá trị `NOT_PUBLISHED` ở field này. Các giá trị closeout `PENDING_PROTECTED_PR`/`PUBLISHED_VERIFIED` thuộc T07 và phải bị T01 reject, kể cả activation đã verified. Không đổi semantics historical Sprint 001.

`exitEvidence.activationPublication` chỉ nói publication của **activation prerequisite/evidence**. Enum `status` là `PENDING_PROTECTED_PR` hoặc `PUBLISHED_VERIFIED`; absence biểu diễn bằng `null`, không bằng enum tự chế `none`. Khi pending, merge/tree chưa có là `null`, checks là `[]`; PR có thể `null` trước khi tạo hoặc canonical URL sau khi tạo. Khi verified, mọi identity/PR/check field bên dưới bắt buộc đầy đủ. Object pending không được chứa verified merge/tree/check claims.

| Lifecycle state | S002 sprint status | Sprint closeout publication | activationPublication |
| --- | --- | --- | --- |
| BASELINE | S002 document absent | Không có S002 field | null |
| PLANNED | PLANNED | NOT_PUBLISHED | null |
| ACTIVATION_PENDING | ACTIVATION_PENDING | NOT_PUBLISHED | PENDING_PROTECTED_PR hoặc PUBLISHED_VERIFIED prerequisite; current vẫn S001 cho tới factual activation record |
| ACTIVE | IN_PROGRESS | NOT_PUBLISHED | PUBLISHED_VERIFIED prerequisite; current S002 |
| CLOSEOUT_PENDING | IN_PROGRESS | NOT_PUBLISHED | PUBLISHED_VERIFIED; support thuộc T06/T07, T01 chưa accept state này |
| COMPLETE | T07-owned | T07-owned | Verified; T01 reject completion |

Pending activation có thể có prerequisite đã verified nhưng factual active-record vẫn chưa publish; điều này không có nghĩa Sprint closeout published. T01 done vẫn cần actual active-record merge/check read-back riêng, không lấy prerequisite check thay thế. Mọi tuple ngoài bảng, unknown enum hoặc alias field `exitEvidence.publication` đều reject. Thêm fixtures: ACTIVE + sprint publication PUBLISHED_VERIFIED fail; PLANNED + activation evidence verified fail; ACTIVE + activation pending fail; pending có fabricated merge fail; unknown publication enum fail; activation verified + sprint NOT_PUBLISHED valid khi đủ approval/current state.

Mỗi PR cần merge authorization riêng. T01 chỉ complete khi authoritative current S002/Phase0 được published và read-back. Không tự chuyển Phase1 để “thử”.

## 4. Metadata/parser contract

Parser chỉ đọc section được chỉ định, không quét cả tài liệu bằng regex lấy match đầu tiên. Field có đúng một occurrence; thiếu/duplicate/unknown enum reject với error code. Chỉ cho phép section heading cố định, không parse theo câu văn hoặc suy ra approval từ checkbox.

Các module interface dự kiến:

```javascript
export function parseLifecycleDocuments({
  sprintMarkdown, deliveryMarkdown, indexMarkdown, evidenceMarkdown,
}) {
  // Produces { state, errors }; implement in T01 after RED.
}

export function validateLifecycle({
  sprint, delivery, index, exitEvidence,
}) {
  // Input is parsed records, NOT raw Markdown strings.
  // Produces { valid: boolean, errors: string[] }.
}
```

Dữ liệu bắt buộc của parsed records:

```javascript
const contractExample = {
  sprint: {
    id: 'SPRINT-002',
    deliveryPhase: 0,
    status: 'PLANNED', // PLANNED | ACTIVATION_PENDING | IN_PROGRESS
    publicationStatus: 'NOT_PUBLISHED',
  },
  delivery: {
    currentSprint: 'SPRINT-001',
    currentPhase: 0,
    currentStatus: 'COMPLETED',
  },
  index: {
    currentSprint: 'SPRINT-001',
    currentPhase: 0,
    currentStatus: 'COMPLETED',
  },
  exitEvidence: {
    kind: 'SPRINT_ACTIVATION', // NOT Phase0 exit evidence
    designApproval: null,
    planApproval: null,
    capacityApproval: null,
    executionApproval: null,
    activationApproval: null,
    activationPublication: null,
  },
};
```

Tên `exitEvidence` giữ interface parent plan nhưng T01 chỉ consume activation evidence; không nhập Phase0 exit acceptance giả.

Approval object: `{owner, date, scope, reference}`; owner exact `AkaDNT (Project Owner / Repository Owner)`, date calendar-valid YYYY-MM-DD, scope một trong DESIGN/IMPLEMENTATION_PLAN/CAPACITY/EXECUTION_METHOD/SPRINT_ACTIVATION; reference tới recorded owner decision. Capacity additionally records effective hours and planned dates from owner decision; execution records chosen method. Không tự điền khi user chưa quyết định.

Verified activationPublication object: `{status, merge, tree, pr, checks}`; SHA/tree full 40 lowercase hex, PR canonical repository URL, exactly two checks records `{name, conclusion, runUrl, commit}`. Check names exact existing required names, conclusion SUCCESS, commit equals referenced merge, run URL canonical. Zero SHA, duplicate check/name, cross-repo URL, unexpected check, check wrong revision reject. Metadata checker không gọi network và không thể tự xác thực owner hoặc tree. `merge` references the earlier prerequisite merge, never this record's future self-merge.

Error codes chốt: INPUT_INVALID, FIELD_MISSING, FIELD_DUPLICATE, STATE_UNKNOWN, PHASE_MISMATCH, CURRENT_SPRINT_MISMATCH, STATUS_MISMATCH, APPROVAL_MISSING, APPROVAL_SCOPE_INVALID, APPROVAL_DATE_INVALID, PUBLICATION_PENDING, PUBLICATION_IDENTITY_INVALID, REQUIRED_CHECK_MISSING, REQUIRED_CHECK_FAILED, REQUIRED_CHECK_REVISION_MISMATCH, PREMATURE_PHASE_ADVANCEMENT.

Markdown candidate preview dưới đây là **chưa approved**, không được copy thành activation approval:

```markdown
# SPRINT-002 — Phase 0 Service Foundation and Exit
## Sprint Context
- Sprint ID: SPRINT-002
- Roadmap phase: Phase 0 — Architecture and Java engineering foundation
- Sprint status: PLANNED
- Publication status: NOT_PUBLISHED
- Plan approval: PENDING_OWNER_DECISION
- Capacity approval: PENDING_OWNER_DECISION
- Execution method approval: PENDING_OWNER_DECISION
- Activation approval: PENDING_OWNER_DECISION
```

Current Delivery/Index không đổi current sprint ở PLANNED/ACTIVATION_PENDING. Khi publication prerequisite verified, current fields đổi cùng một reviewed patch và có activation evidence link. Field publication hiện tại S001 chuyển vào historical section, không để stale PR16 merge bị đọc thành S002 activation merge.

## 5. Bảo toàn lịch sử T09, không làm lỏng old gate

Thêm `## Sprint 001 historical lifecycle` vào Delivery/Index khi current phải thay đổi. Nội dung snapshot lấy nguyên canonical S001 fields đang có, gồm Phase0, completed/publication status, PR16 merge, date, traceability và task context. Không dựng current fictitious values để vượt test.

Tách adapter chọn section khỏi old historical assertions:

- Nếu canonical current là S001: dùng current sections và existing S001 files.
- Nếu canonical current là S002: require đúng một historical section, validate old closeout against historical sections + existing S001 sprint/evidence; validate current bằng S002 module.
- Missing history hoặc changed PR16/date/approval/provenance vẫn fail.
- Historical Sprint1 Phase0 không phải mismatch khi future current Phase1; current Phase1 bị T01 reject cho tới khi T07 contract implemented.
- Không xóa old pending/published fixtures hoặc required T09 task acceptance/matrix/ADR checks.

Đây không phải cho phép `Phase 0|Phase 1` bằng regex đơn giản. Context selection cần current-sprint agreement; nếu Delivery nói S001 nhưng Index nói S002 thì fail trước khi chọn lịch sử.

## 6. TDD từng bước và expected results

- [x] **Step 1 — Preflight read-only.** Read branch/HEAD/status/worktree và hash seven context files. Không stash/overwrite tự động. Xác minh baseline ancestry; nếu default đã có mới, trình reviewed delta applicability trước khi tiếp tục.
- [x] **Step 2 — Baseline suite.** Ban đầu FAIL do CRLF-sensitive negative-fixture anchors; sau baseline-harness repair được owner cho phép, chạy lại T09 complete/closeout GREEN và ghi trong execution ledger. Không tính lỗi harness ban đầu là T01 RED.
- [x] **Step 2a — Execution prerequisites (STOP gate).** Owner approval ngày 2026-10-05: full parent plan/T01 scope, capacity 72–114h + 14–22h reserve (86–136h envelope), maximum four engineering weeks, re-estimate/STOP checkpoint after T03, direct sequential implementation with independent scoped/final review. Reference: parent-plan “Owner execution decision” section and private SDD execution ledger. Design approval được reference lại, không xin lại. Activation approval/merge authorization vẫn chưa cấp.
- [x] **Step 3 — Old-helper regression RED.** Thêm roadmap phase Phase0 vào valid fixtures; mutation chỉ đổi Sprint→Phase1. Assert rejection; old helper accepted the mutation and the assertion failed as intended. Fixture-anchor check passed.
- [x] **Step 4 — Minimal historical fix GREEN.** Old helper requires exactly one Sprint roadmap phase0. Missing/duplicate Sprint phase negative cases and full T09/ADR/matrix closeout suite now pass; no matrix/ADR logic changed.
- [x] **Step 5 — Parser fixtures RED.** Strict-section, missing/duplicate, CRLF, malformed values, unknown enums, missing approval field and history tampering fixtures were added before parser hardening; parser behavior was then made fail-closed.
- [x] **Step 6 — Pure validator fixtures RED.** Sprint-only Phase 1, missing ACTIVE approvals, current-ID disagreement, wrong required-check SHA, bad publication tuples and premature phase transition fixtures are implemented.
- [x] **Step 7 — Minimal parser/validator GREEN.** Pure parser/validator implemented with exact fields, duplicate detection, fixed sections, typed lifecycle tuple checks, no network or IO side effects.
- [x] **Step 8 — Historical routing tests.** S001 closeout suite remains GREEN; parser ACTIVE fixture requires intact S001 historical fields and rejects missing/tampered history. Canonical current-S002 routing will be exercised when the current record changes under a separately approved activation.
- [x] **Step 9 — Candidate docs.** Added S002 plan and evidence records with approved execution scopes, activation explicitly unapproved, S001 historical snapshots, and repository mode GREEN for PLANNED/current S001.
- [x] **Step 10 — CI RED/GREEN.** Always-run lifecycle job is a `monorepo-required` dependency; actual aggregate command and helper reject lifecycle failure/cancelled/skipped/empty and retain strict component semantics.
- [ ] **Step 11 — Local audit/review.** Local tests/review and trusted secret scan are GREEN; see [scan execution log](2026-10-06-s002-gitleaks-path-compatibility-log.md). Gitleaks 8.30.0 worktree/history scans returned exit 0, zero findings, with unchanged source fingerprints. No execution-policy change or PATH scanner was used. Candidate implementation commit/tree has not been recorded, so this step remains unchecked; no Maven/runtime scan or hosted publication is claimed.
- [ ] **Step 12 — Owner activation approval (STOP gate).** Sau local GREEN/audit/review, trình exact candidate scope/evidence và xin riêng Sprint activation approval trước protected prerequisite PR. Revalidate execution prerequisites từ Step 2a; không collect chúng lần đầu ở đây. Approval references có thể chung một owner response chỉ nếu response explicit từng scope; activation approval không tự authorize merge.
- [ ] **Step 13 — Protected prerequisite PR.** Current remains S001; lifecycle correction + pending activation metadata published. PR checks, protection freshness and separate owner merge authorization required.
- [ ] **Step 14 — Actual published verification.** Validate merge parents/tree/default and push checks; candidate PR check is not actual merge evidence.
- [ ] **Step 15 — Factual active record.** References verified prerequisite merge/run records; protected follow-up updates current S002/Phase0. Review/authorization/PR and actual postmerge gates again. Only then T01 done and T02 allowed.

Concrete assertions to put in test file (synthetic objects, not actual approval):

```javascript
const result = validateLifecycle(validPlannedFixture);
assert.equal(result.valid, true);
const badPhase = structuredClone(validPlannedFixture);
badPhase.sprint.deliveryPhase = 1;
assert.equal(validateLifecycle(badPhase).valid, false);
assert.ok(validateLifecycle(badPhase).errors.includes('PHASE_MISMATCH'));
const noApproval = structuredClone(validActiveFixture);
noApproval.exitEvidence.activationApproval = null;
assert.equal(validateLifecycle(noApproval).valid, false);
assert.ok(validateLifecycle(noApproval).errors.includes('APPROVAL_MISSING'));
const wrongRun = structuredClone(validActiveFixture);
wrongRun.exitEvidence.activationPublication.checks[0].commit = '4'.repeat(40);
assert.ok(validateLifecycle(wrongRun).errors.includes('REQUIRED_CHECK_REVISION_MISMATCH'));
```

Fixture constructor `validActiveFixture` must define all five approval scopes and real-shaped synthetic publication records; no missing property default may magically pass.

## 7. CI contract chi tiết

New always-run `lifecycle` job has no changed-path `if`, runs on ubuntu-24.04, timeout 10 minutes, checkout same PR merge/push revision with existing pinned checkout action and persist-credentials false. Set up Node using existing pin and `api/.nvmrc`. Run:

```text
node api/scripts/decisions/Test-S002-Lifecycle.mjs
node api/scripts/decisions/Test-S001-T09-Decisions.mjs --require-complete --require-closeout
node api/scripts/decisions/Test-S002-Lifecycle.mjs --repository
```

Shell exits nonzero immediately on any command failure. No lifecycle job `continue-on-error`; no workflow path filter.

Aggregate adds `needs: [classify, api, web, lifecycle]`, `LIFECYCLE_RESULT` env, and requires `LIFECYCLE_RESULT === "success"`. Keep `always()`, name `monorepo-required` and existing strict api/web selected/skip semantics. Extend exported `evaluateAggregate` consistently with inline actual workflow command.

Actual-command fixtures must include:
- docs-only api/web skipped + lifecycle success → exit0;
- same input + lifecycle failure/cancelled/skipped/empty → exit1;
- api required but skipped → exit1 even lifecycle success;
- classify failure → exit1;
- deleting lifecycle job/dependency/guard → repository workflow contract FAIL.

Unknown/malformed lifecycle state cannot be accepted because docs were “only text”.

## 8. Command inventory và cách đọc exit

Đây là future commands; tools mới chưa tồn tại. Chạy từ implementation checkout đã được approved, không tự thực thi vào primary.

```powershell
node api/scripts/decisions/Test-S001-T09-Decisions.mjs --require-complete --require-closeout
if ($LASTEXITCODE -ne 0) { throw 'T09 baseline/regression failed' }

node api/scripts/decisions/Test-S002-Lifecycle.mjs
if ($LASTEXITCODE -ne 0) { throw 'S002 fixture suite failed' }

node api/scripts/decisions/Test-S002-Lifecycle.mjs --repository
if ($LASTEXITCODE -ne 0) { throw 'Canonical lifecycle failed' }

npm.cmd --prefix api/contracts ci
if ($LASTEXITCODE -ne 0) { throw 'Locked workflow-test tooling install failed' }

node scripts/migration/Test-MonorepoRequiredChecks.mjs
if ($LASTEXITCODE -ne 0) { throw 'Required-check regressions failed' }

node scripts/migration/Test-MonorepoWorkflowContracts.mjs --repository
if ($LASTEXITCODE -ne 0) { throw 'Root workflow contract failed' }

git diff --check
if ($LASTEXITCODE -ne 0) { throw 'Whitespace failed' }
```

CLI fixture mode output cuối dự kiến `S002_LIFECYCLE_FIXTURES_PASS`; repository mode `S002_LIFECYCLE_REPOSITORY_PASS`; any errors nonzero and sanitized codes. Old T09 final `S001-T09 decision matrix tests: PASS`. Expected token không phải observed result.

CLI must reject unknown/duplicate args; read document paths fixed relative to module root, not caller cwd; missing files fail unless S002 absent in legitimate baseline mode. If S002 is current and file missing, always fail.

Markdown-link checker and trusted Gitleaks use existing reviewed T08 workflow/tool resolution, not untrusted PATH executable. Commands for remote read-back are chosen from authorized available tooling at execution time; no token pasted into docs/logs.

## 9. Estimate, exit checklist và owner handoff

Preliminary engineering estimate **10–16h**, excluding owner/hosted waiting. Parent plan already reflects T01 10–16h and total 72–114h plus reserve; refine again only if fixture/interface audit changes scope. Không giảm coverage để giữ estimate cũ.

T01 done requires all of:
- intended old phase regression RED and corrected GREEN;
- S001 ADR/matrix/history/approval/provenance intact;
- strict parser + all activation fixture classes GREEN;
- docs-only lifecycle failure cannot pass actual stable aggregate;
- plan/capacity/dates/method/activation scopes owner-approved;
- protected prerequisite publication and factual activation-record publication verified;
- actual current S002 Phase0 consistently recorded, no Phase0 completion or Phase1 claim.

Nếu chỉ local GREEN: “T01 local gate complete; activation pending”, không “Sprint002 active”.
Nếu PR green chưa merge: “publication pending”.
Nếu merged chưa push checks: “postmerge verification pending”.

## 10. Phụ lục source nguyên văn

Các file bên dưới chứa đầy đủ source context hiện tại, không ellipsis. Những phần ADR/matrix không thuộc T01 được giữ để người đọc thấy vì sao không được phá historical safeguards. Source không có nghĩa là proposal đã implemented; hướng dẫn và expected tests ở các mục trên mới là kế hoạch thay đổi.

### api/scripts/decisions/Test-S001-T09-Decisions.mjs

Snapshot nguyên văn từ checkout khi lập hướng dẫn; không phải code T01 đã sửa.

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const matrixPath = path.join(
  repositoryRoot,
  'docs/decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md',
);
const decisionsDirectory = path.join(repositoryRoot, 'docs/decisions');
const adrDirectory = path.join(repositoryRoot, 'docs/adr');

const blueprintItems = [
  'Coarse-grained microservices-first architecture.',
  'Java 21 + Spring Boot baseline.',
  'Hexagonal architecture inside services.',
  'Cognito owns credentials; app owns business roles.',
  'PostgreSQL ownership per bounded context.',
  'Transaction Core owns bid/wallet/hold/ledger/settlement.',
  'ECS for core long-running domain services.',
  'Lambda only for approved supporting workloads.',
  'DynamoDB only for projection/inbox/TTL workloads.',
  'Valkey is ephemeral, never financial truth.',
  'Transactional outbox + EventBridge + SQS.',
  'EventBridge Scheduler for auction lifecycle.',
  'Step Functions only for long-running orchestration.',
  'AppConfig for dynamic configuration/feature rollout.',
  'KMS/security baseline.',
  'PostgreSQL search first; OpenSearch trigger.',
  'EventBridge/SQS first; MSK trigger.',
  'Multi-account production governance.',
  'Immutable deployment digest and blue/green production rollout.',
  'Backup/restore and fault-testing policy.',
];
const expectedCoverage = [
  'COVERED', 'COVERED', 'GAP', 'COVERED', 'COVERED',
  'COVERED', 'PARTIAL', 'GAP', 'COVERED', 'COVERED',
  'COVERED', 'COVERED', 'GAP', 'GAP', 'GAP',
  'COVERED', 'COVERED', 'GAP', 'GAP', 'GAP',
];
const expectedAdrIds = {
  1: ['ADR-001'],
  2: ['ADR-002'],
  4: ['ADR-003'],
  5: ['ADR-004', 'ADR-016'],
  6: ['ADR-005'],
  7: ['ADR-010'],
  9: ['ADR-006'],
  10: ['ADR-007'],
  11: ['ADR-008'],
  12: ['ADR-009'],
  16: ['ADR-013'],
  17: ['ADR-014'],
};
const expectedDelta = {
  3: 'ADR-018',
  7: 'ADR-019',
  8: 'ADR-019',
  13: 'ADR-020',
  14: 'ADR-021',
  15: 'ADR-022',
  18: 'ADR-023',
  19: 'ADR-024',
  20: 'ADR-025',
};
const proposedAdrs = [
  'ADR-018-hexagonal-service-boundaries.md',
  'ADR-019-lambda-supporting-workloads.md',
  'ADR-020-step-functions-orchestration-criteria.md',
  'ADR-021-appconfig-rollout-policy.md',
  'ADR-022-kms-security-baseline.md',
  'ADR-023-multi-account-governance.md',
  'ADR-024-immutable-image-promotion-and-blue-green.md',
  'ADR-025-backup-restore-and-fault-testing.md',
];

const requiredApprovedAdrs = Array.from({ length: 16 }, (_, index) =>
  `ADR-${String(index + 1).padStart(3, '0')}`,
);
const coverageValues = new Set(['COVERED', 'PARTIAL', 'GAP']);
const decisionStatuses = new Set(['APPROVED', 'PROPOSED', 'NOT_DECIDED']);
const implementationStates = new Set([
  'NOT_ASSESSED',
  'DECISION_ONLY',
  'IN_PROGRESS',
  'DELIVERED',
]);

function parseTableRow(line) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function extractRows(markdown) {
  const heading = '## Blueprint section 34 mapping';
  const headingIndex = markdown.indexOf(heading);
  if (headingIndex < 0) return [];
  const afterHeading = markdown.slice(headingIndex + heading.length);
  const nextHeading = afterHeading.search(/^## /m);
  const section = nextHeading < 0 ? afterHeading : afterHeading.slice(0, nextHeading);

  return section
    .split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map(parseTableRow);
}

function validateMatrix(markdown, readAdr) {
  const errors = [];
  if (typeof markdown !== 'string') return ['MATRIX_MISSING'];

  const rows = extractRows(markdown);
  const numbers = rows.map((row) => Number(row[0]));
  const uniqueNumbers = new Set(numbers);

  if (rows.length !== 20) errors.push('ROW_COUNT');
  if (uniqueNumbers.size !== numbers.length) errors.push('DUPLICATE_NUMBER');
  if (numbers.some((number) => !Number.isInteger(number) || number < 1 || number > 20)) {
    errors.push('INVALID_OR_EXTRA_NUMBER');
  }
  if (numbers.length === 20 && numbers.some((number, index) => number !== index + 1)) {
    errors.push('ORDER');
  }

  for (let index = 0; index < Math.min(rows.length, blueprintItems.length); index += 1) {
    const row = rows[index];
    if (row.length !== 9) {
      errors.push(`COLUMN_COUNT_${index + 1}`);
      continue;
    }

    const [numberText, subject, coverage, references, decisionStatus,
      implementationPhase, implementationState, evidence, deltaOwner] = row;
    const number = Number(numberText);

    if (number >= 1 && number <= 20 && subject !== blueprintItems[number - 1]) {
      errors.push(`SUBJECT_${number}`);
    }
    if (!coverageValues.has(coverage)) errors.push(`COVERAGE_${number}`);
    const allowedCoverage = expectedDelta[number]
      ? new Set([expectedCoverage[number - 1], 'COVERED'])
      : new Set([expectedCoverage[number - 1]]);
    if (!allowedCoverage.has(coverage)) {
      errors.push(`MAPPING_COVERAGE_${number}`);
    }
    if (!decisionStatuses.has(decisionStatus)) errors.push(`DECISION_STATUS_${number}`);
    if (!/^Phase (?:[0-9]|1[0-3])$/.test(implementationPhase)) {
      errors.push(`IMPLEMENTATION_PHASE_${number}`);
    }
    if (!implementationStates.has(implementationState)) {
      errors.push(`IMPLEMENTATION_STATE_${number}`);
    }
    if (implementationState === 'DELIVERED' &&
      (/decision[- ]only/i.test(evidence) || !/\[[^\]]+\]\([^)]+\)/.test(evidence))) {
      errors.push(`DELIVERED_WITHOUT_IMPLEMENTATION_EVIDENCE_${number}`);
    }

    const links = [...references.matchAll(/\[(ADR-\d{3})\]\(([^)]+)\)/g)]
      .map((match) => ({ id: match[1], target: match[2] }));
    const expectedIds = [
      ...(expectedAdrIds[number] ?? []),
      ...(coverage === 'COVERED' && expectedDelta[number] ? [expectedDelta[number]] : []),
    ];
    const actualIds = links.map((link) => link.id);
    if (expectedIds.join(',') !== actualIds.join(',')) {
      errors.push(`ADR_MAPPING_${number}`);
    }
    const adrResults = [];
    for (const link of links) {
      const { id, target } = link;
      if (target.startsWith('/') || target.includes('://')) {
        errors.push(`NON_RELATIVE_ADR_LINK_${number}`);
        continue;
      }
      if (!path.basename(target).startsWith(`${id}-`)) {
        errors.push(`ADR_LABEL_TARGET_MISMATCH_${number}`);
      }
      const resolved = path.resolve(decisionsDirectory, target);
      if (!resolved.startsWith(`${adrDirectory}${path.sep}`)) {
        errors.push(`ADR_LINK_OUTSIDE_DIRECTORY_${number}`);
        continue;
      }
      const content = readAdr(target);
      if (typeof content !== 'string') {
        errors.push(`BROKEN_ADR_LINK_${number}`);
        continue;
      }
      const status = content.match(/^\s*-\s*Status:\s*(\S+)\s*$/mi)?.[1];
      adrResults.push({ status });
      if (status !== 'APPROVED' && decisionStatus === 'APPROVED') {
        errors.push(`UNAPPROVED_ADR_AS_APPROVED_${number}`);
      }
    }

    if (coverage === 'COVERED' &&
      (decisionStatus !== 'APPROVED' || adrResults.length === 0 ||
        !adrResults.every((adr) => adr.status === 'APPROVED'))) {
      errors.push(`COVERED_WITHOUT_APPROVED_DECISION_${number}`);
    }
    if (coverage === 'PARTIAL' &&
      (!adrResults.some((adr) => adr.status === 'APPROVED') || !deltaOwner || deltaOwner === '—')) {
      errors.push(`PARTIAL_WITHOUT_APPROVED_REFERENCE_OR_OWNER_${number}`);
    }
    if (coverage === 'GAP' &&
      (!deltaOwner || deltaOwner === '—' || !/ADR-\d{3}/.test(evidence))) {
      errors.push(`GAP_WITHOUT_PROPOSED_DELTA_OWNER_${number}`);
    }
    if (expectedDelta[number] && !evidence.includes(expectedDelta[number])) {
      errors.push(`EXPECTED_DELTA_MISSING_${number}`);
    }
  }

  return [...new Set(errors)];
}

function readRepositoryAdr(relativePath) {
  const absolutePath = path.resolve(decisionsDirectory, relativePath);
  if (!absolutePath.startsWith(`${adrDirectory}${path.sep}`)) return null;
  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

function readDocumentOrNull(absolutePath) {
  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

function validateDecisionDocuments(readDocument) {
  const errors = [];
  const monorepoRoot = path.resolve(repositoryRoot, '..');
  const documentPaths = [
    ...fs.readdirSync(adrDirectory)
      .filter((name) => /^ADR-\d{3}-.*\.md$/.test(name))
      .map((name) => path.join(adrDirectory, name)),
    matrixPath,
    path.join(decisionsDirectory, 'BUSINESS_DECISIONS.md'),
  ];

  for (const documentPath of documentPaths) {
    const content = readDocument(documentPath);
    if (typeof content !== 'string') {
      errors.push(`MISSING_DOCUMENT:${path.basename(documentPath)}`);
      continue;
    }
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [relativePath, fragment] = target.split('#', 2);
      const destination = path.resolve(path.dirname(documentPath), relativePath || '.');
      if (!(destination === monorepoRoot ||
        destination.startsWith(`${monorepoRoot}${path.sep}`))) {
        errors.push(`LINK_OUTSIDE_REPOSITORY:${path.basename(documentPath)}`);
        continue;
      }
      const destinationContent = readDocument(destination);
      if (typeof destinationContent !== 'string') {
        errors.push(`BROKEN_LOCAL_LINK:${path.basename(documentPath)}:${target}`);
        continue;
      }
      if (fragment) {
        const headings = [...destinationContent.matchAll(/^#{1,6}\s+(.+)$/gm)]
          .map((heading) => heading[1]
            .toLowerCase()
            .replace(/<[^>]+>/g, '')
            .replace(/[`*_~]/g, '')
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .trim()
            .replace(/\s+/g, '-'));
        if (!headings.includes(fragment.toLowerCase())) {
          errors.push(`BROKEN_LOCAL_ANCHOR:${path.basename(documentPath)}:${target}`);
        }
      }
    }
  }

  const topology = readDocument(adr017Path);
  const businessDecisions = readDocument(path.join(decisionsDirectory,
    'BUSINESS_DECISIONS.md'));
  if (typeof topology !== 'string' ||
    !/^- Status: APPROVED$/m.test(topology) ||
    !/^- Approved by: AkaDNT \(Project Owner \/ Repository Owner\)$/m.test(topology) ||
    !/^- Selected option: `OPTION_A_MONOREPO`$/m.test(topology) ||
    typeof businessDecisions !== 'string' ||
    !/^\| BD-007 \|[^\r\n]*\| APPROVED \|/m.test(businessDecisions)) {
    errors.push('TOPOLOGY_NOT_APPROVED');
  }

  for (const adrFile of proposedAdrs) {
    const content = readDocument(path.join(adrDirectory, adrFile));
    const date = typeof content === 'string'
      ? content.match(/^- Approval date: (\d{4})-(\d{2})-(\d{2})$/m)
      : null;
    const year = Number(date?.[1]);
    const month = Number(date?.[2]);
    const day = Number(date?.[3]);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (typeof content !== 'string' || !/^- Status: APPROVED$/m.test(content) ||
      !/^- Approved by: AkaDNT \(Project Owner \/ Repository Owner\)$/m.test(content) ||
      !date || calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() + 1 !== month ||
      calendarDate.getUTCDate() !== day) {
      errors.push(`INVALID_APPROVAL_DATE:${adrFile}`);
    }
  }
  return errors;
}

function assertCase(name, condition) {
  if (!condition) {
    console.error(`[FAIL] ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[PASS] ${name}`);
}

function replaceFirst(text, search, replacement) {
  const index = text.indexOf(search);
  if (index < 0) throw new Error('FIXTURE_ANCHOR_MISSING');
  return `${text.slice(0, index)}${replacement}${text.slice(index + search.length)}`;
}

function validateSprintLifecycle(sprint, delivery, index, evidence) {
  if (!delivery.includes('S001-T09 decision traceability: 20/20 approved') ||
    !/^- Current roadmap phase: Phase 0\b/m.test(delivery) ||
    !/^- Roadmap phase: Phase 0\b/m.test(index)) return false;
  const statuses = [
    sprint.match(/^- Sprint status: (\S+)$/m)?.[1],
    delivery.match(/^- Sprint status: (\S+)$/m)?.[1],
    index.match(/^- Status: (\S+)$/m)?.[1],
  ];
  const t08Completed = /^\|\s*8\s*\|\s*S001-T08\s*\|[^\r\n]*\|\s*COMPLETED\s*\|$/m.test(sprint);
  if (statuses.every((status) => status === 'IN_PROGRESS')) {
    return !t08Completed &&
      delivery.includes('Sprint 001 remain in progress pending S001-T08') &&
      /^- Current execution task: S001-T08\b/m.test(index) &&
      !/^Status: ACCEPTED_LOCAL_REVIEW\./m.test(evidence);
  }
  if (!statuses.every((status) => status === 'COMPLETED') || !t08Completed) return false;
  const t08 = sprint.split('## S001-T08 — Publish local baseline runbook and sprint evidence')[1]
    ?.split('## Daily Execution State')[0] ?? '';
  if ((t08.match(/^- \[x\]/gm) ?? []).length !== 4 || /^- \[ \]/m.test(t08)) return false;
  const date = evidence.match(/^- Review date: (\d{4}-\d{2}-\d{2})$/m)?.[1];
  const parsed = date ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  const publication = [sprint, delivery, index]
    .map((text) => text.match(/^- Publication status: (\S+)$/m)?.[1]);
  const pendingPublication = publication.every((status) => status === 'PENDING_PROTECTED_PR') &&
    /^- Current execution task: S001-T08 protected publication\b/m.test(index);
  const merge = evidence.match(/^- Published merge: `([a-f0-9]{40})`\.$/m)?.[1];
  const verifiedPublication = publication.every((status) => status === 'PUBLISHED_VERIFIED') &&
    Boolean(merge) && [sprint, delivery, index].every((text) =>
      text.includes(`- Published merge: \`${merge}\`.`)) &&
    /^- Publication PR: https:\/\/github\.com\/AkaDNT\/auction-promax\/pull\/\d+$/m.test(evidence) &&
    ['monorepo-required', 'supply-chain-verification'].every((name) =>
      new RegExp(`^- Postmerge ${name}: SUCCESS; https://github\\.com/AkaDNT/auction-promax/actions/runs/\\d+$`, 'm').test(evidence)) &&
    /^- Current execution task: Phase 0 remaining-gate assessment\b/m.test(index);
  return (pendingPublication || verifiedPublication) &&
    [sprint, delivery, index].every((text) =>
      text.includes(`- Actual review/closure date: ${date}`)) &&
    /^Status: ACCEPTED_LOCAL_REVIEW\./m.test(evidence) &&
    /^- Approved by: AkaDNT \(Project Owner \/ Repository Owner\)$/m.test(evidence) &&
    /^- Implementation C1: `[a-f0-9]{40}`\.$/m.test(evidence) &&
    /^- C1 tree: `[a-f0-9]{40}`\.$/m.test(evidence) &&
    Array.from({ length: 6 }, (_, number) => number + 1)
      .every((number) => new RegExp(`^### ${number}\\. `, 'm').test(evidence)) &&
    /^executionState\s*= PASS$/m.test(evidence) &&
    /^policyState\s*= BLOCKED$/m.test(evidence) &&
    /^failureCode\s*= NONE$/m.test(evidence) &&
    [delivery, evidence].every((text) => text.includes('DEFERRED_NO_PRODUCER_CONTRACT')) &&
    delivery.includes('release-policy=BLOCKED');
}

const completedLifecycleFixture = {
  sprint: '- Sprint status: COMPLETED\n- Publication status: PENDING_PROTECTED_PR\n- Actual review/closure date: 2026-10-05\n| 8 | S001-T08 | Local baseline | 4h | LOW | COMPLETED |\n## S001-T08 — Publish local baseline runbook and sprint evidence\n- [x] Runbook\n- [x] Review\n- [x] Maturity\n- [x] Retrospective\n## Daily Execution State\n',
  delivery: '- Current roadmap phase: Phase 0\n- Sprint status: COMPLETED\n- Publication status: PENDING_PROTECTED_PR\n- Actual review/closure date: 2026-10-05\nS001-T09 decision traceability: 20/20 approved\nDEFERRED_NO_PRODUCER_CONTRACT\nrelease-policy=BLOCKED\n',
  index: '- Roadmap phase: Phase 0\n- Status: COMPLETED\n- Publication status: PENDING_PROTECTED_PR\n- Actual review/closure date: 2026-10-05\n- Current execution task: S001-T08 protected publication\n',
  evidence: 'Status: ACCEPTED_LOCAL_REVIEW.\n- Approved by: AkaDNT (Project Owner / Repository Owner)\n- Review date: 2026-10-05\n- Implementation C1: `1111111111111111111111111111111111111111`.\n- C1 tree: `2222222222222222222222222222222222222222`.\nexecutionState = PASS\npolicyState = BLOCKED\nfailureCode = NONE\nDEFERRED_NO_PRODUCER_CONTRACT\n### 1. Decisions\n### 2. Builds\n### 3. Database\n### 4. HTTP\n### 5. Delivery\n### 6. Scans\n',
};
const lifecycleFixtureValid = (fixture) => validateSprintLifecycle(
  fixture.sprint, fixture.delivery, fixture.index, fixture.evidence,
);
assertCase('Owner-reviewed completed T08 with pending publication validates',
  lifecycleFixtureValid(completedLifecycleFixture));
const pendingLifecycleFixture = {
  sprint: '- Sprint status: IN_PROGRESS\n| 8 | S001-T08 | Local baseline | 4h | LOW | READY |\n',
  delivery: '- Current roadmap phase: Phase 0\n- Sprint status: IN_PROGRESS\nS001-T09 decision traceability: 20/20 approved\nSprint 001 remain in progress pending S001-T08\n',
  index: '- Roadmap phase: Phase 0\n- Status: IN_PROGRESS\n- Current execution task: S001-T08\n',
  evidence: '',
};
assertCase('Consistent pending T08 lifecycle still validates', lifecycleFixtureValid(pendingLifecycleFixture));
const publishedLifecycleFixture = Object.fromEntries(Object.entries(completedLifecycleFixture)
  .map(([key, text]) => [key, text.replaceAll('PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED')
    .replace('S001-T08 protected publication', 'Phase 0 remaining-gate assessment')]));
for (const key of ['sprint', 'delivery', 'index', 'evidence']) {
  publishedLifecycleFixture[key] += '- Published merge: `3333333333333333333333333333333333333333`.\n';
}
publishedLifecycleFixture.evidence += '- Publication PR: https://github.com/AkaDNT/auction-promax/pull/16\n'
  + '- Postmerge monorepo-required: SUCCESS; https://github.com/AkaDNT/auction-promax/actions/runs/123\n'
  + '- Postmerge supply-chain-verification: SUCCESS; https://github.com/AkaDNT/auction-promax/actions/runs/456\n';
assertCase('Published verified T08 lifecycle validates', lifecycleFixtureValid(publishedLifecycleFixture));
for (const [name, field, search, replacement] of [
  ['Published merge mismatch', 'delivery', '3333333333333333333333333333333333333333', '4444444444444444444444444444444444444444'],
  ['Published required check failed', 'evidence', 'supply-chain-verification: SUCCESS', 'supply-chain-verification: FAILURE'],
  ['Published PR missing', 'evidence', '- Publication PR: https://github.com/AkaDNT/auction-promax/pull/16', ''],
]) {
  assertCase(`${name} rejected`, !lifecycleFixtureValid({ ...publishedLifecycleFixture,
    [field]: replaceFirst(publishedLifecycleFixture[field], search, replacement) }));
}
for (const [name, field, search, replacement] of [
  ['Mismatched sprint statuses', 'delivery', 'Sprint status: COMPLETED', 'Sprint status: IN_PROGRESS'],
  ['Missing owner approval', 'evidence', '- Approved by: AkaDNT (Project Owner / Repository Owner)', ''],
  ['Impossible review date', 'evidence', '2026-10-05', '2026-02-30'],
  ['Missing C1 provenance', 'evidence', '- Implementation C1: `1111111111111111111111111111111111111111`.', ''],
  ['Incomplete six-part evidence', 'evidence', '### 6. Scans', ''],
  ['Failed security execution', 'evidence', 'executionState = PASS', 'executionState = IMPLEMENTATION_FAILURE'],
  ['Unevidenced publication', 'index', 'PENDING_PROTECTED_PR', 'PUBLISHED'],
  ['T08 acceptance incomplete', 'sprint', '- [x] Retrospective', '- [ ] Retrospective'],
  ['Phase 0 prematurely advanced', 'delivery', 'Current roadmap phase: Phase 0', 'Current roadmap phase: Phase 1'],
  ['Review dates disagree', 'index', '2026-10-05', '2026-10-06'],
  ['Deferred consumer mislabeled PASS', 'delivery', 'DEFERRED_NO_PRODUCER_CONTRACT', 'COMPATIBILITY_PASS'],
  ['T09 traceability removed', 'delivery', 'S001-T09 decision traceability: 20/20 approved', ''],
]) {
  assertCase(`${name} rejected`, !lifecycleFixtureValid({
    ...completedLifecycleFixture,
    [field]: replaceFirst(completedLifecycleFixture[field], search, replacement),
  }));
}
assertCase('Accepted review cannot coexist with pending sprint', !lifecycleFixtureValid({
  ...pendingLifecycleFixture, evidence: completedLifecycleFixture.evidence,
}));

for (const adrId of requiredApprovedAdrs) {
  const adrFile = fs.readdirSync(adrDirectory)
    .find((name) => name.startsWith(`${adrId}-`) && name.endsWith('.md'));
  const content = adrFile
    ? fs.readFileSync(path.join(adrDirectory, adrFile), 'utf8')
    : null;
  const approved = typeof content === 'string' &&
    /^\s*-\s*Status:\s*APPROVED\s*$/mi.test(content);
  assertCase(`${adrId} exists and is approved`, approved);
}

for (const adrFile of proposedAdrs) {
  const adrPath = path.join(adrDirectory, adrFile);
  const content = fs.existsSync(adrPath) ? fs.readFileSync(adrPath, 'utf8') : '';
  const status = content.match(/^- Status: (PROPOSED|APPROVED)$/m)?.[1];
  const approvalIsConsistent = status === 'PROPOSED'
    ? !/^- Approved by:/m.test(content) && !/^- Approval date:/m.test(content)
    : status === 'APPROVED' && /^- Approved by: \S.+$/m.test(content) &&
      /^- Approval date: \d{4}-\d{2}-\d{2}$/m.test(content);
  const valid = approvalIsConsistent &&
    /^- Owner: Project Owner \/ Repository Owner$/m.test(content) &&
    /^## Context$/m.test(content) &&
    /^## Proposed decision$/m.test(content) &&
    /^## Alternatives$/m.test(content) &&
    /^## Consequences$/m.test(content) &&
    /^## Later implementation evidence$/m.test(content);
  assertCase(`${adrFile} has reviewable metadata for its decision status`, valid);
}

if (!fs.existsSync(matrixPath)) {
  console.error('[FAIL] Canonical 20-row decision matrix exists and validates (MATRIX_MISSING)');
  process.exitCode = 1;
  console.log('S001-T09 decision matrix tests: FAIL');
  process.exit();
}

const canonical = fs.readFileSync(matrixPath, 'utf8');
const canonicalErrors = validateMatrix(canonical, readRepositoryAdr);
assertCase('Canonical matrix has exactly 20 ordered blueprint subjects',
  canonicalErrors.length === 0);
if (process.argv.includes('--require-complete')) {
  const rows = extractRows(canonical);
  assertCase('All 20 mandatory decisions have approved coverage',
    rows.length === 20 && rows.every((row) => row[2] === 'COVERED' &&
      row[4] === 'APPROVED') && canonicalErrors.length === 0);
}
if (process.argv.includes('--require-closeout')) {
  const sprint = fs.readFileSync(path.join(repositoryRoot, 'docs/sprints/SPRINT_001.md'), 'utf8');
  const delivery = fs.readFileSync(path.join(repositoryRoot, 'docs/DELIVERY_STATE.md'), 'utf8');
  const index = fs.readFileSync(path.join(repositoryRoot, 'docs/SPRINT_INDEX.md'), 'utf8');
  const t09 = sprint.split('## S001-T09 — Reconcile revised blueprint decision delta')[1]
    ?.split('## S001-T08 —')[0] ?? '';
  assertCase('Sprint T09 acceptance and task status reflect approved decision closeout',
    /^\|\s*9\s*\|\s*S001-T09\s*\|[^\r\n]*\|\s*COMPLETED\s*\|$/m.test(sprint) &&
      (t09.match(/^- \[x\]/gm) ?? []).length === 4);
  const evidence = readDocumentOrNull(path.join(repositoryRoot,
    'docs/sprints/S001-T08_REVIEW_EVIDENCE.md')) ?? '';
  assertCase('Sprint lifecycle is consistent without closing Phase 0',
    validateSprintLifecycle(sprint, delivery, index, evidence));
}
for (const adrFile of proposedAdrs) {
  const adrId = adrFile.slice(0, 7);
  assertCase(`${adrId} decision is linked from the matrix`,
    canonical.includes(`[${adrId}](../adr/${adrFile})`));
}
if (canonicalErrors.length > 0) {
  console.error(`[DIAGNOSTIC] Canonical matrix validation codes: ${canonicalErrors.join(',')}`);
}
assertCase('Repository topology is a separate section linked to Blueprint §33',
  /^## Repository-topology checkpoint \(separate from the 20 subjects\)$/m.test(canonical) &&
    /\[Blueprint §33\]\(\.\.\/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap\.md#33-roadmap\)/.test(canonical));

const sectionStart = canonical.indexOf('## Blueprint section 34 mapping');
const tableText = canonical.slice(sectionStart);
const firstRow = tableText.match(/^\|\s*1\s*\|[^\r\n]+/m)?.[0];
const secondRow = tableText.match(/^\|\s*2\s*\|[^\r\n]+/m)?.[0];
const lastRow = tableText.match(/^\|\s*20\s*\|[^\r\n]+/m)?.[0];
const approvedLink = canonical.match(/\[[^\]]+\]\((\.\.\/adr\/ADR-001-[^)]+)\)/)?.[1];

if (!firstRow || !secondRow || !lastRow || !approvedLink) {
  console.error('[FAIL] Matrix negative-fixture anchors are present');
  process.exitCode = 1;
} else {
  const missingRow = canonical.replace(`${firstRow}\n`, '');
  assertCase('Missing blueprint row rejected',
    validateMatrix(missingRow, readRepositoryAdr).length > 0);

  const duplicateRow = canonical.replace(`${lastRow}\n`, `${lastRow}\n${lastRow}\n`);
  assertCase('Duplicate blueprint number rejected',
    validateMatrix(duplicateRow, readRepositoryAdr).includes('DUPLICATE_NUMBER'));

  const reorderedRows = canonical.replace(`${firstRow}\n${secondRow}`, `${secondRow}\n${firstRow}`);
  assertCase('Reordered blueprint rows rejected',
    validateMatrix(reorderedRows, readRepositoryAdr).includes('ORDER'));

  const extraRow = canonical.replace(`${lastRow}\n`, `${lastRow}\n${lastRow.replace(/^\|\s*20\s*\|/, '| 21 |')}\n`);
  assertCase('Extra blueprint row rejected',
    validateMatrix(extraRow, readRepositoryAdr).includes('INVALID_OR_EXTRA_NUMBER'));

  const brokenLink = replaceFirst(canonical, approvedLink, '../adr/ADR-999-missing.md');
  assertCase('Broken relative ADR link rejected',
    validateMatrix(brokenLink, readRepositoryAdr).some((error) => error.startsWith('BROKEN_ADR_LINK_')));

  const invalidCoverage = replaceFirst(canonical, '| COVERED |', '| MAYBE |');
  assertCase('Unknown coverage value rejected',
    validateMatrix(invalidCoverage, readRepositoryAdr).some((error) => error.startsWith('COVERAGE_')));

  const invalidStatus = replaceFirst(canonical, '| APPROVED |', '| ACCEPTED |');
  assertCase('Unknown decision status rejected',
    validateMatrix(invalidStatus, readRepositoryAdr).some((error) => error.startsWith('DECISION_STATUS_')));

  const noDecision = replaceFirst(canonical, `| COVERED | [ADR-001](${approvedLink}) | APPROVED |`,
    `| COVERED | — | APPROVED |`);
  assertCase('COVERED without approved decision rejected',
    validateMatrix(noDecision, readRepositoryAdr).some((error) => error.startsWith('COVERED_WITHOUT_APPROVED')));

  const approvedThirdRow = canonical.match(/^\|\s*3\s*\|[^\r\n]+/m)?.[0];
  const gapCells = parseTableRow(approvedThirdRow);
  gapCells[2] = 'GAP';
  gapCells[3] = '—';
  gapCells[4] = 'NOT_DECIDED';
  gapCells[7] = 'Proposed ADR-018; no approval claimed.';
  gapCells[8] = 'Product Owner / Project Owner';
  const gapRow = `| ${gapCells.join(' | ')} |`;
  const gapMatrix = canonical.replace(approvedThirdRow, gapRow);
  gapCells[8] = '—';
  const gapWithoutOwner = canonical.replace(approvedThirdRow,
    `| ${gapCells.join(' | ')} |`);
  assertCase('GAP without proposed delta owner rejected',
    validateMatrix(gapWithoutOwner, readRepositoryAdr).some((error) => error.startsWith('GAP_WITHOUT_PROPOSED')));

  const deliveredCells = parseTableRow(firstRow);
  deliveredCells[6] = 'DELIVERED';
  deliveredCells[7] = 'Decision-only evidence; no implementation proof.';
  const deliveredWithDecisionOnly = canonical.replace(
    firstRow,
    `| ${deliveredCells.join(' | ')} |`,
  );
  assertCase('DELIVERED with decision-only evidence rejected',
    validateMatrix(deliveredWithDecisionOnly, readRepositoryAdr)
      .some((error) => error.startsWith('DELIVERED_WITHOUT_IMPLEMENTATION_EVIDENCE')));

  const proposedLink = replaceFirst(canonical, approvedLink, '../adr/ADR-017-proposed-fixture.md');
  const proposedAdrReader = (target) => target === '../adr/ADR-017-proposed-fixture.md'
    ? '# ADR-017 fixture\n\n- Status: PROPOSED\n'
    : readRepositoryAdr(target);
  assertCase('PROPOSED ADR cannot satisfy approved COVERED row',
    validateMatrix(proposedLink, proposedAdrReader)
      .some((error) => error.startsWith('UNAPPROVED_ADR_AS_APPROVED') ||
        error.startsWith('COVERED_WITHOUT_APPROVED')));

  assertCase('GAP and approved delta states both validate',
    validateMatrix(gapMatrix, readRepositoryAdr).length === 0 &&
      validateMatrix(canonical, readRepositoryAdr).length === 0);
}

const adr018Path = path.join(adrDirectory, proposedAdrs[0]);
const adr017Path = path.join(adrDirectory,
  'ADR-017-repository-topology-and-contract-governance.md');
const adr018 = readDocumentOrNull(adr018Path);
const adr017 = readDocumentOrNull(adr017Path);
const overrideDocument = (target, changedPath, replacement) =>
  target === changedPath ? replacement : readDocumentOrNull(target);
assertCase('Broken Refines target is rejected',
  validateDecisionDocuments((target) => overrideDocument(target, adr018Path,
    adr018.replace('ADR-001-coarse-grained-microservices-first.md',
      'ADR-999-missing.md'))).some((error) => error.startsWith('BROKEN_LOCAL_LINK')));
assertCase('Unapproved topology ADR is rejected',
  validateDecisionDocuments((target) => overrideDocument(target, adr017Path,
    adr017.replace('- Status: APPROVED', '- Status: PROPOSED')))
    .includes('TOPOLOGY_NOT_APPROVED'));
assertCase('Broken business-decision anchor is rejected',
  validateDecisionDocuments((target) => overrideDocument(target, matrixPath,
    replaceFirst(canonical, 'BUSINESS_DECISIONS.md',
      'BUSINESS_DECISIONS.md#bd-999')))
    .some((error) => error.startsWith('BROKEN_LOCAL_ANCHOR')));
assertCase('Impossible approval date is rejected',
  validateDecisionDocuments((target) => overrideDocument(target, adr018Path,
    adr018.replace('- Approval date: 2026-10-03', '- Approval date: 2026-99-99')))
    .some((error) => error.startsWith('INVALID_APPROVAL_DATE')));
const documentErrors = validateDecisionDocuments(readDocumentOrNull);
assertCase('All decision-document links, approvals and dates validate',
  documentErrors.length === 0);
if (documentErrors.length > 0) {
  console.error(`[DIAGNOSTIC] Decision document codes: ${documentErrors.join(',')}`);
}

console.log(process.exitCode ? 'S001-T09 decision matrix tests: FAIL' : 'S001-T09 decision matrix tests: PASS');
```

### api/docs/DELIVERY_STATE.md

Snapshot nguyên văn từ checkout khi lập hướng dẫn; không phải code T01 đã sửa.

```markdown
# Auction Platform Delivery State

## Blueprint

- File: `docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md`
- Version: Final production architecture blueprint (repository copy has no explicit version identifier)
- Status: APPROVED SOURCE OF TRUTH

## Current Position

- Current roadmap phase: Phase 0 — Decision lock and engineering foundation
- Active milestone: R0 — Engineering Baseline
- Current sprint: SPRINT-001
- Sprint status: COMPLETED
- Publication status: PUBLISHED_VERIFIED
- Published merge: `ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.
- Actual review/closure date: 2026-10-05
- Delivery scope: owner-accepted technical closure delivered through PR16; required postmerge execution checks verified. Phase 0 and release readiness remain open.
- Target environment: Local developer environment and CI baseline
- Last updated: 2026-10-05

## Current Phase Goal

Establish reproducible, independently buildable service foundations with approved decisions, contract governance, isolated local data stores, observable request/event handling, and supply-chain scan evidence.

## Current Sprint Goal

An engineer can build and verify the initial service baseline with versioned contracts, isolated local PostgreSQL, and one traced, idempotent outbox-to-inbox sample flow.

## Phase Exit Gate Progress

- [x] Final ADR set, threat model, data classification, SLOs, and cost model are approved and traceable.
  - Evidence: ADR-001 through ADR-016 and `docs/decisions/PHASE_0_BASELINES.md` were approved by the Product Owner / Project Owner on 2026-08-05; BD-004/BD-005 record the approved PostgreSQL privilege refinement and supersession rule. ADR-017 records the later topology decision; ADR-018 through ADR-025 were approved on 2026-10-03. The 20-row `docs/decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md` traces all mandatory blueprint subjects as approved decision-only coverage.
  - Covered by sprint/task: S001-T01, S001-T09.
- [ ] Monorepo and service templates let every service build independently.
  - Evidence: ADR-017 / BD-007 approved `OPTION_A_MONOREPO`; the public monorepo now has reviewed API and web snapshots and independent fresh-checkout API, web, contract, and infrastructure builds. Its protected default is `migration/monorepo`; unchanged, locked bootstrap `main` remains the rollback reference. Hosted path-classification and negative PR cases concluded as designed, and the first protected governance merge passed the required `monorepo-required` and `supply-chain-verification` checks. The canonical producer registry does not yet cover web product endpoints: consumer compatibility is `DEFERRED_NO_PRODUCER_CONTRACT`, not PASS. The owner accepted this residual risk for the Phase 0 topology cutover, not for product release. Detailed evidence remains local-only.
  - Covered by sprint/task: S001-T02, S001-T03, S001-T09. D-005 is resolved for the governed repository topology after the owner's final review of the amended evidence. This composite Phase 0 gate remains open for separate service-template obligations.
- [x] Java, Spring, Maven, Node, and CDK versions are pinned with a reproducible clean build.
  - Evidence: Java 21/Spring Boot 3.5.16/Maven Wrapper 3.9.16 are enforced by the Identity service; Node 24.15.0/npm 11.12.1 are pinned and checked in web; CDK CLI 2.1135.1, `aws-cdk-lib` 2.269.0, and `constructs` 10.8.1 are lockfile-pinned in `api/infra`. Original 2026-08-11 baseline evidence remains historical; T08 fresh C1 rehearsal/builds passed on 2026-10-04/05.
  - Covered by sprint/task: S001-T02.
- [x] OpenAPI, event, and realtime contracts have a registry and CI compatibility checks.
  - Evidence: Versioned registry locations and compatibility baselines exist under `contracts/`; the registered OpenAPI 3.1 `/api/v1` sample, integration-event envelope, and realtime placeholder passed Redocly/Ajv/governance/N/N-1 local verification on 2026-08-25. The malformed-schema and prohibited-breaking-change fixtures were intentionally rejected as required. The private GitHub Actions `verify-contract-registry` job passed; its run link/log is retained by the repository owner. Final contract-example review found no PII, token, password, secret, credential, or connection string.
  - Covered by sprint/task: S001-T04 — COMPLETED. Runtime implementation and contract conformance remain S001-T06.
- [x] Local logical databases/users per service prevent cross-database access by design.
  - Evidence: On 2026-08-25, two consecutive real ADR-016 bootstrap runs converged all eight databases and 24 least-privilege owner/migrator/app roles; the complete local verification matrix passed 8/8, including ownership, privilege, DML/DDL, and cross-database allow/deny checks. `scripts/run-it-local.ps1` passed 28 unit tests plus `IdentityProfileServiceApplicationLocalIT` (1/1), and clean-environment default `mvnw.cmd verify` passed `IdentityProfileServiceApplicationTestcontainersIT` (5/5) against the immutable PostgreSQL 17 image.
  - Covered by sprint/task: S001-T05.
- [x] Health/readiness, tracing, Problem Details, idempotency, and outbox/inbox skeletons produce a sample request/event trace.
  - Evidence: S001-T03 proved liveness/readiness, safe RFC 9457 responses, W3C-compatible trace/correlation propagation, ECS logs, and HTTP metrics. S001-T06 completed the linked command/outbox/relay/inbox flow on 2026-09-06: 110/110 Surefire, 10/10 PostgreSQL 17 Testcontainers, 4/4 supplementary local-profile integration tests, and all contract registry gates passed. Replay, rollback, concurrency, durable retry, duplicate inbox delivery, safe linked logs, and low-cardinality metrics are covered.
  - Covered by sprint/task: S001-T03, S001-T06.
- [x] Hosted SBOM, dependency, secret, and image-scan evidence is retained and branch-protected.
  - Evidence: Previously verified hosted PR/push and default-branch freshness executions recorded execution integrity `PASS`, release policy `BLOCKED`, and `failureCode=NONE`. Their downloaded artifacts passed the exact seven-file sanitized-evidence allowlist validation and had 30-day retention. The freshness artifact recorded `deltaState=BASELINE_UNAVAILABLE`; this does not weaken the policy block. Phase 0 requires `supply-chain-verification`; the visible `release-policy` check is not required while policy remains blocked. Retained container counts were 29 High, 37 Medium, and 0 Critical; no disposition was created automatically. Legacy run, revision, and artifact identifiers are intentionally omitted from this public snapshot.
  - Covered by sprint/task: S001-T07.

## Current Sprint Progress

S001-T01 through S001-T09 have accepted technical task outcomes. S001-T09 decision traceability: 20/20 approved mandatory blueprint subjects with no GAP/PARTIAL rows; these are architecture decisions, not AWS delivery. T09 is published via PR #15/default merge `0bd0f70a3324738fde08e3d104955e6b2d054742`. The owner accepted T08's [technical review](sprints/S001-T08_REVIEW_EVIDENCE.md) on 2026-10-05: fresh builds/contracts/database/sample evidence and canonical supply-chain execution PASS. PR16 delivered Sprint 001's technical outcome with required postmerge execution checks verified. The overall Phase 0 exit gate remains open. Consumer compatibility is DEFERRED_NO_PRODUCER_CONTRACT; release-policy=BLOCKED. Cognito, EventBridge/SQS, ECS, RDS, ElastiCache and multi-service choreography remain later-phase work.

## Repository Assessment

- `services/identity-profile-service`: Spring Boot skeleton with Java 21, Spring Boot 3.5.16, Maven Wrapper, persistence/security/observability dependencies, separate local/test Flyway credentials, and split local/Testcontainers integration-test paths.
- `web`: Next.js 16.3.6 application with UI and client-side feature code; Node/npm policy and an independent root GitHub Actions lint/build workflow are configured. This is not evidence of Phase 1–8 backend delivery.
- Remaining Phase 0 work includes service-template obligations outside the resolved D-005 topology gate. T08's local [runbook](runbooks/LOCAL_BASELINE_SPRINT_001.md) was exercised on the exact reviewed C1; it does not prove production recovery. Hosted T07 evidence and local T08 supply-chain execution remain separate from BLOCKED release policy. CDK deployment, ECR publishing and CodeBuild/CodePipeline remain later platform work.
- This public monorepo's bootstrap and snapshot commits establish its own history; they do not import or assert ancestry from prior source repositories.

## Decision / Blocker Log

| ID | Item | Status | Owner | Resolution path |
| -- | ---- | ------ | ----- | --------------- |
| D-001 | Formal approval of initial ADR/threat/SLO/cost baselines | RESOLVED | Product Owner / Project Owner | Approved on 2026-08-05; future significant architecture changes require a new ADR or traceable supersession. |
| D-002 | CI provider and container image registry choice | RESOLVED | Product Owner / Project Owner | GitHub Actions and Amazon ECR were approved on 2026-08-11; separate API/web baseline workflows are configured. ECR publishing awaits a dedicated GitHub OIDC role in a later deployment task. |
| D-003 | Identity service baseline test cannot initialize a datasource | RESOLVED | Developer | Local integration context now passes through `mvnw.cmd -Pit-local verify` using `identity_test_db` and separate runtime/Flyway credentials (2026-08-11). |
| D-004 | PostgreSQL owner/migrator/runtime baseline lacks full execution evidence | RESOLVED | Developer | Resolved on 2026-08-25: bootstrap converged twice, the complete local isolation matrix passed 8/8, the local Identity integration path passed 1/1, and canonical Testcontainers verification passed 5/5. |
| D-005 | Revised blueprint requires governed monorepo delivery | RESOLVED | Project Owner / Developer | Resolved on 2026-10-03 after owner review and acceptance of the amended exit evidence: reviewed current-tree snapshot, independent clean-checkout builds, protected default and stable required checks, ownership, hosted PR matrix, sanitized evidence, and locked bootstrap rollback reference. Prior Git ancestry was intentionally not imported. Phase 0 web consumer compatibility remains `DEFERRED_NO_PRODUCER_CONTRACT` under the approved addendum, not PASS; release policy remains separately `BLOCKED`, so this does not authorize product release. |

## Next Action

Assess service-template gaps and authoritative producer contracts before proposing the next Phase 0 sprint; no Phase 1 start or Sprint 002 commitment is implied. Keep release-policy visible and BLOCKED until findings are remediated or receive exact approved unexpired dispositions.
```

### api/docs/SPRINT_INDEX.md

Snapshot nguyên văn từ checkout khi lập hướng dẫn; không phải code T01 đã sửa.

```markdown
# Sprint Index

## Current Sprint

- Sprint: SPRINT-001
- Roadmap phase: Phase 0 — Decision lock and engineering foundation
- Milestone: R0 — Engineering Baseline
- Sprint goal: An engineer can build and verify the initial service baseline with versioned contracts, isolated local PostgreSQL, and one traced, idempotent outbox-to-inbox sample flow.
- Status: COMPLETED
- Publication status: PUBLISHED_VERIFIED
- Published merge: `ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.
- Actual review/closure date: 2026-10-05
- Current execution task: Phase 0 remaining-gate assessment (no next sprint or phase advancement authorized)
- Start date: 2026-08-10 (planned)
- End date: 2026-08-21 (planned)

## Sprint History

| Sprint | Phase | Goal | Status | Result | Review |
| ------ | ----- | ---- | ------ | ------ | ------ |
| SPRINT-001 | Phase 0 | Engineering baseline | COMPLETED; published and verified via PR16 | Owner-accepted technical outcome; Phase 0 open, release policy BLOCKED | [T08 review](sprints/S001-T08_REVIEW_EVIDENCE.md), accepted 2026-10-05 |

## Upcoming Sprint Candidates

| Candidate | Phase | Dependency | Priority | Ready? |
| --------- | ----- | ---------- | -------- | ------ |
| SPRINT-002 — Complete Phase 0 gate | Phase 0 | SPRINT-001 evidence and approved decisions | HIGH | NO |
| SPRINT-003 — Identity walking skeleton | Phase 1 | Phase 0 exit gate passed | HIGH | NO |
```

### api/docs/sprints/S001-T08_REVIEW_EVIDENCE.md

Snapshot nguyên văn từ checkout khi lập hướng dẫn; không phải code T01 đã sửa.

```markdown
# S001-T08 local baseline review evidence

Status: ACCEPTED_LOCAL_REVIEW. The owner accepted corrected C1's technical outcome on 2026-10-05. PR16 delivered that outcome; required postmerge execution checks passed. This does not complete Phase 0 or establish release readiness.

- Published merge: `ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.
- Publication PR: https://github.com/AkaDNT/auction-promax/pull/16
- Postmerge monorepo-required: SUCCESS; https://github.com/AkaDNT/auction-promax/actions/runs/37261367669
- Postmerge supply-chain-verification: SUCCESS; https://github.com/AkaDNT/auction-promax/actions/runs/37261367494

PR16 was merged by the owner on 2026-10-05. Its actual merge has the reviewed base/C2 parents and C2 tree `25903fa703636bd68a1ab8375ec7f4c8661683a0`. A detached published-revision checkout passed the complete decision/closeout suite. C1 runtime evidence below remains bound to C1: it is applicable through the reviewed docs/lifecycle-only C2 delta and identical published tree, not relabeled as a full merge runtime rehearsal. Actual-merge push checks independently prove hosted execution. The separate release-policy check failed and remains BLOCKED; verification success is not vulnerability acceptance.

- Previous review: AkaDNT accepted the earlier C1 technical outcome on 2026-10-05; this does not approve the corrected revision automatically.
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Review date: 2026-10-05
- Approval scope: technical review and truthful closeout preparation only; no vulnerability-risk acceptance, Phase 0 completion or merge authorization.

## Verified revision and scope

- Implementation C1: `c71a49d16a2452268503b4a68eedbfe557e6c7fe`.
- C1 tree: `39a42ee87f7d47db9fbc68b13cd84c0bcd608724`.
- Rehearsal date: 2026-10-05; new detached checkout, fresh builds, scans and live walkthrough.
- Fresh detached LF checkout initially had no dependency directories, Maven target, web build or scanner evidence. Tracked tree/index remained clean after execution.
- Technical identity sample only. No auction/auth consumer compatibility, AWS deployment or production recovery claim.
- Runbook: [Local baseline and Sprint review](../runbooks/LOCAL_BASELINE_SPRINT_001.md).

Detailed command/exit/report records and sanitized scanner artifacts are retained privately. Prior failed scans remain separate from the successful continuation. No raw inventory, credential, environment file or workstation path is included here.

## Six-part review

### 1. Decisions and outstanding risks

The T09 decision suite with `--require-complete --require-closeout` passed on C1, retaining 20/20 approved decision traceability and the pending-T08 lifecycle state. Consumer compatibility remains `DEFERRED_NO_PRODUCER_CONTRACT`, not PASS. Release policy remains BLOCKED; Phase 0 service-template and product/production obligations remain open.

### 2. Clean builds and contracts

Fresh independent contracts, infra and web lockfile installs passed. OpenAPI lint, schema validation, fixture/governance checks and sequential producer Fixture/Registry verification passed. Registry N/N-1 compatibility passed; deliberately breaking fixtures were correctly rejected internally.

Root workflow fixture/repository checks, required-check regressions and hosted supply-chain workflow contract modes passed. CDK CLI 2.1135.1 readiness passed; this is not synthesis/deployment evidence. Web lint/build passed.

Canonical service `mvnw.cmd -B clean verify` passed on corrected C1 before scanning: 113 Surefire and 10 canonical Testcontainers tests, zero failures/errors/skips. Supplementary local integration verification on 2026-10-05 passed 4 tests, zero failures/errors/skips. Canonical reports were retained separately before supplementary verification.

Launcher fixtures passed in PowerShell 7 and Windows PowerShell 5.1. The three new MDC/ECS regression cases explain the increase from the historical 110 unit tests to 113.

Inherited Spring/JVM/Maven configuration override rejection was proved RED then GREEN with real launcher fixtures. The launcher now fails before Maven or environment mutation rather than silently accepting an alternate datasource/Flyway target. Runbook workflow and orchestrator commands were completed and exercised on corrected C1.

### 3. PostgreSQL ownership and Flyway

Bootstrap, privilege verification and status passed on the existing dedicated loopback PostgreSQL 17 instance for the eight-database/24-role topology. This was not a newly empty cluster. No reset was used.

Canonical testcase reports also prove ownership topology, migrator-controlled DDL, runtime DML/denied DDL, Flyway history protection and database readiness. Runtime app and migrator identities remain separate.

### 4. HTTP initial request and replay

The exact C1 runbook HTTP block passed: readiness UP; original/replay HTTP 201 with the same RECORDED sample UUID; same-key/different-body HTTP 409 with `IDEMPOTENCY_KEY_REUSED`; invalid-key HTTP 400 with `VALIDATION_FAILED` and required ProblemDetails fields; non-allowlisted actuator access HTTP 403.

Sample-filtered readonly SQL reached exactly one sample, command, event, published event, inbox receipt and effect within the bounded wait. No global counts, payload dump or manual outbox update was used.

### 5. Delivery integrity and observability

Executed canonical tests include `replayAndDuplicateDeliveryProduceOneEffect`, `concurrentReplayAndExpiredLeaseAreHandled`, `conflictValidationAndForcedRollbackAreSafe` and `failedRelayStateRetainsTheRowAndCanBeRetried`. These provide duplicate delivery/concurrency/rollback/retry proof; HTTP replay alone does not.

Live recorded/replayed INFO events carry the supplied W3C trace; outbox published/inbox applied events share correlation and outbox identity. HTTP/replay and registered relay/inbox metrics passed. No duplicate-correlation formatter error remained. Live duplicate metrics are not claimed from integration-test JVM results.

Owner-authorized observability correction uses scoped MDC as the sole correlation source during sample log emission and restores prior context. Real ECS encoder regressions cover absent, matching and different previous correlation. No use-case, persistence, HTTP or security configuration was changed.

### 6. SBOM, scans and runbook

On 2026-10-05 the existing canonical orchestrator ran against the freshly verified same-C1 artifact with database refresh. Exit 0; authoritative validator accepted exactly seven summaries bound to C1:

```text
executionState = PASS
policyState    = BLOCKED
reviewState    = NOT_REQUIRED
failureCode   = NONE
```

The aggregate policy summary records CRITICAL 0, HIGH 61, UNKNOWN 0, MEDIUM 52, LOW 0. These are dated summary counts, not risk acceptance or expected future counts. Sanitized inventories contain 18 dependency findings, 95 container findings and 0 Gitleaks findings.

Container smoke: readiness UP, linux/amd64, runtime user `10001:10001`, read-only root filesystem, all capabilities dropped and no-new-privileges enabled. Container policy emitted `CONTAINER_SCAN_POLICY_BLOCKED`; no scanner/trust/policy bypass was applied.

Earlier Docker Hub anonymous-token EOF failures are retained as failed evidence, not hidden or substituted with this result. Successful execution does not establish release readiness.

## Accepted retrospective and outcome

- Worked: immutable revision provenance, independent lockfiles/builds, database role boundaries and actual integration/live evidence.
- Failed during rehearsal: problem-response byte decoding, clean scanner database prerequisite, duplicate MDC/ECS correlation and intermittent Docker Hub authentication connectivity.
- Corrected: reviewed runbook decoding/refresh instructions and owner-approved narrow observability regression/fix. Network recovery allowed the unchanged pinned scan to finish.
- Improve: retain immediate exit checks, long-path-capable report enumeration and real formatter coverage; separate execution integrity, vulnerability policy and product maturity.

Accepted outcome: the owner accepted corrected C1's local technical review on 2026-10-05 and authorized consistent T08/Sprint closure preparation. Actual technical review/closure date: 2026-10-05. Outstanding Phase 0 obligations, deferred consumer compatibility and BLOCKED release policy remain unchanged. This acceptance neither accepts vulnerability risk nor authorizes PR merge; subsequent owner merge and postmerge execution verification delivered the outcome through PR16.

Independent final review and owner-shell protection read-back preceded publication; public postmerge checks and exact-revision closeout verification completed afterward. Protection read-back was owner-provided, not a freshly authenticated administration GET by the agent. The deferred Sprint-only phase-mutation regression gap remains; actual documents stay Phase 0. No vulnerability disposition or Phase 0 exit approval is inferred.
```

### .github/workflows/monorepo-verification.yml

Snapshot nguyên văn từ checkout khi lập hướng dẫn; không phải code T01 đã sửa.

```yaml
name: Monorepo verification

on:
  pull_request:
  push:

permissions:
  contents: read

jobs:
  classify:
    name: Classify changed paths
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    outputs:
      api: ${{ steps.paths.outputs.api }}
      web: ${{ steps.paths.outputs.web }}
      contracts: ${{ steps.paths.outputs.contracts }}
      shared: ${{ steps.paths.outputs.shared }}
    steps:
      - name: Check out PR merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
      - name: Install required-check test tooling
        working-directory: api/contracts
        run: npm ci
      - name: Verify classifier and aggregate regressions
        run: node scripts/migration/Test-MonorepoRequiredChecks.mjs
      - name: Classify PR base/head or push before/after
        id: paths
        run: node scripts/migration/MonorepoRequiredChecks.mjs --classify

  api:
    name: Monorepo API gates
    needs: classify
    if: ${{ needs.classify.outputs.api == 'true' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 35
    steps:
      - name: Check out the same merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Set up Temurin Java 21
        uses: actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3 # v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven
      - name: Verify identity-profile-service
        working-directory: api/services/identity-profile-service
        run: |
          chmod +x mvnw
          ./mvnw -B verify
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
      - name: Verify CDK toolchain
        working-directory: api/infra
        run: |
          npm ci
          npm run cdk:version
      - name: Install canonical contract tooling
        working-directory: api/contracts
        run: npm ci
      - name: Verify canonical producer contracts
        working-directory: api/contracts
        run: |
          npm run lint:openapi
          npm run validate:schemas
          npm run test:fixtures
          npm run test:governance
      - name: Reject breaking producer fixture
        shell: pwsh
        run: ./api/scripts/verify-contracts.ps1 -Mode Fixture
      - name: Verify canonical registry
        shell: pwsh
        run: ./api/scripts/verify-contracts.ps1 -Mode Registry
      - name: Verify Linux PowerShell and tool executable handling
        shell: pwsh
        run: |
          ./api/scripts/supply-chain/Test-LinuxHostedPowerShellExecutable.ps1
          ./api/scripts/supply-chain/Test-LinuxToolExecutablePermission.ps1

  web:
    name: Monorepo web gates
    needs: classify
    if: ${{ needs.classify.outputs.web == 'true' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - name: Check out the same merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: web/.nvmrc
          cache: npm
          cache-dependency-path: web/package-lock.json
      - name: Install dependencies
        working-directory: web
        run: npm ci
      - name: Lint
        working-directory: web
        run: npm run lint
      - name: Build production application
        working-directory: web
        run: npm run build

  monorepo-required:
    name: monorepo-required
    needs: [classify, api, web]
    if: ${{ always() }}
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - name: Require every applicable component to succeed
        env:
          CLASSIFY_RESULT: ${{ needs.classify.result }}
          API_REQUIRED: ${{ needs.classify.outputs.api }}
          WEB_REQUIRED: ${{ needs.classify.outputs.web }}
          API_RESULT: ${{ needs.api.result }}
          WEB_RESULT: ${{ needs.web.result }}
        run: |
          node -e '
          const { CLASSIFY_RESULT, API_REQUIRED, WEB_REQUIRED, API_RESULT, WEB_RESULT } = process.env;
          const ok = CLASSIFY_RESULT === "success" &&
            [[API_REQUIRED, API_RESULT], [WEB_REQUIRED, WEB_RESULT]].every(
              ([required, actual]) =>
                (required === "true" || required === "false") &&
                actual === (required === "true" ? "success" : "skipped")
            );
          if (!ok) {
            console.error("MONOREPO_REQUIRED_GATE_FAILED");
            process.exit(1);
          }
          console.log("MONOREPO_REQUIRED_GATE_PASS");
          '
```

### scripts/migration/MonorepoRequiredChecks.mjs

Snapshot nguyên văn từ checkout khi lập hướng dẫn; không phải code T01 đã sửa.

```javascript
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const all = () => ({ api: true, web: true, contracts: true, shared: true });
const validSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^0{40}$/.test(value);

export function classifyChangedPaths(paths) {
  const result = { api: false, web: false, contracts: false, shared: false };
  if (paths.length === 0) return all();
  for (const name of paths) {
    if (typeof name !== "string" || !name || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) return all();
    if (name.startsWith("api/contracts/")) {
      result.api = result.web = result.contracts = true;
    } else if (name.startsWith("api/docs/") || name.startsWith("web/docs/") || name.startsWith("docs/")) {
      // Project documentation does not require component builds.
    } else if (name.startsWith("api/")) {
      result.api = true;
    } else if (name.startsWith("web/")) {
      result.web = true;
    } else {
      result.api = result.web = result.shared = true;
    }
  }
  return result;
}

export function parseNameStatus(bytes) {
  const parts = bytes.toString("utf8").split("\0");
  if (parts.pop() !== "" || parts.length === 0) throw new Error("DIFF_STATUS_INVALID");
  const paths = [];
  for (let index = 0; index < parts.length;) {
    const status = parts[index++];
    if (!/^(?:[AMDT]|R[0-9]{1,3}|C[0-9]{1,3})$/.test(status)) throw new Error("DIFF_STATUS_INVALID");
    const count = /^[RC]/.test(status) ? 2 : 1;
    for (let offset = 0; offset < count; offset++) {
      const name = parts[index++];
      if (!name) throw new Error("DIFF_PATH_INVALID");
      paths.push(name);
    }
  }
  return paths;
}

export function selectDiff(eventName, event, githubSha, git) {
  try {
    if (!validSha(githubSha)) return all();
    let base;
    let head;
    if (eventName === "pull_request") {
      base = event?.pull_request?.base?.sha;
      head = event?.pull_request?.head?.sha;
      if (!validSha(base) || !validSha(head)) return all();
      const mergeBase = git("merge-base", base, head);
      if (!validSha(mergeBase)) return all();
      base = mergeBase;
    } else if (eventName === "push") {
      base = event?.before;
      head = event?.after;
      if (!validSha(base) || !validSha(head) || head !== githubSha) return all();
    } else {
      return all();
    }
    return classifyChangedPaths(parseNameStatus(git("diff", base, head)));
  } catch {
    return all();
  }
}

export function evaluateAggregate({ classify, apiRequired, webRequired, apiResult, webResult }) {
  if (classify !== "success") return false;
  for (const [required, actual] of [[apiRequired, apiResult], [webRequired, webResult]]) {
    if (required !== "true" && required !== "false") return false;
    if (actual !== (required === "true" ? "success" : "skipped")) return false;
  }
  return true;
}

function runGit(kind, base, head) {
  const args = kind === "merge-base" ? ["merge-base", base, head] : ["diff", "--name-status", "-z", "-M", base, head, "--"];
  const result = spawnSync("git", args, { encoding: kind === "merge-base" ? "utf8" : "buffer", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error("GIT_DIFF_UNAVAILABLE");
  return kind === "merge-base" ? result.stdout.trim() : result.stdout;
}

function main() {
  if (process.argv[2] !== "--classify") throw new Error("USAGE: --classify");
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const result = selectDiff(process.env.GITHUB_EVENT_NAME, event, process.env.GITHUB_SHA, runGit);
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT_UNAVAILABLE");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(result).map(([key, value]) => `${key}=${value}\n`).join(""));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
```

### scripts/migration/Test-MonorepoRequiredChecks.mjs

Snapshot nguyên văn từ checkout khi lập hướng dẫn; không phải code T01 đã sửa.

```javascript
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import YAML from "../../api/contracts/node_modules/yaml/dist/index.js";
import {
  classifyChangedPaths,
  parseNameStatus,
  selectDiff,
  evaluateAggregate,
} from "./MonorepoRequiredChecks.mjs";

const sha = (digit) => digit.repeat(40);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("API-only and web-only paths select only their component", () => {
  assert.deepEqual(classifyChangedPaths(["api/services/identity-profile-service/pom.xml"]), { api: true, web: false, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["web/features/auction/index.ts"]), { api: false, web: true, contracts: false, shared: false });
});

test("contract and shared CI paths select both components", () => {
  assert.deepEqual(classifyChangedPaths(["api/contracts/README.md"]), { api: true, web: true, contracts: true, shared: false });
  assert.deepEqual(classifyChangedPaths([".github/workflows/monorepo-verification.yml"]), { api: true, web: true, contracts: false, shared: true });
});

test("docs-only changes skip expensive components while mixed and unknown paths run both", () => {
  assert.deepEqual(classifyChangedPaths(["docs/readme.md", "api/docs/guide.md"]), { api: false, web: false, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["api/src/file.java", "web/src/file.ts"]), { api: true, web: true, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["new-root-policy.txt"]), { api: true, web: true, contracts: false, shared: true });
});

test("NUL status records classify both sides of rename and the deleted path", () => {
  const records = parseNameStatus(Buffer.from("R100\0api/old.java\0web/new.ts\0D\0api/contracts/old.yaml\0"));
  assert.deepEqual(records, ["api/old.java", "web/new.ts", "api/contracts/old.yaml"]);
  assert.deepEqual(classifyChangedPaths(records), { api: true, web: true, contracts: true, shared: false });
});

test("PR classification uses base and head while execution revision stays the merge commit", () => {
  const calls = [];
  const event = { pull_request: { base: { sha: sha("a") }, head: { sha: sha("b") } } };
  const result = selectDiff("pull_request", event, sha("c"), (...args) => { calls.push(args); return args[0] === "merge-base" ? sha("d") : Buffer.from("M\0web/app/page.tsx\0"); });
  assert.deepEqual(result, { api: false, web: true, contracts: false, shared: false });
  assert.deepEqual(calls, [["merge-base", sha("a"), sha("b")], ["diff", sha("d"), sha("b")]]);
  assert.deepEqual(selectDiff("pull_request", event, sha("c"), () => { throw new Error("missing PR head object"); }), { api: true, web: true, contracts: true, shared: true });
});

test("normal push uses before and after; new branch and untrusted diff run all", () => {
  const calls = [];
  const git = (...args) => { calls.push(args); return Buffer.from("M\0api/infra/package.json\0"); };
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("b"), git), { api: true, web: false, contracts: false, shared: false });
  assert.deepEqual(calls, [["diff", sha("a"), sha("b")]]);
  assert.deepEqual(selectDiff("push", { before: sha("0"), after: sha("b") }, sha("b"), git), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("b"), () => { throw new Error("missing object"); }), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: "bad", after: sha("b") }, sha("b"), git), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("c"), git), { api: true, web: true, contracts: true, shared: true });
});

test("CLI classifies a real push diff and writes exact GitHub job outputs", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "s001-t09-classifier-"));
  t.after(() => {
    const resolved = fs.realpathSync(fixture);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith("s001-t09-classifier-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: fixture, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  fs.writeFileSync(path.join(fixture, "README.md"), "baseline\n");
  git("add", "--", "README.md");
  git("-c", "user.name=Task5 Test", "-c", "user.email=task5@example.invalid", "commit", "-qm", "baseline");
  const before = git("rev-parse", "HEAD");
  fs.mkdirSync(path.join(fixture, "web"));
  fs.writeFileSync(path.join(fixture, "web", "page.ts"), "export const value = 1;\n");
  git("add", "--", "web/page.ts");
  git("-c", "user.name=Task5 Test", "-c", "user.email=task5@example.invalid", "commit", "-qm", "web change");
  const after = git("rev-parse", "HEAD");
  const eventPath = path.join(fixture, "event.json");
  const outputPath = path.join(fixture, "outputs.txt");
  fs.writeFileSync(eventPath, JSON.stringify({ before, after }));
  const result = spawnSync(process.execPath, [path.join(root, "scripts/migration/MonorepoRequiredChecks.mjs"), "--classify"], {
    cwd: fixture,
    env: { ...process.env, GITHUB_EVENT_NAME: "push", GITHUB_EVENT_PATH: eventPath, GITHUB_SHA: after, GITHUB_OUTPUT: outputPath },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(outputPath, "utf8"), "api=false\nweb=true\ncontracts=false\nshared=false\n");
});

test("aggregate accepts applicable success and justified skips only", () => {
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "true", webRequired: "false", apiResult: "success", webResult: "skipped" }), true);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "false", webRequired: "false", apiResult: "skipped", webResult: "skipped" }), true);
  for (const result of ["failure", "cancelled", "skipped", "", "timed_out"]) {
    assert.equal(evaluateAggregate({ classify: "success", apiRequired: "true", webRequired: "false", apiResult: result, webResult: "skipped" }), false, result);
  }
  assert.equal(evaluateAggregate({ classify: "failure", apiRequired: "true", webRequired: "true", apiResult: "success", webResult: "success" }), false);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "", webRequired: "true", apiResult: "skipped", webResult: "success" }), false);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "false", webRequired: "false", apiResult: "success", webResult: "skipped" }), false);
});

test("required workflow owns one unique always-concluding check without PR path filters", () => {
  const directory = path.join(root, ".github/workflows");
  const names = fs.readdirSync(directory).filter((name) => /\.ya?ml$/.test(name));
  const workflows = names.map((name) => YAML.parse(fs.readFileSync(path.join(directory, name), "utf8")));
  const requiredOwners = (items) => items.flatMap((item) => Object.entries(item.jobs ?? {}).filter(([jobId, job]) => (job.name ?? jobId) === "monorepo-required"));
  const owners = requiredOwners(workflows);
  assert.equal(owners.length, 1);
  const duplicateById = { jobs: { "monorepo-required": { steps: [] } } };
  assert.equal(requiredOwners([...workflows, duplicateById]).length, 2);
  const workflow = YAML.parse(fs.readFileSync(path.join(directory, "monorepo-verification.yml"), "utf8"));
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  assert.equal(workflow.on.pull_request?.paths, undefined);
  assert.equal(workflow.on.pull_request?.["paths-ignore"], undefined);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.jobs["monorepo-required"].if, "${{ always() }}");
  assert.deepEqual(workflow.jobs["monorepo-required"].needs, ["classify", "api", "web"]);
  assert.ok(workflow.jobs["monorepo-required"].steps.every((step) => !step.uses));
  assert.equal(workflow.jobs.classify.steps[0].with["fetch-depth"], 0);
  assert.equal(workflow.jobs.classify.steps[0].with.ref, undefined);
  assert.ok(workflow.jobs.classify.steps.some((step) => step.run === "npm ci" && step["working-directory"] === "api/contracts"));
  assert.ok(workflow.jobs.classify.steps.some((step) => step.run === "node scripts/migration/Test-MonorepoRequiredChecks.mjs"));
  assert.equal(workflow.jobs.api.steps[0].with.ref, undefined);
  assert.equal(workflow.jobs.web.steps[0].with.ref, undefined);
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    assert.equal(job["runs-on"], "ubuntu-24.04", jobName);
    assert.ok(Number.isInteger(job["timeout-minutes"]) && job["timeout-minutes"] > 0, jobName);
    for (const step of job.steps) {
      assert.notEqual(step["continue-on-error"], true, jobName);
      if (step.uses) {
        assert.match(step.uses, /^actions\/(?:checkout|setup-node|setup-java)@[0-9a-f]{40}$/);
        if (step.uses.startsWith("actions/checkout@")) assert.equal(step.with?.["persist-credentials"], false);
      }
    }
  }
  const codeownersText = fs.readFileSync(path.join(root, ".github/CODEOWNERS"), "utf8");
  for (const pathname of ["/api/**", "/api/contracts/**", "/api/infra/**", "/web/**", "/.github/workflows/**", "/.github/CODEOWNERS"]) {
    assert.ok(codeownersText.split(/\r?\n/).includes(`${pathname} @AkaDNT`), pathname);
  }
});

test("API job runs both Linux-hosted PowerShell and executable-permission proofs", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/monorepo-verification.yml"), "utf8"));
  const step = workflow.jobs.api.steps.find((candidate) => candidate.name === "Verify Linux PowerShell and tool executable handling");
  assert.ok(step, "Task 6 Linux proof step is required in the API job");
  assert.equal(step.shell, "pwsh");
  assert.match(step.run, /\.\/api\/scripts\/supply-chain\/Test-LinuxHostedPowerShellExecutable\.ps1/);
  assert.match(step.run, /\.\/api\/scripts\/supply-chain\/Test-LinuxToolExecutablePermission\.ps1/);
});

test("the actual aggregate job command rejects required failures and accepts docs-only skips", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/monorepo-verification.yml"), "utf8"));
  const command = workflow.jobs["monorepo-required"].steps[0].run;
  const source = command.match(/^node -e '\n([\s\S]*?)\n'\s*$/)?.[1];
  assert.ok(source, "aggregate command must be executable Node.js with no checkout");
  const run = (env) => spawnSync(process.execPath, ["-e", source], { env: { ...process.env, ...env }, encoding: "utf8" }).status;
  const baseline = { CLASSIFY_RESULT: "success", API_REQUIRED: "true", WEB_REQUIRED: "false", API_RESULT: "success", WEB_RESULT: "skipped" };
  assert.equal(run(baseline), 0);
  assert.equal(run({ ...baseline, API_RESULT: "skipped" }), 1);
  assert.equal(run({ ...baseline, API_RESULT: "cancelled" }), 1);
  assert.equal(run({ ...baseline, WEB_RESULT: "success" }), 1);
  assert.equal(run({ ...baseline, API_REQUIRED: "" }), 1);
  assert.equal(run({ CLASSIFY_RESULT: "success", API_REQUIRED: "false", WEB_REQUIRED: "false", API_RESULT: "skipped", WEB_RESULT: "skipped" }), 0);
});
```

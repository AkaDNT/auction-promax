Cách dùng trong session đầu

Lưu prompt tại:

docs/SPRINT_DELIVERY_AGENT_PROMPT.md

Sau đó gửi cho agent:

======INITIALIZE SPRINT DELIVERY

Use docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md as the architecture and roadmap source of truth.

Inspect the current repository before planning.

Determine the actual current roadmap phase and active milestone.

Create the persistent delivery, sprint, and production-coverage files defined in the prompt.

Plan only Sprint 001 in task-level detail.

Assume one developer, a two-week sprint, and 45–50 effective engineering hours.

Each committed task should normally require 2–8 focused hours.

Do not implement code yet.

End with exactly one immediate next action.
Các session triển khai tiếp theo

Chỉ cần gửi:

======CONTINUE CURRENT SPRINT

Read the blueprint, DELIVERY_STATE.md, SPRINT_INDEX.md, and the active sprint file.

Continue the first unblocked task in sprint order.

Do not replan completed work, pull future-phase scope, or start another major task after finishing the current one.

Run verification, update task evidence and project state, then end with exactly one immediate next action.

====================Khi muốn giao chính xác một task cho coding agent:

IMPLEMENT TASK S001-T03

Read the task specification and all dependencies first.

Implement only this task and its tightly coupled subtasks.

Do not modify unrelated modules or begin the next task.

Run all required tests and verification commands.

Update the sprint file, DELIVERY_STATE.md, and PRODUCTION_COVERAGE.md with actual evidence.

Report changed files, migrations, contracts, verification results, unresolved risks, and rollback steps.

End with exactly one immediate next action.

Khi hết sprint:

======CLOSE SPRINT

Evaluate the Sprint Goal, every committed task, sprint acceptance criteria, blueprint traceability, and verification evidence.

Return PASS, PARTIAL, or FAIL.

Do not move incomplete tasks to DONE.

Update the phase exit-gate progress, PRODUCTION_COVERAGE.md, SPRINT_INDEX.md, DELIVERY_STATE.md, and sprint retrospective.

Recommend one goal for the next sprint, but do not create its detailed backlog until PLAN NEXT SPRINT is requested.

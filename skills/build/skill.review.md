# @review — audit the completed cycle

Compare the accepted contracts, TDD list, code, tests, demos, and documentation.
Search for contract drift, missing test coverage, unproved branches, stale comments,
dead files, convention violations, and edits outside the assigned scope.

Classify each finding:

- `DOC_STALE`: correct the documentation and verify it;
- `CODE_WRONG`: return to the affected TDD or RED phase;
- `PLAN_OPEN`: record the unresolved work in the active plan;
- `ARBITRATION`: return the decision to Design Dialogue.

Run `node --check` where applicable, enforce the 200-line ceiling, and run
`git diff --check`. Finish only when the second comparison finds no new divergence.

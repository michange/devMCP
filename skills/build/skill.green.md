# @green — prove the focused implementation

Run the tests accepted by `@tddList` against the checked `@implementation` until the
focused suite is green.

## Retry loop

1. Run the narrowest focused test command that covers the change.
2. If it fails, diagnose the failure and apply one relevant correction.
3. Retry only when the diagnosis yields a new corrective action; never repeat an
   unchanged attempt.
4. Stop after three failed attempts, or immediately when a correction would change
   the accepted contract, architecture, or test plan.
5. Report the passing command, test count, and corrections, or report each attempt
   and the remaining blocker.

Do not weaken assertions to obtain GREEN. A behavioral correction that changes the
accepted test plan returns to Design Dialogue and RED.

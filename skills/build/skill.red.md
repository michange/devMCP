# @red — prove the missing behavior

Write only the tests and fixtures accepted by `@tddList`, then prove that they fail
because the requested behavior is missing or incorrect.

## Procedure

1. Run the focused new tests.
2. Confirm that each failure exercises the intended contract boundary.
3. Repair syntax, path, fixture, or harness defects and rerun.
4. If a test is already green, stop and report that it does not prove new behavior or
   that the behavior already exists.

## Output

Report the command, the relevant failure, and why that failure proves RED. Do not
write runtime implementation during this step.

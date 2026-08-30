# @regression — prove the complete Enigma suite

Run the full Enigma suite after focused GREEN. Use the environment required by the suite
and distinguish product failures from sandbox, dependency, or harness failures.

## Retry loop

1. Run `npm test`.
2. If it fails, isolate the smallest failing test and diagnose the failure.
3. Apply a correction only when it remains inside the accepted contract and scope.
4. Rerun the isolated test, then rerun the complete suite.
5. Retry only when the diagnosis yields a new corrective action. Stop after three
   failed attempts, or immediately when a user decision or scope expansion is needed.

Report the full-suite command and result. Confirm that every new test also runs alone.

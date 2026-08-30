# @runTestsOneByOne — run tests one by one

Execute each test case individually, sequentially, stopping at first failure.

## Tool
`devMCP:run_tests_one_by_one` — runs a single test from a file by rank (0-indexed).

## Procedure
Loop from rank 0:
1. Call `devMCP:run_tests_one_by_one` with path and rank
2. Report: `[rank/total] name::PASS` or `name::FAIL`
3. If FAIL → stop, show vitest output
4. If PASS → increment rank, continue
5. When done → summary

## When to use
- Debug — origin of failure unclear
- Flaky tests — pass alone, fail together
- New test file — validating independence
- Finding slow tests

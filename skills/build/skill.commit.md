# @commit — commit

Commit completed deliverable with test gate.

## Test Gate (default: ON)

**BLOCKED** unless all tests pass for current deliverable.

Before committing, verify:
1. Run the full Enigma suite with `npm test`.
2. Confirm all passing
3. If ANY test fails → **DO NOT COMMIT**

## Procedure

1. Read and apply [`manage-plan`](../manage-plan/SKILL.md) completely.
2. Before staging, read the current JSON directly, prepare the next SemVer snapshot for the exact
   todo being committed, then publish it locally with `write_plan`. Mark its acquired phases,
   `COMMIT` complete, and its final status.
3. Run test gate.
4. List files changed with `git status --short`.
5. Stage the named deliverable files, the new plan JSON, its derived HTML, and the preceding JSON's
   move into `plans/archive/`, then commit.

`write_plan` guarantees only a coherent local plan; it never stages, commits, pushes, or rolls Git
back. If the Git commit fails, leave the coherent local plan in place and correct or retry the commit.

Stage only the named paths. Never use `git add -A`.

**No parentheses in commit messages** — causes parsing failures.

## Commit Message Format

`{type} {scope} -- {description}`

For a commit that updates the plan, append literal Git trailers:

```js
const commitMessage = `${subject}

Plan-CLI: ${cliName}
Plan-Session: ${sessionID}
Plan-Worktree: ${branchName}
Plan-WP: ${wp}
Plan-Todo: ${todo}`
```

### type
`feat`, `fix`, `test`, `refactor`, `docs`

### scope
Module or test name. Examples: `T64`, `dontOver.js`, `dev.js`

### Examples
```
T64 pull undeclared throws -- all verbs now consistent
T65 dev stub mode -- stub true auto-stubs undeclared flags
fix source links -- default logger, proxy targets, shared renderer
docs manual 04-flags -- add undeclared section
```

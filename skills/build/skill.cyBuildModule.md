# cy-1 :: cyBuildModule

Build a module from spec to green tests + demo + review + commit.

## Modes

A mode is never inferred, and asking an open question is not enough either. Before the first step,
propose the three modes to the user in the chat, as plain text and in this order: `gated`, `auto`,
and one `ungate([…])` configuration whose step list is already filled in for the scope at hand.
Recommend one of the three, in one sentence, on the evidence of that scope — the size of the runtime
change, whether public behavior moves, and whether a contract or a demo is affected. Then wait for
the answer, and start no step before receiving it.

The `ungate([…])` proposal names concrete steps rather than inviting the user to compose a list. A
proposal with an empty or generic step list is not a proposal.

| Mode                        | Trigger | Behavior                                                                                                          |
|-----------------------------|---------|-------------------------------------------------------------------------------------------------------------------|
| **gated**                   | `cyBuildModule gated` | Stop after each step. Present output. Wait for explicit `[y]` before advancing.                                   |
| **auto**                    | `cyBuildModule auto` | Run every step through `commit` without stopping. Keep `push` gated.                                              |
| **ungate(selectedSteps[])** | `ungate([step, ...])` | Run selected steps without checkpoints, then resume gated mode. |

## Steps

| Skill            | Checkpoit with user in gated mode                        |
|------------------|----------------------------------------------------------|
| preRead          | Present findings                                         |
| purpose          | Present deliverable definition                           |
| requirements     | Present the tagged obligations of the contract           |
| architecture     | Present doc — see Document presentation                  |
| behavior         | Present doc — see Document presentation                  |
| toBeFs           | Present file structure                                   |
| tddList          | Present test plan doc — see Document presentation        |
| red              | Develop test code, run tests, and confirm RED            |
| implementation   | Present the minimal runtime change                       |
| matchConventions | Check file size, imports, and naming before GREEN tests  |
| green            | Present source code that has passed the tests            |
| regression       | Report results of the full test suite                    |
| demoDocs         | Run the UI test demo, present the demo, and present each written document — see Document presentation |
| review           | Audit code against docs and fix divergences or test gaps |
| commit           | Run `git add` and commit with a structured message       |
| push             | Push the accepted local commit and report                |

## Steps, plan phases, and declared cycles

The plan records nine phases; this pilot runs sixteen steps. A phase completes when its last
constituent step is accepted, so intermediate steps can be ungated without changing the plan's shape.

| Plan phase | Steps |
|------------|-------------------------------------------|
| PRE-READ   | `preRead`                                 |
| PURPOSE    | `purpose`, `requirements`, `architecture`, `behavior`, `toBeFs` |
| TEST PLAN  | `tddList`                                 |
| RED        | `red`                                     |
| GREEN      | `implementation`, `matchConventions`, `green` |
| REGRESSION | `regression`                              |
| DEMO/DOCS  | `demoDocs`                                |
| REVIEW     | `review`                                  |
| COMMIT     | `commit`                                  |

`push` has no plan phase. It is an authorization, not a construction step.

A todo declares the cycle it follows, and that cycle decides which steps run:

| Cycle           | Steps that run                                                                  |
|-----------------|---------------------------------------------------------------------------------|
| `none`          | every step; the todo declares nothing and the plan requires nothing of it        |
| `text`          | `preRead`, `purpose`, `requirements`, `demoDocs`, `review`, `commit`            |
| `restructuring` | every step except `tddList` and `red`                                           |
| `complete`      | every step                                                                      |

Under `text`, the PURPOSE phase runs `purpose` and `requirements`: `architecture`, `behavior` and `toBeFs` have no
object for a document. A skill, a contract or a briefing has no test plan and no RED either, because
no assertion can fail on a writing rule.

Mark every phase the declared cycle leaves out `skipped` when the todo is written, not after the
cycle has run. A phase the cycle excludes is not waiting, it will not happen.

## Document presentation

Four steps produce a document instead of a chat message: `@architecture`, `@behavior`,
`@tddList`, and `@demoDocs`. Each of them writes its document to a file before opening its
checkpoint, and a document that stays inside the chat is not presented at all.

Presenting a document means performing these three actions, in this order, at the checkpoint:

1. Write the document to its file. The file is the authority; the chat never carries a
   variant of the text that the file does not contain.
2. Emit an active link on its absolute path in the chat, written as a Markdown link whose
   target is the absolute path, so that the user opens it in one click.
3. Open the same absolute path in the IDE by calling the devMCP `open_in_ide` tool. Pass the
   `line` argument when a single section is under discussion.

The chat then carries only the accepted decisions in a few lines, never the whole document
body. A step that writes several documents links and opens each of them.

## Gated mode

After each step, present output in this format:

```
## @{stepName} — {moduleName}

{step output}

→ [y] @{nextStep} | [auto] run through commit | [d] dialogue | [skip] skip optional step
```

**Do not advance until the user responds.** The user may:
- `[y]` — approve, advance to next step
- `[auto]` — run through `@commit` without intermediate checkpoints
- `[ungate(selectedSteps[])]` — switch to auto mode for all selectedSteps
- `[d]` — discuss, ask questions, request changes before advancing
- `[skip]` — skip only an optional step whose own skill permits it

## Auto mode

Run every step through `@commit` in order. Apply the retry loop below when a step
fails. `@push` remains gated and runs only when explicitly requested.
At the end, present:

```
## cyBuildModule complete — {moduleName}

| Step | Status |
|---|---|
| @purpose | ✓ |
| @architecture | ✓ |
| @behavior | ✓ |
| ... | ... |
| @review | ✓ |
| @commit | ✓ |
| @push | pending / ✓ |

{count} tests passing. {files created}. Commit: {hash}

→ [d] dialogue
```

## Ungated mode

`ungate(selectedSteps[])` removes the user checkpoint only for the named steps.
Run those steps in sequence without waiting for `[y]`, then resume gated mode at the
next step that is not selected. Preserve every step's required checks and outputs.
`@push` cannot appear in `selectedSteps[]`.

## Unattended retry loop

When a step fails in `auto` or `ungate`, diagnose the failure, apply a relevant
correction, and retry it. Retry only when the diagnosis yields a new corrective
action; never repeat the same attempt unchanged. Stop after three failed attempts,
or immediately when the failure requires a user decision, and report the attempts
and remaining blocker.

## Guidelines
- Each step follows its own skill file in this folder (skill.{name}.md)
- Steps are sequential — don't skip ahead in gated mode
- @red must prove the missing behavior before runtime implementation begins.
- @implementation writes runtime code only after RED has been accepted.
- @matchConventions runs after @implementation and before @green. Split a JavaScript file at 201 lines.
- @green runs only the focused tests accepted by @tddList.
- @regression runs the complete Enigma suite after focused GREEN.
- @demoDocs verifies only demos and documentation required by the accepted scope.
- @behavior persists accepted behavior in the applicable Markdown contract, never in a derivative HTML authority.
- @review returns `CODE_WRONG` findings to the affected TDD or RED phase.
- @commit uses ASCII messages only — no special characters to avoid shell escaping issues
- @push runs after the local @commit and always requires explicit authorization.

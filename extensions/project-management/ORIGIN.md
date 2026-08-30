# Provenance of ./plan/

The eight modules under `plan/` are a **verbatim copy**, taken on 30 August 2026, of

    /Users/mic/PhpstormProjects/dontOver/enigma/tools/plan-mcp/

minus `server.js`, which is not needed: devMCP is the server.

    attribute-errors.js  check-shape.js  plan-context.js  plan-lock.js
    plan-writer.js       render-plan.js  stub-contracts.js  validate-plan.js

They import nothing but node builtins and each other, which is what makes the copy possible.

## Why a copy rather than an import

Importing across repositories makes the tool vanish silently the day `dontOver/enigma` moves:
the devMCP extension loader catches the failure and writes one line to stderr that nobody reads.
A copy cannot disappear. The price is drift, and the rule below is what pays it.

## The rule

`enigma` remains the authority on the plan format — the nine Cybuild steps, the cycle vocabulary,
the status coherence checks and the HTML projection. Any change made here that is not specific to
devMCP must be carried back there, and any change made there must be copied here. Compare with:

    diff -r extensions/project-management/plan \
            /Users/mic/PhpstormProjects/dontOver/enigma/tools/plan-mcp \
      --exclude server.js

## Known limit — the first plan

`write_plan` publishes the *next* plan. `acquire()` looks for `plans/plan-<baseVersion>.json`, and
an empty `plans/` directory yields `PLAN_STALE` with `currentVersion: null`. Bootstrapping a
repository therefore means writing one seed `plans/plan-0.0.0.json` by hand, then publishing the
real first plan through this tool against `baseVersion: "0.0.0"` — so that the plan that matters is
validated by the tool and the seed lands in `plans/archive/`.

## Divergence from enigma — version status is now checked

Recorded 30 August 2026. **This copy differs from `enigma/tools/plan-mcp/validate-plan.js`.**

Upstream, `checkChildStatus` enforces two claims — a complete parent holds no unfinished child,
an unstarted parent holds no started child — and `validateWorkPackage` applies them to every todo.
`validateVersion` never applied them at all: a version could be declared `complete` above a work
package still `active`, or `planned` above one already `complete`, and publish without a word.

Two changes fix it:

- `validateVersion` now calls `checkChildStatus` on each work package, passing `'work package'`
  as the child kind so the message names what the reader must go and change.
- `STARTED` gains `active`. `in-progress` is a todo's word for started work and `active` is a work
  package's; neither status exists in the other's vocabulary, so one set serves both levels. Without
  this, a `planned` version holding an `active` package would still have slipped through.

Five cases in `project-management.test.js` hold it, under `version status against its work packages`.

Per the rule above, this belongs upstream. It is not carried back yet, and it may refuse plans that
already exist in the enigma repository — any version marked `complete` above a package that was
never closed will stop publishing until one of the two statuses is corrected.

## Divergence from enigma — a todo declares its cycle

Recorded 31 August 2026. **Two modules exist here and not upstream**, and four of the copied ones
differ.

`plan/yaml.js` reads the YAML subset a cycle declaration uses. Node parses no YAML and devMCP has no
runtime dependency, so the parser lives here. It covers nested keys, lists of mappings, booleans and
strings, and refuses anything else with its line number.

`plan/cycles.js` discovers cycle directories, checks the shape of each declaration, indexes them by
name, and resolves a name to a cycle or, failing that, to a skill. It carries `CYPHASES`, the nine
phases, built in rather than read from disk: a caller supplying no cycle index must still validate a
todo that declares nothing, so that todo's validity cannot depend on a file being found.

The four modified modules:

| Module | Difference |
|---|---|
| `validate-plan.js` | no longer holds the nine phase names or the five cycle presets; `checkCybuild` takes the resolved cycle and checks length, step names in position, and that `skipped` falls on a step the cycle declares skippable |
| `plan-context.js` | builds `cycles` and `skills` beside `branches` and `worktrees`, scanning devMCP's `skills/` then the project's on every call |
| `plan-writer.js` | an unfinished todo declaring no cycle receives `cycle: dialogue` as the plan is published; a completed todo is untouched |
| `render-plan.js` | `renderPlanHtml` takes the cycle index as a second argument and marks gated steps; without the index it renders unmarked |

A `diff -r` against enigma reports `yaml.js` and `cycles.js` as present on one side only. They are
not an incomplete copy: nothing upstream corresponds to them.

`docs/dev-mcp-plans.md` defines what a cycle is, how one is declared and how a name resolves.
Thirty-two cases hold this behaviour, in `yaml.test.js`, `cycles.test.js` and
`cycle-declaration.test.js`.

Per the rule above, this belongs upstream. It is not carried back yet, and it is the second
outstanding divergence.

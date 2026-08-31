# Plans, cycles and steps

A **plan** is a JSON document describing what a project builds. It holds versions, each holding work
packages, each holding todos, each holding its own todos in turn. `write_plan` validates a plan and
publishes it; `validate-plan.js` decides what a valid plan is. This document defines how a todo
declares the way its work is carried out.

## A cycle is a named sequence of steps

A **step** is one unit of work driven by one skill. A **cycle** is an ordered sequence of steps under
a name. Each step declares two things about itself: whether it stops for a human approval before the
next one begins — it is **gated** — and whether it may be left out of a run — it is **skippable**.

Nothing about a cycle is privileged. The nine phases that plans have tracked until now are a cycle
named `cyPhases`, sitting beside every other, and the sixteen-step build cycle is one named
`cyBuild`.

## Where a cycle is declared

A cycle is a directory holding a YAML file of the same name:

    skills/cycles/cyBuild/cyBuild.yaml

The directory holds the skills its steps refer to, either as files of its own or as symbolic links to
skills that already exist elsewhere in `skills/`. A skill that lives outside the repository is copied
in rather than linked to, on the same reasoning that put `plan/` here: a link disappears the day its
target moves, and the failure is silent. A step names its skill by file name, resolved
inside the cycle's directory, so a cycle is movable and readable on its own.

devMCP ships two cycles and one default skill.

`dialogue` is not a cycle. It is a skill, and it is what an unfinished todo declares when nothing
else is chosen: a piece of work whose shape is not settled is a conversation before it is a
sequence. It resolves through the fallback described below, so no cycle file exists for it. A
project that means something else by an ordinary todo defines a cycle named `dialogue`, which wins
over the skill.

`cyPhases` holds the nine phases plans have tracked until now, under the names they already carry.
It exists so that a plan written before this document keeps validating, and so that a todo can still
ask for that sequence by name.

`cyBuild` holds the sixteen steps of the build cycle, each linking a skill that already lives in
`skills/build/`. A project declares its own by
placing directories in its `skills/cycles/`.

## The shape of the file

```yaml
name: cyBuild
description: Build a module from spec to green tests, demo, review and commit.
steps:
  - name: preRead
    skill: skill.preRead.md
    gated: true
    skippable: false
  - name: tddList
    skill: skill.tddList.md
    gated: true
    skippable: true
```

`steps` is a list, not a mapping, because the order is the order of execution and a list is the only
form that carries it. Every step has the same four keys, so reading one requires knowing nothing
about the others.

The file is read by a parser covering the subset used here — nested keys, lists, booleans and
strings. Anything outside that subset is refused with the line that carries it, rather than accepted
approximately. devMCP has no runtime dependency, and this keeps it that way.

## How a cycle is found

`plan-context.js` scans `skills/cycles/` in the project, then the cycles devMCP ships, and indexes
them by name. A project cycle wins over a devMCP cycle of the same name, which lets a project
redefine a shipped cycle without editing it.

The scan runs on every call, like the git queries beside it and like `devmcp.config.json` in the
write gate. A cycle added to the directory is visible on the next call, with no restart. The scan
belongs to the plan context and exposes no MCP tool of its own.

`validate-plan.js` never reads the filesystem. It receives the index in its `context`, beside
`branches`, `worktrees` and `referenceExists`, and this is what keeps it a pure function.

## How a todo declares its cycle

A todo carries one optional `cycle` field holding one name:

```json
"cycle": "cyBuild"
```

The name is resolved in two attempts. A cycle of that name is used when one exists. Otherwise the
name is taken to be a skill, and the todo runs that single skill — a step without a sequence around
it. When neither resolves, the todo is refused, and the error names both the cycle looked for and the
skill looked for, so the reader knows which of the two was intended.

A name is never a path. Paths break when a directory moves, and a cycle shipped by devMCP has no
stable path inside a project.

An absent `cycle` means `cyPhases`.

### What a publication writes

On every publication, a todo that is **not complete** and declares no cycle receives
`cycle: dialogue`, and its tracking array is rewritten to that cycle. A todo that is complete keeps
what it holds: its record is the account of finished work, and giving it another method would claim
it was carried out a way it was not.

A todo therefore adopts the default the first time its plan is published after the work started, and
a plan nobody publishes holds whatever it holds. Validation reads only what a todo declares.

## What the todo tracks

A todo's `cybuild` array records where the work stands. It holds one entry per step of the declared
cycle, in that cycle's order, each with a status among `pending`, `in-progress`, `complete` and
`skipped`.

A todo declaring nothing follows `cyPhases` and holds its nine entries. A todo declaring `cyBuild` holds sixteen. The field is named `cybuild` whatever the cycle it records.

Only a step the cycle declares `skippable` may be marked `skipped`.

## What changes a cycle

`write_plan` is the only writer. Assigning a cycle to a work package means writing that cycle onto
each of its todos, since the work package itself carries no cycle: its fields remain `name`,
`status`, `execution`, `contracts` and `todos`. Editing a published plan by hand is not a supported
operation, and the HTML projection beside it is disposable output, never a source.

## What happens when a plan is published

`write_plan` receives a candidate plan and the version it is based on. Before validating anything,
`plan-context.js` builds the context: it asks git for the branches and the worktrees, it prepares
`referenceExists` for contract paths, and it builds the cycle index. Building that index means
listing the directories under the project's `skills/cycles/`, then those devMCP ships, reading each
YAML file through the subset parser, and keeping one entry per name — the project's entry when both
define the same name.

`validatePlan` then walks the plan and pushes an entry onto a shared `errors` array for every
problem it meets. It never throws and never stops at the first fault, so one refusal reports
everything wrong with the plan.

At each todo, the walk resolves the `cycle` field. An absent field resolves to `cyPhases`. A
name matching an entry of the index resolves to that cycle. A name matching no cycle is looked up as
a skill, and a todo whose name resolves to a skill runs that skill as its single step. A name that
resolves to neither is an error naming both lookups.

The resolved cycle then decides what the todo's `cybuild` array must contain: one entry per step, in
the cycle's order, each entry's `step` equal to that step's name and its `status` one of `pending`,
`in-progress`, `complete` and `skipped`. A `skipped` status on a step the cycle does not declare
`skippable` is an error, because skipping a mandatory step is a claim the cycle forbids.

When the errors array is empty, the plan is published: the previous plan moves to `plans/archive/`,
the new one is written under its version, and the HTML projection is rendered beside it. When it is
not, nothing is written and the errors are returned.

### Errors and edge cases

A cycle file that the subset parser cannot read fails the whole context, not one todo, and names the
file and the line. A cycle file the parser reads but whose shape is wrong — no `name`, no `steps`, a
step without a name — is refused the same way. Both are faults in devMCP's own configuration or the
project's, not in the plan being published, and reporting them against a todo would send the reader
to the wrong file.

A missing `skills/cycles/` directory is not an error. The project simply declares no cycle of its
own, and only the cycles devMCP ships are available.

A cycle declaring no step is refused when it is read, because a todo following it could hold no
tracking entry and the plan would record nothing.

A todo whose `cybuild` array is the right length but whose step names are in the wrong order is
refused per entry, naming the expected step at that position, so the reader repairs the array rather
than guessing which entry moved.

### Flow

    write_plan(plan, baseVersion)
      -> plan-context: git branches, git worktrees, referenceExists, cycle index
      -> validatePlan(plan, context)
           for each todo:
             cycle field -> cycle index -> cycle
                         -> skills      -> single-step cycle
                         -> neither     -> error naming both lookups
             cybuild array checked against the resolved cycle's steps
      -> errors empty ? archive previous, write plan, render HTML
                      : write nothing, return errors

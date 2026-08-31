# Provenance of devMCP/skills/

Copied verbatim from

    /Users/mic/PhpstormProjects/dontOver/enigma/skills/

and verified byte for byte at the time of copying.

## Why this directory exists

devMCP implements part of Enigma's method as tools. `write_plan` implements `manage-plan`;
`run_tests_one_by_one` implements `skill.runTestsOneByOne.md`; and `validate-plan.js` enforces the
vocabulary that `skill.cyBuildModule.md` and `build/` define — the nine plan phases, the sixteen
cycle steps, the cycle names.

A tool cannot enforce a contract it does not carry. When devMCP extends that vocabulary — and
CR-001 does — the skill text has to move with the code, or the tool accepts a form nothing
documents. **This directory is where devMCP diverges from Enigma, on purpose and in the open.**

## What was copied, and why each one

| Path | Reason |
|---|---|
| `manage-plan/SKILL.md` | the contract `write_plan` implements |
| `manage-plan/references/plan-template.md` | the plan shape `validate-plan.js` checks |
| `manage-plan/agents/openai.yaml` | ships with the skill |
| `skill.cyBuildModule.md` | defines the nine phases and the sixteen steps the `cycle` field names |
| `build/` — sixteen files | the step skills `cyBuildModule` refers to; `steps` in a custom cycle names exactly these |
| `skill.runTestsOneByOne.md` | the contract `run_tests_one_by_one` implements |
| `dialogue.skill.md` | the skill a todo runs when it declares no cycle |
| `lisibilite.skill.md` | required reading of `dialogue.skill.md` |

`skill.cyBuildModule.md` and `build/skill.cyBuildModule.md` are identical in Enigma. Both were
copied so that either path resolves, as it does upstream.

## What was deliberately not copied

`tdd-list`, `requirement-traceability`, `worktree`, `session-restart`, `skill.getStatus.md`, and
everything under `archive-do-not-use-without-user-permission/`. They are method, not devMCP tooling:
devMCP neither implements them nor enforces their vocabulary. They stay in Enigma and are read from
there.

`dialogue.skill.md` and `lisibilite.skill.md` are the exception, and the reason is that devMCP does
drive them. A todo that declares no cycle runs the `dialogue` skill, so the skill has to be present
wherever devMCP is installed, and `dialogue` names `lisibilite` as required reading.

One borderline case, left out on purpose: `skill.ò.cyMicrobuild.md`. It is a second pilot, and the
`cy` field introduced by CR-001 exists so a todo can one day name it. It is not implemented by
devMCP and no plan names it yet. Copy it the day a plan does — and note that until then, its name
would live in devMCP's validator while its text lives in Enigma.

## The rule

Enigma remains the origin, not the authority. These files are expected to diverge, and each
divergence is recorded below with its reason. What is *not* acceptable is silent drift: a change
made here that Enigma would want, and that nobody wrote down.

Compare a single path:

    diff devMCP/skills/<path> /Users/mic/PhpstormProjects/dontOver/enigma/skills/<path>

Compare everything copied:

    cd devMCP/skills && for f in $(find . -type f -not -name ORIGIN.md | sed 's|^\./||'); do
      cmp -s "$f" "/Users/mic/PhpstormProjects/dontOver/enigma/skills/$f" || echo "diverged: $f"
    done

## Divergences

### `dialogue.skill.md` is `design-dialogue.skill.md` renamed

The file is Enigma's `design-dialogue.skill.md`. Two strings differ: the `name` of its front matter
and the `skDD` shortcut row, both reading `dialogue` here. A skill is resolved by file name, so the
front matter has to agree with it.

Its link to `ockham-memes.pdf` has no target here. That file is 1.23 MB, more than twice this whole
repository, for an illustration of a table the text carries in full.

Compare with:

    diff <(sed 's/^name: dialogue$/name: design-dialogue/; s/^skDD   dialogue$/skDD   design-dialogue/' \
            dialogue.skill.md) \
         /Users/mic/PhpstormProjects/dontOver/enigma/skills/design-dialogue.skill.md

### `lisibilite.skill.md` is copied verbatim

`dialogue` requires it. No difference.

### `requirements` is a step Enigma does not have

`build/skill.requirements.md` exists here only. It turns an accepted purpose into the contract's
atomic obligations, each tagged, before any structure is proposed — a design answers obligations,
and obligations written after a design describe that design instead of the need.

It sits between `purpose` and `architecture`, inside the PURPOSE phase, so the plan still records
nine phases. Both copies of `skill.cyBuildModule.md` differ from Enigma accordingly: the step table
gains a row, the phase table lists it under PURPOSE, the pilot runs sixteen steps rather than
fifteen, and the `text` cycle runs it beside `purpose` — a skill or a contract is precisely the kind
of deliverable whose obligations are worth stating.

Enigma covers the same ground with `requirement-traceability`, which is not copied here. That skill
governs the whole traceability audit, from contract tags to the TDD list's `Contract` column and its
missing, unknown and duplicate checks. This one covers only the writing of the obligations.

### `cycles/` exists here and not in Enigma

A cycle is a directory holding a YAML file of the same name, and the directory carries the skills its
steps name, as files or as symbolic links. `cyPhases` and `cyBuild` are declared here;
`docs/dev-mcp-plans.md` defines what a cycle is and how one is found.

A `diff -r` against Enigma reports this directory as present on one side only. It is not an
incomplete copy: nothing upstream corresponds to it.

`cyBuild/` links the sixteen step skills of `build/` rather than duplicating their text, so a change
to a step skill reaches the cycle with no second edit.

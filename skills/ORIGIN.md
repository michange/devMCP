# Provenance of devMCP/skills/

Twenty-one files, copied verbatim on 30 August 2026 from

    /Users/mic/PhpstormProjects/dontOver/enigma/skills/

and verified byte for byte at the time of copying.

## Why this directory exists

devMCP implements part of Enigma's method as tools. `write_plan` implements `manage-plan`;
`run_tests_one_by_one` implements `skill.runTestsOneByOne.md`; and `validate-plan.js` enforces the
vocabulary that `skill.cyBuildModule.md` and `build/` define — the nine plan phases, the fifteen
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
| `skill.cyBuildModule.md` | defines the nine phases and the fifteen steps the `cycle` field names |
| `build/` — sixteen files | the step skills `cyBuildModule` refers to; `steps` in a custom cycle names exactly these |
| `skill.runTestsOneByOne.md` | the contract `run_tests_one_by_one` implements |

`skill.cyBuildModule.md` and `build/skill.cyBuildModule.md` are identical in Enigma. Both were
copied so that either path resolves, as it does upstream.

## What was deliberately not copied

`design-dialogue`, `lisibilite`, `tdd-list`, `requirement-traceability`, `worktree`,
`session-restart`, `skill.getStatus.md`, and everything under
`archive-do-not-use-without-user-permission/`. They are method, not devMCP tooling: devMCP neither
implements them nor enforces their vocabulary. They stay in Enigma and are read from there.

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

None yet. The copy is exact.

CR-001 — declared cycles and declared gating — will introduce the first, in
`manage-plan/SKILL.md`, `manage-plan/references/plan-template.md` and `skill.cyBuildModule.md`.
See `../CR-001-cycles-and-gating.md`.

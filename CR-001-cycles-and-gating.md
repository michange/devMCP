# CR-001 — declared cycles and declared gating

Raised 30 August 2026 from `/Users/mic/PhpstormProjects/formation`, while writing that
repository's first plan. **Ready for a devMCP session.**

Read first: `README.md` for the state of this repository, `ROADMAP.md` for the work still open,
and `skills/ORIGIN.md` for why `skills/` exists and what it is allowed to diverge from.

---

## The two things a todo cannot say today

**Which steps run.** `cycle` is one of five names — `none`, `text`, `restructuring`, `complete`,
`npm-release` — each mapping to a fixed set. A todo whose shape is not one of the five must
misdeclare itself. The case that raised this: `WP6-egs-mise-en-ligne.hebergement-o2switch` in the
`formation` plan wants exactly `text`'s five phases and is not text. It carries `none`, which
claims nothing rather than claiming the truth.

**Which steps gate.** Not expressible at all. `cyBuildModule` has three modes — `gated`, `auto`,
`ungate([...])` — negotiated in chat at the start of every cycle and then lost. Two sessions
picking up the same todo are asked the same question and may answer differently. The plan is the
only thing that outlives a session, and it says nothing about how the work is run.

---

## Three concepts, kept apart

| | Answers | Today |
|---|---|---|
| **the cy** | *which* cycle skill drives the work | implicit: always `cyBuildModule`. `skill.ò.cyMicrobuild.md` exists and no plan names it |
| **the steps** | which of that cy's steps run | five presets, fixed sets |
| **the gating** | which of those steps stop for a `[y]` | nowhere in the plan |

### On the field name

Not `pilot`. Across `worktree/SKILL.md`, `manage-plan/SKILL.md`, `tdd-list/SKILL.md` and
`session-restart/SKILL.md`, **the pilot is the session driving the work** — the one holding Design
Dialogue and reviewing a worker's approval envelope. Exactly one line uses it otherwise,
`skill.cyBuildModule.md:45`. Naming the field `pilot` would make a plan say *which session* when it
means *which cycle*.

The field is **`cy`**, after the skill's own identifier `cy-1 :: cyBuildModule`.

### The modes collapse into the gating list

```
gated              ->  ungated: []
auto               ->  ungated: [every step except push]
ungate([a, b, c])  ->  ungated: ["a", "b", "c"]
```

One list expresses all three. A todo that declares `ungated` **removes the mode question**: the
skill's opening ritual — propose the three modes in plain text and recommend one — fires only when
the plan is silent.

### It also removes the need for an `operation` preset

The hosting todo states its shape instead of borrowing a label that lies:

```json
"cycle": {
  "cy":      "cyBuildModule",
  "steps":   ["preRead", "purpose", "demoDocs", "review", "commit"],
  "ungated": ["preRead"]
}
```

No new enum entry, no naming argument. This CR subsumes that gap.

---

## Proposed shape

`cycle` accepts its current string, or an object:

```json
"cycle": "restructuring"

"cycle": { "cy": "cyBuildModule", "steps": [...], "ungated": [...] }
```

Rules:

- `cy` has one legal value today, `"cyBuildModule"`. It exists so a second one can be added as a
  minor increment rather than a format change.
- `steps` and `ungated` name that cy's steps.
- `ungated` is a subset of `steps`. A step that does not run cannot be ungated.
- `push` may appear in neither. It is an authorization, not a construction step, and
  `skill.cyBuildModule.md` already forbids it in `ungate([...])`.
- The five names survive as presets expanding to the same object. No published plan changes.
- An **absent** `cycle` stays exactly as it is: no constraint, nothing forced to `skipped`.

### Granularity — the point to argue before implementing

`steps` and `ungated` name the **fifteen cyBuildModule steps**, not the nine plan phases.

Ungating is decided at step granularity in practice. The proposal made for `formation`'s own
foundation work was `ungate([preRead, toBeFs, matchConventions, regression])` — and `toBeFs` and
`matchConventions` own no phase of their own: the first sits inside PURPOSE, the second inside
GREEN. Expressed in phases, that decision cannot be written down.

So a todo declares its runtime shape in the runtime's vocabulary and tracks its progress in the
plan's. The bridge is the mapping `skill.cyBuildModule.md` already publishes:

| Plan phase | Steps |
|---|---|
| PRE-READ | `preRead` |
| PURPOSE | `purpose`, `architecture`, `behavior`, `toBeFs` |
| TEST PLAN | `tddList` |
| RED | `red` |
| GREEN | `implementation`, `matchConventions`, `green` |
| REGRESSION | `regression` |
| DEMO/DOCS | `demoDocs` |
| REVIEW | `review` |
| COMMIT | `commit` |

**A phase is comprised when at least one of its steps is in `steps`.** `checkCybuild` then forces
every other phase to `skipped`, exactly as it does now.

### Compatibility is provable, and must be tested

| Preset | Steps | Phases comprised | Same as `CYCLES` today |
|---|---|---|---|
| `none` | all fifteen | all nine | yes |
| `text` | preRead, purpose, demoDocs, review, commit | PRE-READ, PURPOSE, DEMO/DOCS, REVIEW, COMMIT | yes |
| `restructuring` | all but tddList and red | all but TEST PLAN and RED | yes |
| `complete` | all fifteen | all nine | yes |
| `npm-release` | none | none | yes |

Every plan that validates today still validates, with identical phase constraints. That table is
the acceptance criterion and belongs in the test file, not in this document.

---

## Scope

### In — six files, all in this repository

| File | Change |
|---|---|
| `extensions/project-management/plan/validate-plan.js` | accept the object form; add the step-to-phase table; check `ungated` is a subset of `steps`; reject `push` in both; one legal `cy`; keep the five presets |
| `extensions/project-management/plan/render-plan.js` | the todo summary shows the step list and marks ungated steps — today it prints `cycle: none` and stops |
| `extensions/project-management/project-management.test.js` | the compatibility table as cases, plus the new refusals |
| `skills/manage-plan/SKILL.md` | the `cycle` bullet, which today enumerates five values |
| `skills/manage-plan/references/plan-template.md` | document the object beside the string |
| `skills/skill.cyBuildModule.md` | the mode proposal reads `ungated` from the plan when the todo declares it, instead of asking |

The last three are the copies under `skills/`, created for exactly this. Each one written is a
divergence, and `skills/ORIGIN.md` requires it to be recorded there with its reason.

### Out, deliberately

- **Any change to Enigma.** Decided: the work happens here and is not carried back. Two
  divergences are now outstanding — the version-status fix in `validate-plan.js`, and this.
- **An `operation` preset.** The object form removes the need.
- **Copying `skill.ò.cyMicrobuild.md`.** `cy` has one legal value. Copy it the day a plan names it.
- **Per-step conditions, retries, owners** — anything that turns the field into a workflow language.

---

## Acceptance

1. The five presets produce byte-identical phase constraints to today, proven by cases.
2. An object `cycle` with `ungated` not a subset of `steps` is refused, naming the offending step.
3. `push` in `steps` or in `ungated` is refused.
4. An unknown `cy` is refused.
5. A todo whose declared steps exclude a phase has that phase `skipped`, or is refused.
6. The rendered HTML shows a custom cycle's steps, with the ungated ones distinguishable.
7. The full devMCP suite stays green apart from the four known environmental failures.

## Suggested cycle for the CR itself

`complete`, and gated on `tddList`, `red`, `green` and `review`. The compatibility table is the
test plan; getting it wrong silently breaks every plan that already exists. `preRead`, `toBeFs`,
`matchConventions` and `regression` are the obvious candidates for `ungated`.

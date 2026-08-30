# dev-mcp-plans TDD list

> Status: proposed

## Contract sources

- [`docs/dev-mcp-plans.md`](../../docs/dev-mcp-plans.md) — plans, cycles and steps.
- [`CR-001-cycles-and-gating.md`](../../CR-001-cycles-and-gating.md) — the request this answers.

This list has no canonical requirement tags. `requirement-traceability` is not part of
`skills/`, which `skills/ORIGIN.md` records as a deliberate omission, and the contract above carries
no tagged obligations to cite. Every case below names the contract sentence it exercises in prose
instead. Adding traceability is a separate decision, not a silent gap.

## Dependencies and strategies

```text
name              | kind            | status | boundary            | selected strategy
node:fs           | Node builtin    | avail. | readdir, readFile   | real, on a temp fixture tree
yaml.js           | devMCP module   | new    | parse(text)         | real import
cycles.js         | devMCP module   | new    | loadCycles(roots)   | real import
check-shape.js    | devMCP module   | green  | checkObject, …      | real import
plan-context.js   | devMCP module   | green  | context builder     | real, on a temp git fixture
validate-plan.js  | devMCP module   | green  | validatePlan(p,ctx) | real import, context injected
```

Nothing is stubbed. Every dependency is either a Node builtin or a module in this repository, and
the existing tests already build temporary directories and git repositories as fixtures. A cycle
directory tree written into a temp directory is a fixture, not a mock.

## Existing-test audit

`project-management.test.js` holds ten cases. Five cover `write_plan` end to end, five cover version
status against work packages. None of them declares a `cycle`, so all ten exercise the path where
`cycle` is absent — which is precisely the compatibility path this change must preserve. They stay
as they are and become the regression proof that old plans keep validating.

No case currently asserts anything about `cybuild` length or step names beyond the fixed nine, so
there is no stale expectation to replace.

## Test cases

### yaml.js — the subset parser

| Behavior | Strategy | Setup or fixture | Observable assertion | Defect caught | Order/error detail |
|---|---|---|---|---|---|
| Reads a scalar under a key | pure | inline string | `parse('name: cyBuild').name === 'cyBuild'` | returns the raw line, or keeps surrounding spaces | — |
| Reads a list of mappings | pure | inline string | a two-step document yields an array of length 2, each an object | flattens the list, or keeps only the last entry | list order preserved |
| Reads booleans as booleans | pure | inline string | `gated` is `true`, not `'true'` | returns the string, so `if (step.gated)` is true for `false` | — |
| Preserves list order | pure | five named steps | names come back in written order | sorts them, or relies on object key order | order is execution order |
| Refuses a tab indent | pure | line indented with `\t` | throws naming the line number | accepts it and mis-nests the following keys | YAML forbids tabs |
| Refuses an unsupported construct | pure | `&anchor` or `<<:` merge | throws naming the line number | ignores the line and returns a document missing a key | silent loss is the defect |
| Ignores comments and blank lines | pure | file with `#` lines | parsed document equals the same file without them | treats `#` as part of a value | — |

### cycles.js — discovery, shape, index

| Behavior | Strategy | Setup or fixture | Observable assertion | Defect caught | Order/error detail |
|---|---|---|---|---|---|
| Indexes one cycle by name | real fs | temp tree with `cyBuild/cyBuild.yaml` | index has key `cyBuild` | indexes by directory name, so a mismatch between them goes unnoticed | — |
| Project wins over devMCP | real fs | same name in both roots | resolved cycle is the project's | devMCP wins, so a project cannot override a shipped cycle | precedence is project first |
| Missing cycles directory is not an error | real fs | root without `skills/cycles/` | returns an index holding only devMCP's cycles | throws, so a project with no cycles cannot publish | — |
| Refuses a cycle with no steps | real fs | `steps: []` | throws naming the file | accepts it, and a todo following it tracks nothing | fails at load, not per todo |
| Refuses a step with no name | real fs | step missing `name` | throws naming the file | accepts it, and the tracking array cannot be checked | — |
| Refuses a malformed YAML file | real fs | unparsable file | throws naming file and line | skips the file, so a cycle silently disappears | context fails, not one todo |
| Defaults `gated` and `skippable` explicitly | real fs | step omitting both | both are `false` | leaves them `undefined`, so a skip check reads as permitted | absent means not gated, not skippable |

### validate-plan.js — resolution and tracking

| Behavior | Strategy | Setup or fixture | Observable assertion | Defect caught | Order/error detail |
|---|---|---|---|---|---|
| Absent cycle resolves to cyPhases | real import | existing nine-entry todo | plan validates unchanged | resolves to `dialogue`, invalidating every published plan | this is the compatibility case |
| Named cycle resolves from the index | real import | todo with `cycle: cyBuild`, fifteen entries | validates | still requires nine entries | — |
| Name falling back to a skill | real import | `cycle: some-skill.md`, one entry | validates as a single-step cycle | refuses, so the graceful degradation never happens | cycle looked up first |
| Neither cycle nor skill | real import | `cycle: nope` | error names both the cycle and the skill looked for | says only "invalid cycle", sending the reader nowhere | one error, two names |
| A name matching only a prototype property | real import | `cycle: constructor` | error naming it | the index answers `Object`, truthy, and the caller reads `.steps` off a function | added at REVIEW |
| `__proto__` as a cycle name | real import | `cycle: __proto__` | error naming it | resolves to the prototype object and validates against undefined steps | added at REVIEW |
| Tracking length must match the cycle | real import | `cyBuild` with nine entries | error stating fifteen expected | accepts any length once the fixed nine is gone | — |
| Step names must match, in order | real import | two entries swapped | error at the offending index naming the expected step | reports only that the array is wrong | per-entry, not per-array |
| skipped only on a skippable step | real import | `skipped` on a step declared `skippable: false` | error naming the step | accepts it, and a mandatory step is silently dropped | — |
| An unknown status is still refused | real import | `status: "done"` | error on the status | the new code path bypasses the existing status check | preserves current behavior |

### write_plan — migration on publication

| Behavior | Strategy | Setup or fixture | Observable assertion | Defect caught | Order/error detail |
|---|---|---|---|---|---|
| Unfinished todo without a cycle is migrated | real, temp repo | todo `in-progress`, no `cycle` | published plan holds `cycle: dialogue` | leaves it absent, so migration never spreads | written plan, not input plan |
| Completed todo is left alone | real, temp repo | todo `complete`, no `cycle` | published plan still has no `cycle` | migrates it, rewriting the method of finished work | history is not rewritten |
| A declared cycle is never overwritten | real, temp repo | todo `in-progress`, `cycle: cyBuild` | stays `cyBuild` | migration clobbers an explicit declaration | — |
| Migration rewrites the tracking array | real, temp repo | migrated todo | array holds one entry, the `dialogue` step | keeps nine entries against a one-step cycle | the array follows the cycle |

### render-plan.js — projection

| Behavior | Strategy | Setup or fixture | Observable assertion | Defect caught | Order/error detail |
|---|---|---|---|---|---|
| Marks gated steps | real import | mixed gated and ungated | gated steps carry a distinguishing class | renders them identically, losing the information | — |
| Escapes the cycle name | real import | cycle name containing `<` | output holds the escaped form | injects raw HTML into the published projection | existing escaping preserved |

### Withdrawn at RED

One case was written and removed: *renders the declared cycle step names*. The renderer already
prints whatever the `cybuild` array holds, so no contract-conforming implementation could violate
that assertion — it could not fail, and a case that cannot fail is not coverage. Marking gated steps
remains the only observable change to the projection.

## Coverage disposition

| Obligation | Gate | Reason |
|---|---|---|
| `dialogue.skill.md` and `lisibilite.skill.md` copied, renamed and recorded in `skills/ORIGIN.md` | DOCS | A file copy and a provenance record; no runtime behavior asserts it. |
| `cycles.js` under 90 lines, `yaml.js` under 110 | REVIEW | Line budgets are a convention check, not an observable behavior. |
| Adding `cycle.js` recorded as a structural divergence in `project-management/ORIGIN.md` | DOCS | Provenance record. |
| Full suite stays green apart from the four environmental failures | REGRESSION | Whole-suite property, verified at the REGRESSION step. |
| `cyBuild.yaml` links skills rather than duplicating their text | REVIEW | A symlink assertion would test the filesystem, not the contract. |

## Timing and fixtures

Everything under test is synchronous except `write_plan`, whose Promise is awaited. No timeout is
used as a waiting mechanism, and no test polls. Fixtures are temporary directories built in
`beforeEach` and removed in `afterEach`, following what `project-management.test.js` already does for
`plans/` and what `mcp-server.unit.test.js` does for a sandboxed `HOME`.

Every case builds its own fixture. No test leaves state for another.

## Filesystem projection

```text
docs/
`-- dev-mcp-plans.md                          [edit, demoDocs]
extensions/project-management/
|-- ORIGIN.md                                 [edit, demoDocs]
|-- project-management.test.js                [edit, RED]
|-- cycles.test.js                            [create, RED]
|-- yaml.test.js                              [create, RED]
`-- plan/
    |-- yaml.js                               [create, GREEN]
    |-- cycles.js                             [create, GREEN]
    |-- validate-plan.js                      [edit, GREEN]
    |-- plan-context.js                       [edit, GREEN]
    |-- render-plan.js                        [edit, GREEN]
    |-- check-shape.js                        [unchanged]
    |-- plan-writer.js                        [unchanged]
    |-- plan-lock.js                          [unchanged]
    |-- stub-contracts.js                     [unchanged]
    `-- attribute-errors.js                   [unchanged]
skills/
|-- ORIGIN.md                                 [edit, demoDocs]
|-- dialogue.skill.md                         [create, GREEN]
|-- lisibilite.skill.md                       [create, GREEN]
`-- cycles/
    |-- cyPhases/
    |   `-- cyPhases.yaml                     [create, GREEN]
    `-- cyBuild/
        |-- cyBuild.yaml                      [create, GREEN]
        `-- skill.*.md -> ../../build/*       [create, GREEN]
```

`yaml.js` parses the subset described above. It imports nothing, is consumed by `cycles.js` alone,
and is budgeted at 110 lines.

`cycles.js` lists cycle directories, reads each YAML through `yaml.js`, validates the shape of a
cycle, and returns an index by name with the project winning over devMCP. It imports `yaml.js` and
node builtins, is consumed by `plan-context.js` and `validate-plan.js`, and is budgeted at 90 lines.

`validate-plan.js` stops holding the phase names and the cycle table, and reads both from the
context instead. `CYBUILD_STEPS` and `CYCLES` leave it, `checkCybuild` takes the declared cycle's
steps rather than a fixed nine, and `validateTodo` resolves the `cycle` field against the index. It
is 166 lines today and must stay under 200.

`plan-context.js` gains the cycle index, built by `cycles.js`, beside `branches` and `worktrees`.

`render-plan.js` prints the declared cycle's step names instead of nine fixed labels, and marks the
gated ones.

`dialogue.skill.md` and `lisibilite.skill.md` are copied from `dontOver/enigma/skills/`, 15 KB and
7 KB, into `skills/` itself rather than into a cycle directory. The first links the second and links
`build/skill.cyBuildModule.md`, both relatively; only that placement keeps the links resolving.
`dialogue.skill.md` is `design-dialogue.skill.md` renamed, which is a divergence, and its link to
`ockham-memes.pdf` stays dead because that file is 1.23 MB — more than twice this repository — for
an illustration of a table the text already carries. `skills/ORIGIN.md` records the rename, the dead
link, and the fact that it had listed these two among what was deliberately not copied.

`cyPhases.yaml` needs no skill files: its nine steps carry the phase names that plans already use,
and no skill drives a phase. `cyBuild.yaml` links the fifteen step skills that already live in
`skills/build/`, so no skill text is duplicated.

Out of scope: `mcp-server.js`, every other extension, and the five `plan/` modules listed unchanged
above.

## Intended test files

```text
extensions/project-management/yaml.test.js               [create]
extensions/project-management/cycles.test.js             [create]
extensions/project-management/project-management.test.js [edit]
```

`validate-plan.js`, `write_plan` and `render-plan.js` cases join the existing file, which already
owns the plan boundary. `yaml.js` and `cycles.js` get their own files because they are new modules
with their own boundaries.

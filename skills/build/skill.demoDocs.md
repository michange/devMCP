# @demoDocs — verify demos and documentation

Apply the active todo's `Demo scope` and `Implementation` sections after REGRESSION.

## Procedure

1. Add or migrate only the functional demos required by the accepted scope.
2. Keep Node as the functional authority for portable business demos.
3. Use the generic browser harness for portable demos. Add focused Playwright tests
   only for distinct browser-owned boundaries.
4. Start the generic demo server, wait for its structural readiness signal, and open
   the exact demo page in the browser. Keep the server alive during the user gate.
5. Put durable accepted behavior in `docs/` and keep unresolved decisions in the
   assigned todo or plan.
6. Present every document written or edited by this step as
   [`cyBuildModule`](./skill.cyBuildModule.md) prescribes under **Document presentation**: an
   active Markdown link on the absolute path in the chat, and the same path opened in the IDE
   through the devMCP `open_in_ide` tool.
7. Stop the server and remove temporary environment artifacts after the gate.

Never use blind sleeps or screenshots as behavioral assertions. A contract may not
link back to a plan, todo, TDD list, stage, work package, or handoff.

This step may be skipped only when the accepted scope changes neither public
behavior, a planned demo, nor documentation.

## Documentation quality gates

Every document created or edited by this step must pass all three gates. A failure
blocks completion of `@demoDocs`.

### NO_PLAN

Describe the feature as a durable contract. Do not mention its planning status,
implementation status, analysis cycle, build cycle, phase, stage, todo, work package,
roadmap, or progress.

### NO_CHANGE_HISTORY

Describe only the resulting truth. Do not narrate what changed, what the document
used to say, why it was modified, or how this revision differs from an earlier one.
Git owns change history; the document gives no perspective on its own modification.

### NO_GOOFS

Read and apply [`lisibilite`](../lisibilite.skill.md) completely. Reject text that
exhibits any failure represented by these Ockham shortcuts from
[`design-dialogue`](../design-dialogue.skill.md): `§wc`, `§me`, `§cr`, `§vg`, `§bb`,
`§bk`, `§14`, `§el`, and `§le`.

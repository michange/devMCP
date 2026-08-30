---
name: tdd-list
description: Derive, justify, and persist an Enigma test plan from accepted contracts and real dependency boundaries before RED. Use during Cybuild TEST PLAN, when adding or revising Enigma tests, when dependency status changes, or when auditing whether existing tests use weaker strategies than available project code.
---

# Enigma TDD List

Produce the accepted test contract before writing test code. Derive it from behavior, not from the
planned implementation.

## Inputs

Read completely:

- the Cybuild CONTRACT PRE-READ result and every selected normative source;
- the active Stage work package and its ownership;
- existing tests for the same public boundary;
- direct dependencies and their current implementation status.

Contract authority, in order:

1. normative Enigma documents in `docs/`;
2. explicit decisions accepted through Design Dialogue and recorded in the active plan;
3. existing green public behavior, only where it does not conflict with either source above.

This authority does not create a backlink. The TDD list and active plan must cite their normative
contracts, while a contract must never link or refer to `todos/`, a TDD list, stage, work package,
handoff, or implementation plan. If a contract contains such an indirection, return it for a
documentation correction before TEST PLAN; do not preserve the cycle in the TDD artifact.

If required behavior has no authoritative source, stop and return the missing decision to Design
Dialogue. Do not invent a test contract from implementation details.

## Requirement traceability

Read and apply [`requirement-traceability`](../requirement-traceability/SKILL.md) before deriving test
cases. The contract must give every atomic obligation a stable canonical tag, and every TDD case must
cite the complete tags it exercises in a `Contract` column.

Do not use shorthand or tag ranges. Put obligations that are not meaningfully automatable in
`## Coverage disposition` with their exact `DOCS`, `DEMO`, `REVIEW`, `REGRESSION`, or `REFACTOR`
verification gate. A tag attached to an assertion that cannot detect its violation is not coverage.

Run the traceability audit named by that skill before presenting TEST PLAN. Missing requirements,
unknown references, duplicate contract definitions, sequence gaps, and noncanonical references all
block the gate.

## Dependency assessment

For every direct dependency, record:

```text
name | kind | status | boundary | selected strategy
```

Use these strategies:

| Dependency | Status | Strategy |
|---|---|---|
| none | — | pure |
| Node builtin or installed package | available | real |
| Enigma module | green, same process | real import or fixture |
| Enigma service or process boundary | green | Node integration |
| generic browser boundary | green | DOM Playwright |
| dependency | absent or genuinely blocked | stub only with explicit approval |

Never stub what Enigma has built. Never mock a green dependency. Test through the real declared
boundary. A temporary filesystem, Git repository, local bare remote, or self-contained App is a
fixture, not a mock.

## Browser strategy

Separate portable business demos from browser-owned product boundaries.

For portable demos, Node is the functional authority. Do not replay every demo in Playwright. Keep
one generic browser-harness smoke scenario, currently `folder-namespace`, that:

```text
opens the generated demo index
-> follows the discovered folder-namespace link
-> inspects the rendered module tabs
-> clicks the DOM Run button
-> waits for the runner's visible pass state
-> compares the exact actual and expected DOM outputs
```

The demo-harness test must not import the App or its manifest directly, bypass the `Run` button, or
use a screenshot as an assertion.

Browser-owned product boundaries receive their own focused Playwright tests. These include the
topology viewer, DOM warning rendering, source-node navigation, and the browser-to-Express
source-link bridge. Add a UI test for a distinct browser boundary, never merely because a new
business demo exists. Every UI test uses DOM access, events, and observable states rather than
screenshots or blind waits.

## Existing-test audit

When tests already exist:

- map them to the current contract behaviors;
- identify missing behavior, redundant coverage, and stale expectations;
- replace a stub or mock when its real dependency is now green;
- preserve independently valuable regression cases.

Do not add a second Playwright test for a business demo already covered by Node and the generic
browser harness.

## Test-case derivation

Cover only observable contract dimensions that apply:

- nominal result;
- boundary inputs and structured errors;
- ordering and synchronous propagation;
- state preserved or changed;
- retries and partial failures;
- security or path confinement;
- Node/browser parity at a declared shared boundary.

For each case record:

| Behavior | Strategy | Setup or fixture | Observable assertion | Defect caught | Order/error detail |
|---|---|---|---|---|---|

Use descriptive test names. Do not impose `Txx` identifiers. Every `it()` must run independently;
one test may not prepare state for another.

### Every assertion must be falsifiable

`Defect caught` names the faulty implementation the assertion detects. State it as a concrete wrong
behavior, not as a restatement of the expectation: "returns the roots in manifest order" is the
expectation; "returns them in reverse, or in module-import order" is the defect caught.

If no contract-conforming implementation could ever violate an assertion, that assertion is dead.
Delete it, or replace it with one that can fail. Dead assertions typically:

- restate an invariant of the language or of the chosen data shape — a `Number` that is not a
  `string`, an `Array` that has no unrelated named property;
- re-test the framework, the parser, or a dependency already green elsewhere;
- guard against a regression whose real form is already caught one assertion above.

This check is per **assertion**, not per test. Cybuild's RED gate stops a test that is already green,
which catches a wholly dead test; it cannot see a dead assertion travelling inside a test that fails
for other, legitimate reasons. TEST PLAN is the only place that distinction gets made.

A prohibition inherited from a normative document is not exempt. Restating a design rule in an
assertion is worthwhile only when the representation actually permits the forbidden state. Where the
representation already makes it unreachable, the rule belongs in the document, not in an `expect`.

## Timing

Never use a timeout as the waiting mechanism.

Prefer:

- synchronous return or thrown error;
- awaited Promise owned by the tested boundary;
- process exit or HTTP response;
- DOM state or event;
- `page.waitForFunction` for a precise structural condition.

A Vitest timeout is only a documented hang safety net and must be comfortably longer than expected
execution. `waitForTimeout`, blind sleeps, and polling without a structural signal are forbidden.

## Enigma test files

Use only suffixes executed by the Enigma configuration:

```text
tests/<boundary>.unit.test.js
demos/<boundary>/<boundary>.ui.test.js
```

Vitest `unit` files may contain real Node integration tests. `ui` is reserved for the generic
Playwright browser boundary. Keep long prompts, expected text, certificates, or other bulky material
in dedicated fixtures rather than inline in test code.

## Persist the list

Write the accepted list to the package-specific path assigned by the active Stage plan, normally:

```text
todos/tdd/<work-package>.tdd.md
```

The artifact contains:

```markdown
# <work package> TDD list

> Status: proposed | accepted | implemented

## Contract sources
## Dependencies and strategies
## Existing-test audit
## Test cases
## Coverage disposition
## Timing and fixtures
## Intended test files
```

`Contract sources` contains links from this TDD list to the governing contracts. Never add a return
link from those contracts to this file.

## Present the persisted list

A list that stays inside the chat is not presented. Once the artifact is written, perform these
three actions at the acceptance gate:

1. Write the list to its file. The file is the authority, and the chat never carries a variant of
   the text that the file does not contain.
2. Emit an active link on the artifact's absolute path in the chat, written as a Markdown link whose
   target is that absolute path, so that the user opens it in one click.
3. Open the same absolute path in the IDE by calling the devMCP `open_in_ide` tool. Pass the `line`
   argument when one section is under discussion.

The chat then carries the accepted decisions in a few lines, never the whole artifact body.

In parallel work, keep test artifacts inside the package's primary scope unless the mission requires
a declared shared-file edit. Keep every shared edit minimal and separately reviewable. If the TDD
artifact belongs to the pilot, return its complete contents to the pilot for persistence. Update its
status only when the corresponding gate is accepted or implemented.

## Cybuild handoff

TEST PLAN is complete only when:

- every case cites accepted behavior;
- every contract requirement has a stable tag and a justified automated or gate disposition;
- the requirement-traceability audit passes with no missing, unknown, duplicate, gap, or shorthand;
- every dependency has an explicit strategy;
- every assertion names the defect it catches;
- independence and waiting mechanisms are stated;
- intended test and fixture paths are named;
- the user accepts the list through the pilot;
- the accepted list is persisted;
- the persisted file is presented by an active link in the chat and opened in the IDE.

RED writes only the tests and fixtures named by the accepted list. Any behavioral change discovered
afterward returns to Design Dialogue and then updates this list before test code changes.

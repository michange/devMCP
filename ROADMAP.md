# devMCP — what is left

This document lists work that has not been done. The state of the repository as it stands is in
`README.md`, and how it got there is in `CHANGELOG.md`. Nothing here describes the present, so
nothing here goes stale when the code changes.

It replaces `BRIEFING-2.0.0.md`, an audit written on 30 August 2026 whose findings have since been
applied: the README was rebuilt against the code, the fifteen extensions were documented, the
CHANGELOG entries for 1.7.1, 1.8.0 and 1.9.0 were reconstructed, ten extensions that had never
entered git were committed, and the three version declarations were aligned on 2.0.0.

---

## CR-001 — declared cycles and declared gating

`CR-001-cycles-and-gating.md`, in this repository, is a complete change request and the largest
piece of work waiting. It lets a plan todo declare which cycle steps run and which of them stop for
an approval, instead of choosing among five presets and negotiating the gating in chat where it is
then lost.

It touches six files, three of them under `skills/`, and carries its own acceptance criteria. The
compatibility table it publishes is the test plan: every plan that validates today must still
validate with identical phase constraints.

## Part B — the client adapter

Nineteen of the 26 tools work with any MCP client. Seven read or write Claude's configuration.
`README.md`, section *Where the Claude coupling lives*, names the seven files that hold that
coupling.

The proposal is an extension exposing no tool and exporting functions instead, on the precedent of
`gate`. `extensions/client-claude/index.js` would export `configSources()`, `registerServer()`,
`restart()`, `settingsPath()`, `listCommand()` and `activate()`, and everything else would import
them rather than hard-code paths.

The loader runs after the core catalogue is built, so the core cannot import an extension. The three
bootstrap tools therefore move down into the adapter:

    core before (7)   run_tests · run_tests_one_by_one · kill_stuck · self_test
                      register_mcp · enable_mcp · restart_desktop        <- move out
    core after  (4)   run_tests · run_tests_one_by_one · kill_stuck · self_test
    client-claude (3) register_mcp · enable_mcp · restart_desktop, plus the six functions

`force-model`, `mcp-list`, `mcp-self-scan`, `mcp-twin-scan` and `gate` would import the adapter, and
so would `install.js` and `uninstall.js`, which live outside the extension system and know the `.app`
path.

**This breaks `mcp-server.unit.test.js` on purpose.** It asserts the core tool list, and removing
three tools makes it fail. That failure is the RED of the cycle. The promise of `self_test` changes
from *the tools answer* to *the core and the loader answer*.

The property being bought: deleting `extensions/client-claude/` loses MCP bootstrapping and keeps
the entire toolbox. That is what makes the opening line of the README true.

devMCP has no plan. `plans/` does not exist here, and `write_plan` publishes the *next* plan against
an existing one, so a hand-written `plans/plan-0.0.0.json` seed comes first.

## The four failing tests

`npm test` reports four failures, and all four assert on the MCP configuration of one particular
machine. Three expect servers named `trampoline`, `poc-url` and `claude.ai Gmail`, which are no
longer registered there. One expects a live gate server on `localhost:3737`.

They fail for anyone who clones the repository, which makes a red suite the normal state and hides
a real regression when one appears. Each one needs a fixture it controls, or an explicit skip that
names the reason.

## Smaller debts

- `.DS_Store` and `extensions/.DS_Store` are tracked and should not be.
- `extensions/naude/index.js` holds three absolute paths into `naude-new`. Reading them from
  configuration, as `gate` reads `devmcp.config.json`, would make the extension portable.
- `extensions/bash/index.js` is commented in French while the rest of the repository is in English.
- `CHANGELOG.md` carries a `1.5.0` entry, and `serverInfo` went from `1.2.0` to `1.6.0` without
  passing through it.

## Settled, and not to be reopened without a reason

The write gate stays disabled. It never hosted its own server, and the application that served its
three routes has been archived. The code is kept so that a future host — `naude-new` is the intent —
can serve them. `extensions/gate/DESIGN.md` carries the full statement.

The plan format stays authored in enigma. Two divergences are outstanding and recorded in
`extensions/project-management/ORIGIN.md`: the version-status fix in `validate-plan.js`, and CR-001
once it lands.

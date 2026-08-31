# devMCP — what is left

This document lists work that has not been done. The state of the repository as it stands is in
`README.md`, and how it got there is in `CHANGELOG.md`. Nothing here describes the present, so
nothing here goes stale when the code changes.

It replaces `BRIEFING-2.0.0.md`, an audit written on 30 August 2026 whose findings have since been
applied: the README was rebuilt against the code, the fifteen extensions were documented, the
CHANGELOG entries for 1.7.1, 1.8.0 and 1.9.0 were reconstructed, ten extensions that had never
entered git were committed, and the three version declarations were aligned on 2.0.0.

---

## Next milestone — ungating a CLI from devMCP

A session interrupted by approval prompts stops for something it was already allowed to do. As
`skills/session-permissions/SKILL.md` puts it in Enigma, removing an approval removes a stopping
point, never a capability: the agent could already perform the action, it was asking first.

That skill defines the whole method, in 215 lines and for both CLIs. It says to read the effective
state before proposing anything — `~/.claude/settings.json`, then the worktree's `.claude/settings.json`
and `.claude/settings.local.json` under Claude Code, and `~/.codex/config.toml` with its
`[projects."<path>"]` blocks under Codex. It says to choose a scope first, session being the default
because it dies with the process, worktree only after the same loosening has been repeated three
times, and global almost never because it outlives the need that caused it. It says to prefer a
narrow allow list to a blanket mode, and to keep `bypassPermissions` and `danger-full-access` for
worktrees whose deletion costs nothing. And it says to confirm flag names against the installed
binary rather than from memory, since a wrong flag either fails loudly or is silently ignored.

What is missing is the tooling. Every one of those steps is a file to read, a precedence to resolve
and an edit to make correctly, which is what an agent does badly by hand and a tool does the same way
every time.

devMCP already holds the pattern. `force_model` pins a value in `~/.claude/settings.json`, snapshots
the original state once so a restore returns to pre-force truth, records what it forced so a change
made outside the tool is detected rather than silently reverted, and offers `adopt` for the case
where that outside change should stand. Permissions need the same four moves against more files, and
one more thing `force_model` does not need: a scope, since the same setting has three homes with
different lifetimes.

Open questions, before any code:

- whether devMCP reads Codex configuration at all, or whether that belongs behind the client adapter
  of Part B, which exists precisely to hold what is specific to one client;
- whether a loosening carries an expiry, so that a session-scoped setting cannot outlive the session
  that asked for it when the process dies without cleaning up;
- whether the tool refuses a blanket mode outside a worktree it can verify is disposable.

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
`extensions/project-management/ORIGIN.md`: the version-status fix in `validate-plan.js`, and the
declared cycles.

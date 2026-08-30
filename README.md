# devMCP

Your development tooling, exposed to your LLM over MCP. Registered once, available in every
conversation and every project.

devMCP exposes 26 tools over plain MCP stdio, protocol 2024-11-05, with zero runtime dependencies.
Any conforming client connects. Seven of the tools drive Claude specifically; the other nineteen are
client-neutral and work wherever the server is registered.

## The 26 tools

Nineteen tools are the toolbox. They know nothing about which client called them.

| Family | Tools |
|---|---|
| Filesystem | `read_file` `write_file` `list_directory` `edit_file` |
| Shell | `bash` (read-only) |
| Version control | `git` `git_push` |
| Network | `http_request` |
| Node | `npm_install` |
| Editor | `open_in_ide` |
| naude server | `naude_start` `naude_stop` `naude_restart` `kill_port` |
| Project plans | `write_plan` |
| Testing | `run_tests` `run_tests_one_by_one` `kill_stuck` `self_test` |

Seven tools manage the client itself. They read and write Claude's configuration, and replacing them
is what serving a different client would mean.

| Family | Tools |
|---|---|
| MCP bootstrap | `register_mcp` `enable_mcp` `restart_desktop` |
| MCP inspection | `mcp_list` `mcp_self_scan` `mcp_twin_scan` |
| Model pinning | `force_model` |

## Core tools (7)

These seven live in `mcp-server.js` itself rather than in an extension:

- `run_tests` — Run vitest on a file or directory. Accepts a `pattern` passed to vitest as `-t`, and
  an `env` object merged into the test process.
- `run_tests_one_by_one` — Run a suite one test at a time, addressed by rank, returning each verdict
  separately.
- `kill_stuck` — Kill a stuck process matching an allowlisted pattern.
- `self_test` — Run `mcp-server.unit.test.js`. 19 tests.
- `register_mcp` — Register a stdio MCP server in the Claude configuration. Does not restart.
- `enable_mcp` — Register a server and restart Claude Desktop in one call.
- `restart_desktop` — Quit Claude Desktop and relaunch it, with full process tree cleanup.

Everything else comes from `extensions/`. See **[Extensions](#extensions)**.

### What self_test covers, and what it does not

`self_test` runs one file, `mcp-server.unit.test.js`. Passing it is not the same as passing
`npm test`, which runs the whole suite: **128 cases across 15 files**. Four of those currently fail on
assertions about MCP servers present in one particular machine's configuration, and three are skipped.

## Install

Prerequisites: Node.js ≥ 18, and a client that speaks MCP over stdio.

```bash
git clone https://github.com/michange/devMCP.git
cd devMCP
npm install
node install.js
npm test
```

After install:

1. Restart Claude Desktop (Cmd+Q then reopen).
2. Open a new conversation. devMCP appears with 26 tools.
3. Open a new CLI session (`claude`, then `/mcp`). devMCP is connected.

The folder can live anywhere and be named anything. `install.js` resolves absolute paths
automatically.

### Reinstall, after an update or a git pull

```bash
cd devMCP
npm install
node install.js
npm test
```

## Uninstall

```bash
cd devMCP
node uninstall.js
```

Then restart Claude Desktop, delete the devMCP folder, and remove any boot check instructions added
to a `CLAUDE.md` or to project settings.

> **Note:** the Claude Code CLI auto-discovers MCP servers in the current directory. While the devMCP
> folder still exists, running `claude` from inside it loads the tools even after uninstall. Deleting
> the folder is what fully removes devMCP.

## Verify

**Desktop:** new conversation → MCP servers → devMCP with 26 tools.

**CLI:** `claude`, then `/mcp` → devMCP connected.

**Self-test:** ask the assistant to call `self_test` → 19/19 green.

## Autorun instructions

To have the assistant run `self_test` at the start of every conversation, add boot instructions to
the location your client reads. Example text:

```
## devMCP boot check — MANDATORY on every first reply

On the very first reply of every new conversation, before answering:

1. Call `devMCP:self_test`
2. Report the result: how many of the 19 tests passed, and the total tool count (26).
3. If self_test fails, report the error and WAIT.
   Do NOT call enable_mcp or restart_desktop automatically.
```

Earlier versions of this section asked the assistant to report the status of *all 5 devMCP tools*.
That number was already wrong when it was written, and anyone who copied it into a `CLAUDE.md` is
still running it. Replacing that paragraph with the one above is worth doing once.

Where the text goes depends on the client:

| Client | Location | Scope |
|---|---|---|
| **Claude Code CLI** | `CLAUDE.md` at project root | Per-project |
| **Claude Code CLI** | `~/.claude/CLAUDE.md` | Global, all projects |
| **Claude Desktop** (chat) | Project instructions | Per-project |
| **Claude Desktop** (code) | Project instructions | Per-project |

For the CLI, the project-level `CLAUDE.md` takes precedence. For Desktop, project instructions are
injected into every conversation in that project.

## Configuration

`devmcp.config.json` sits at the devMCP root and configures the write gate:

```json
{
  "gate": {
    "server": "http://localhost:3737",
    "enabled": false
  }
}
```

- `gate.server` — URL of the server hosting the approval page. It must serve `/gate`,
  `/gate/respond` and `/gate/status`.
- `gate.enabled` — `false` disables gating, and every write passes through silently.

The file is read fresh on every call, so a change takes effect without a restart.

## Write gate

**The gate ships disabled, and it is orphan code.** `write_file`, `edit_file` and `git_push` are
therefore ungated today. The reason is in `extensions/gate/DESIGN.md`: the gate never hosted its own
server, and the application that served its three routes has been archived. Setting `enabled` to
`true` without a live server on `gate.server` makes every gated call hang for the full 120-second
timeout and fail with `Gate timed out`.

When a host does serve those routes, the gate works as follows. Each gated call opens a browser page
showing what is about to happen, and the user clicks Approve or Reject there. The page is a genuine
side channel: the calling agent never sees it, cannot click the button, and cannot read the response
before the server does. Before each gated write, a safety commit named `[devmcp-safety] before write`
is created in the target file's repository, which gives a rollback point.

## Extensions

Fifteen extensions ship in `extensions/`, and they provide 19 of the 26 tools. Each one carries its
own `DESIGN.md` — `project-management` carries an `ORIGIN.md` instead, because its provenance is the
thing that needs recording.

| Extension | Tools | Own tests |
|---|---|---|
| `fs` | `read_file` `write_file` `list_directory` | — |
| `edit-file` | `edit_file` | — |
| `bash` | `bash` | — |
| `git` | `git` | — |
| `git-push` | `git_push` | 7 |
| `http-request` | `http_request` | — |
| `npm-install` | `npm_install` | — |
| `open-in-ide` | `open_in_ide` | 5 |
| `naude` | `naude_start` `naude_stop` `naude_restart` `kill_port` | — |
| `project-management` | `write_plan` | 39 |
| `force-model` | `force_model` | 15 |
| `mcp-list` | `mcp_list` | 9 |
| `mcp-self-scan` | `mcp_self_scan` | 9 + 1 |
| `mcp-twin-scan` | `mcp_twin_scan` | 7 |
| `gate` | none — exports `gate()` and `safetyCommit()` for other extensions | 9 at root |

`kill_port` is often taken for a core tool. It is not: it lives in `naude`, and removing that
extension removes it.

Four of the extensions that touch the filesystem — `fs`, `edit-file`, `bash` and `gate` — have no
tests of their own. They are covered indirectly through `mcp-server.unit.test.js` and
`gate.test.mjs`.

## Custom extensions

devMCP loads extensions from `extensions/` at boot. Each subfolder exports tools that merge into the
catalogue alongside the core tools. This is how tools are added to devMCP.

```
extensions/
  my-tool/index.js
```

```js
// extensions/my-tool/index.js
export default [{
  name: 'my-tool',
  description: 'What it does.',
  inputSchema: { type: 'object', required: [...], properties: { ... } },
  handler: (args) => { return { isError: false, text: 'result' } }
}]
```

Drop a folder, restart Desktop, open a new conversation, and the tool appears. Remove the folder and
it is gone.

Extensions can import the shared validators from the core:

```js
import { validatePath, validateArgs } from '../../validators.js'
```

The loader runs after the core tool catalogue is built, which is why the core cannot import an
extension. Extensions may import each other, but the loader guarantees no order between them, so an
extension that depends on another's module is depending on something nothing enforces.

### Extensions guide — absolute paths

**Claude Desktop ignores `cwd` when spawning MCP servers.** Any script path in `args` must be
absolute, or the server will fail to start.

When registering an MCP server from an extension, or when calling `register_mcp` or `enable_mcp`,
build the path from `__dirname`:

```js
// ✅ correct — absolute path resolved at registration time
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const serverPath = resolve(join(__dirname, 'mcp-server.js'))
// then pass: args: [serverPath]
```

```js
// ❌ wrong — relative path, will fail in Claude Desktop
// args: ['mcp-server.js']
```

A relative path-like argument passed to `register_mcp` or `enable_mcp` produces a warning in the
response. The server is still registered, and it will not start.

## Adding a new MCP server

`enable_mcp` registers MCP servers other than devMCP itself. Ask the assistant:

> "Register a new MCP server called my-server at /absolute/path/to/my-server.js"

It calls `enable_mcp`, which writes both configurations and restarts Desktop. The next conversation
has the server, and so does the next CLI session.

## Scope

`register_mcp` and `enable_mcp` accept a `scope` parameter:

- **`user`** (default) — available in all projects.
- **`local`** — the current project only.
- **`project`** — shared through `.mcp.json` in the repository.

## Internals

- Transport: stdio, JSON-RPC over stdin and stdout.
- Protocol: MCP 2024-11-05.
- Runtime: Node.js ≥ 18, ESM, zero runtime dependencies.
- Dual config write: the registration tools write both
  `~/Library/Application Support/Claude/claude_desktop_config.json` and `~/.claude.json`.
- Test safety: `restart_desktop` detects `process.env.VITEST` and skips the real kill and relaunch
  when it runs inside `self_test`.
- Extension loader: scans `extensions/*/index.js` at boot and merges the results into the catalogue.

### Where the Claude coupling lives

Removing `extensions/force-model`, `mcp-list`, `mcp-self-scan` and `mcp-twin-scan`, and replacing the
three bootstrap tools in `mcp-server.js`, is what serving a different client would take. The coupling
is confined to:

- `install.js` and `uninstall.js` — the Desktop configuration path and `claude mcp add-json`.
- `mcp-server.js` — the same path, plus `osascript -e 'quit app "Claude"'` and
  `killall -9 "Claude Helper"` in `restart_desktop`.
- `extensions/force-model/index.js` — writes `~/.claude/settings.json`, validates `claude-*` ids.
- `extensions/mcp-list/index.js` — reads the four Claude configuration sources.
- `extensions/mcp-self-scan/index.js` — shells out to `claude mcp list`.
- `extensions/mcp-twin-scan/index.js` — does both of the above.
- `extensions/gate/index.js` — `osascript tell app "Claude" to activate` after an approval.

The tools that do the work are neutral. The tools that drive the client are not.

## Files

```
mcp-server.js              — the server: core tools, extension loader, JSON-RPC
mcp-server.unit.test.js    — 19 tests, real process spawn, sandboxed configs
gate.test.mjs              — 9 tests for the approval gate
find-inconsistent.test.mjs — 1 test
mcpProxy-scan.perfs.test.js— 1 performance test
spawn-terminal.test.mjs    — 3 tests, skipped
validators.js              — shared input validation for core and extensions
install.js                 — installer for Desktop and CLI, with verification
uninstall.js               — uninstaller for Desktop and CLI, with verification
devmcp.config.json         — write gate configuration
vitest.config.js           — test config (30 s timeout)
extensions/                — 15 extensions, loaded at boot, each with its own DESIGN.md
fixtures/                  — test fixtures
naude/                     — naude instance fixture config
package.json               — devDependencies: vitest
package-lock.json
README.md
CHANGELOG.md
```

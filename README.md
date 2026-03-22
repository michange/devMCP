# devMCP

Bootstrap MCP server for Claude. Register once, available in every conversation and every project.

**Clients:** Claude Desktop (chat), Claude Desktop (code), Claude Code CLI.

**Tools:**
- `run_tests` — Run vitest on any file or directory. Finds the project root automatically.
- `self_test` — Run devMCP's own test suite. 10 tests, verifies all tools work.
- `register_mcp` — Register a new stdio MCP server in both Desktop and CLI configs. Does not restart.
- `restart_desktop` — Kill Claude Desktop and relaunch it. Full process tree cleanup.
- `enable_mcp` — Register + restart in one shot. The tool you use to add all future MCP servers.

**The bootstrap problem:** Claude can't register MCP tools without already having a tool to do it. devMCP is the one you register by hand. After that, Claude registers everything else itself.

## Install

Prerequisites: Node.js ≥ 18, Claude Desktop, Claude Code CLI (optional).

```bash
git clone https://github.com/michange/devMCP.git
cd devMCP
npm install
node install.js
npm test
```

After install:
1. Restart Claude Desktop (Cmd+Q then reopen)
2. New conversation → devMCP appears with 5 tools
3. New CLI session (`claude` → `/mcp`) → devMCP connected

The folder can live anywhere and be named anything. `install.js` resolves absolute paths automatically.

### Reinstall (after update or git pull)

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

Then:
1. Restart Claude Desktop (Cmd+Q, reopen)
2. Delete the devMCP folder
3. If you added boot check instructions, remove them from your `CLAUDE.md` or project settings

> **Note:** Claude Code CLI auto-discovers MCP servers in the current directory. If the devMCP folder still exists, running `claude` from inside it will load the tools even after uninstall. Delete the folder to fully remove devMCP.

## Verify

**Desktop:** new conversation → MCP servers → devMCP with 5 tools.

**CLI:** `claude` → `/mcp` → devMCP connected.

**Self-test:** ask Claude to call `self_test` → 10/10 green.

## Autorun instructions

To have Claude run `self_test` automatically at the start of every conversation, add boot instructions to the appropriate location for your client. Example text:

```
## devMCP boot check — MANDATORY on every first reply

On the very first reply of every new conversation, before answering:

1. Call `devMCP:self_test`
2. Report the status of all 5 devMCP tools:
   - self_test, run_tests, register_mcp, enable_mcp, restart_desktop
3. If self_test fails, report the error and WAIT.
   Do NOT call enable_mcp or restart_desktop automatically.
```

Where to put it depends on your client:

| Client | Location | Scope |
|---|---|---|
| **Claude Code CLI** | `CLAUDE.md` at project root | Per-project |
| **Claude Code CLI** | `~/.claude/CLAUDE.md` | Global (all projects) |
| **Claude Desktop** (chat) | Project instructions (project settings → instructions) | Per-project |
| **Claude Desktop** (code) | Project instructions (project settings → instructions) | Per-project |

For CLI, the project-level `CLAUDE.md` takes precedence. For Desktop, project instructions are injected into every conversation in that project.

## Extensions

devMCP loads extensions from `extensions/` at boot. Each subfolder exports additional tools that merge into the catalogue alongside core tools.

```
extensions/
  my-tool/index.js
```

Create your own:

```js
// extensions/my-tool/index.js
export default [{
  name: 'my-tool',
  description: 'What it does.',
  inputSchema: { type: 'object', required: [...], properties: { ... } },
  handler: (args) => { return { isError: false, text: 'result' } }
}]
```

Drop a folder, restart Desktop, new conversation — your tool appears. Remove the folder, it's gone.

Extensions can import validators from core:

```js
import { validatePath, validateArgs } from '../../validators.js'
```

## Adding a new MCP server

Ask Claude:

> "Register a new MCP server called my-server at /path/to/my-server.js"

Claude calls `enable_mcp` → writes to both configs → restarts Desktop → new conversation has the server. New CLI session has it too.

## Scope

`register_mcp` and `enable_mcp` accept a `scope` parameter:

- **`user`** (default) — available in all projects
- **`local`** — current project only
- **`project`** — shared via `.mcp.json` in the repo

## Internals

- Transport: stdio (JSON-RPC over stdin/stdout)
- Protocol: MCP 2024-11-05
- Runtime: Node.js ≥ 18, ESM, zero runtime dependencies
- Dual config write: all registration tools write to both `~/Library/Application Support/Claude/claude_desktop_config.json` (Desktop) and `~/.claude.json` (CLI)
- Test safety: `restart_desktop` detects `process.env.VITEST` and skips the real kill/relaunch when running inside `self_test`
- Extension loader: scans `extensions/*/index.js` at boot, merges into tool catalogue

## Files

```
mcp-server.js              — the server (core + extension loader, zero runtime deps)
mcp-server.unit.test.js    — 10 tests, real process spawn, sandboxed configs
validators.js              — shared input validation for core and extensions
install.js                 — installer for Desktop + CLI (with verify)
uninstall.js               — uninstaller for Desktop + CLI (with verify)
vitest.config.js           — test config
extensions/                — drop-in tool extensions (loaded at boot)
package.json               — devDependencies: vitest
README.md
CHANGELOG.md
```
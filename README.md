# devMCP

Base tooling MCP server for Claude Desktop and Claude Code CLI. Configures both clients to offer 5 dev tools at boot. Register once, available in every conversation and every project.

**The bootstrap problem:** Claude can't register MCP tools without already having a tool to do it. devMCP is the one you register by hand. After that, Claude registers everything else itself.

## Tools

### `run_tests`
Run vitest on any file or directory. Finds the project root automatically.

### `self_test`
Run devMCP's own test suite. 10 tests, verifies all tools work.

### `register_mcp`
Register a new stdio MCP server in both Desktop and CLI configs. Does not restart.

### `restart_desktop`
Kill Claude Desktop and relaunch it.

### `enable_mcp`
Register + restart in one shot. The tool you use to add all future MCP servers.

## Install

Prerequisites: Node.js ≥ 18, Claude Desktop, Claude Code CLI (optional).

```bash
# From your dev root (the parent folder where your projects live)
cd $DEV_ROOT
mkdir devMCP && cd devMCP
unzip /path/to/devMCP.zip
npm install
node install.js
npm test
```

After install:
1. Restart Claude Desktop (Cmd+Q, reopen)
2. New conversation → devMCP appears with 5 tools
3. New CLI session (`claude` → `/mcp`) → devMCP connected

The folder can live anywhere and be named anything. `install.js` resolves absolute paths automatically.

## Verify

**Desktop:** new conversation → MCP servers → devMCP with 5 tools.

**CLI:** `claude` → `/mcp` → devMCP connected.

**Self-test:** ask Claude to call `self_test` → 10/10 green.

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

## Files

```
mcp-server.js              — the server (single file, zero runtime deps)
mcp-server.unit.test.js    — 10 tests, real process spawn, sandboxed configs
install.js                 — one-time installer for Desktop + CLI
vitest.config.js           — test config
package.json               — devDependencies: vitest
README.md
```

# Gate — web-based write approval

## Problem

MCP servers cannot securely gate themselves against the agent calling them. The agent (Claude) is the middleman for all tool calls — any token-based approval flows through Claude, who can forge or replay it. Claude Desktop's built-in MCP permission dialog is per-server, irreversible, and undocumented.

## Solution

A side channel that bypasses the agent entirely. When `write_file` or `edit_file` is called, the MCP server opens a browser tab on the user's screen showing what's about to happen. The user clicks Approve or Reject. The answer flows back via HTTP — Claude never sees the approval page, can't click the button, and can't read the response before the server does.

## Architecture

```
Claude calls write_file
  → devMCP gate() generates unique ID
  → opens browser: http://localhost:3737/gate?id=X&desc=...
  → polls GET /gate/status?id=X every 500ms

User sees approval page in browser
  → clicks Approve or Reject
  → POST /gate/respond {id: X, answer: "yes"|"no"}
  → server stores answer in memory

gate() poll picks up answer
  → "yes" → proceeds with write
  → "no"  → returns error to Claude
  → timeout (120s) → returns error
```

## Configuration

`devmcp.config.json` at devMCP root:

```json
{
  "gate": {
    "server": "http://localhost:3737",
    "enabled": true
  }
}
```

- `server` — URL of the web server hosting `/gate`, `/gate/respond`, `/gate/status` routes
- `enabled` — set `false` to disable gating (all writes pass through silently)

The config is read fresh on every gate() call — no restart needed to change settings.

## Server routes (added to host app)

The host application (e.g. voteCards on :3737) must serve three routes:

- `GET /gate?id=X&desc=Y` — renders the approval page with Approve/Reject buttons
- `POST /gate/respond` — receives `{id, answer}`, stores in memory
- `GET /gate/status?id=X` — returns `{answer}` if available, `{answer: null}` if pending

## Safety commit

Before every gated write, `safetyCommit(path)` auto-commits dirty changes in the target file's git repo with message `[devmcp-safety] before write`. This gives you a rollback point. Silently no-ops if the path isn't in a git repo or the repo is clean.

## Testing

DI via `_gateOpts` parameter on handlers and `opts` on `gate()`:

- `opts.opener` — function called with URL (default: `exec('open ...')`). Tests inject a no-op.
- `opts.onId` — callback receiving the gate ID. Tests use it to pre-set answers on the test server.
- `opts.poll` / `opts.timeout` — timing controls for fast tests.

9 tests in `gate.test.mjs`: 5 unit (gate function), 4 integration (write_file/edit_file with mock gate server on :3939).

## Gated tools

- `write_file` (extensions/fs)
- `edit_file` (extensions/edit-file)

## Ungated tools

- `read_file`, `list_directory`, `bash` (read-only), `git`, `run_tests`, `self_test`, `register_mcp`, `enable_mcp`, `restart_desktop`

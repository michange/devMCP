# Changelog

## 1.7.0

- **gate**: web-based write approval. `write_file` and `edit_file` open a browser tab on the user's screen for approve/reject. Side channel — Claude cannot see or interact with the approval page.
- **devmcp.config.json**: new config file. `gate.server` sets the approval server URL, `gate.enabled` toggles gating on/off. Read fresh on every call.
- **safety commit**: auto git commit before every gated write. Rollback point with `[devmcp-safety]` prefix. No-ops outside git repos.
- **built-in extensions**: bash (read-only shell), fs (read_file, write_file, list_directory), edit-file (surgical str_replace), gate (approval + safety commit).
- **test**: 9 gate tests (5 unit, 4 integration) with DI via `_gateOpts` and mock gate server on :3939. Config save/restore in afterAll.

## 1.6.0

- **extensions**: dynamic extension loader — `extensions/*/index.js` loaded at boot, merged into tool catalogue. Drop a folder, restart, tools appear.
- **validators.js**: extracted shared validation (no circular imports between core and extensions).
- **install.js**: rewritten with pre-checks and write verification.
- **uninstall.js**: added — removes devMCP from Desktop and CLI configs with verification.
- **test**: core tools assertion is extension-proof (contains, not equals).
- **README**: Install/Reinstall/Uninstall sections, Extensions section, CLI auto-discovery note.

## 1.5.0

- **restart_desktop**: full process tree cleanup via `osascript quit` + `killall -9` on all Helper/Renderer/Plugin variants. Fixes orphan processes blocking relaunch.
- **restart_desktop**: nohup + temp script to escape Anthropic's `disclaimer` sandbox process group reaping.
- **restart_desktop**: `VITEST` env guard prevents `self_test` from triggering real restart (fixes infinite boot loop).

## 1.2.0

- **security**: `execFileSync` replaces `execSync` everywhere. Input validation (`validatePath`, `validateName`, `validateCommand`, `validateArgs`) with shell metacharacter blocking. Defense in depth.

## 1.1.0

- Initial release. Bootstrap MCP server for Claude Desktop & CLI. 5 tools: `run_tests`, `self_test`, `register_mcp`, `restart_desktop`, `enable_mcp`. JSON-RPC stdio, zero runtime dependencies.

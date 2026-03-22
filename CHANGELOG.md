# Changelog

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

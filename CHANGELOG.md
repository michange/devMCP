# Changelog

## 2.0.0

- **gate**: web-based write approval. `write_file` and `edit_file` open a browser page on the user's screen, and the user approves or rejects there. The page is a side channel: the calling agent never sees it and cannot answer for the user. Shipped after 1.9.0 and listed under 1.7.0 by mistake until this release.
- **devmcp.config.json**: config file at the repository root. `gate.server` holds the approval server URL and `gate.enabled` turns gating on or off. Both are read fresh on every call, so a change takes effect without a restart.
- **safety commit**: every gated write is preceded by an automatic git commit prefixed `[devmcp-safety]`, which gives a rollback point. It does nothing outside a git repository or in a clean one.
- **built-in extensions**: bash (read-only shell), fs (read_file, write_file, list_directory), edit-file (surgical str_replace), gate (approval and safety commit, exposing no tool of its own).
- **project-management**: new extension exposing `write_plan`, which validates the next canonical project plan, archives its predecessor and renders the adjacent HTML projection. The plan modules are a verbatim copy of enigma `tools/plan-mcp`; see `extensions/project-management/ORIGIN.md`.
- **project-management**: `validateVersion` now checks every work package against its version's status. It previously checked none, so a version could be declared complete above a work package still active and publish in silence. `active` joins the set of started statuses, because `in-progress` is a todo's word for started work and `active` is a work package's.
- **gate**: flagged as orphan code. The three `/gate` routes were served by voteCards, which has since been archived, so nothing gates today and `gate.enabled` ships as `false`. The code is kept so a future host can serve the same routes.
- **extensions in git**: `.gitignore` ignored `extensions/*/`, so ten extensions had never entered the repository and existed on one disk only — bash, edit-file, force-model, fs, git, git-push, http-request, npm-install, open-in-ide, and `gate/index.js`. The rule is dropped and all ten are now tracked. It also made `git add` refuse tracked files under `extensions/`, which forced `-f` on every commit touching them.
- **test**: `gate.test.mjs` restores the configuration the repository actually had. It used to write back a hard-coded literal with `enabled: true`, so every `npm test` left the working tree dirty and armed the gate against a server that no longer runs. The next gated call then hung for the full 120 s timeout and failed with "Gate timed out".
- **project-management**: a todo declares how its work is run by naming a cycle in its `cycle` field. A cycle is a directory under `skills/cycles/` holding a YAML file of the same name, listing ordered steps, each declaring whether it is gated and whether it is skippable. The nine plan phases become one such cycle, `cyPhases`, and the sixteen build steps another, `cyBuild`. A name is resolved against the cycles found on disk, then against the skills; a name that is neither is refused, naming both lookups. The tracking array holds one entry per step of the declared cycle instead of a fixed nine. A todo declaring nothing follows `cyPhases`, so published plans keep validating; publishing gives an unfinished todo `cycle: dialogue` and leaves a completed one untouched. See `docs/dev-mcp-plans.md`.
- **project-management**: `plan/yaml.js` parses the YAML subset a cycle declaration uses — nested keys, lists of mappings, booleans, strings — refusing anything else with its line number. Node reads no YAML and devMCP keeps no runtime dependency, so the parser ships here.
- **skills**: `dialogue.skill.md` and `lisibilite.skill.md` join the corpus, and `skills/cycles/` declares `cyPhases` and `cyBuild`. `cyBuild` links the sixteen step skills of `build/` rather than copying them.
- **test**: the suite counts 128 cases across 15 files. Two of the 93 it once reported were throwaway fixtures left behind by interrupted runs in `.tmp-test-*` and `.tmp-env-*`, which vitest collected as if they were real suites; `.tmp-env-*` joins `.tmp-test-*` in `.gitignore`. Four cases fail on any machine whose MCP configuration lacks the servers they name.
- **open-in-ide**: `open_in_ide` launches the IDE with `open -a PhpStorm` instead of calling the application binary. That binary cannot hand a file to a running instance: with the project open it exits 15 on `is already opened`, and it has also been seen returning a success the tool reported as `opened <path> in PhpStorm` while nothing appeared. The second case is the dangerous one, because four steps of the build cycle present a document by opening it. A line number is now documented as best effort, since macOS passes arguments only to an application it starts. Five cases in `open-in-ide.test.js`.
- **version**: `package.json`, the `serverInfo` block of `mcp-server.js` and this file now agree. They declared 1.6.0, 1.9.0 and 1.7.0 respectively.

## 1.9.0

- **mcp-list**: new extension exposing `mcp_list`, which reads the four client configuration sources and returns the merged MCP servers as JSON, each annotated with the source it came from. A `noCache` parameter forces a raw file-descriptor read.
- **mcp-self-scan**: new extension exposing `mcp_self_scan`, which shells out to `claude mcp list` and parses the CLI output into JSON.
- **mcp-twin-scan**: new extension exposing `mcp_twin_scan`, which runs the file scan and the CLI scan in parallel and reports what each one sees. Running both costs what the CLI scan alone costs, so the second opinion is free.
- **naude**: new extension exposing `naude_start`, `naude_stop`, `naude_restart` and `kill_port`. `naude_start` accepts a `configPath` that `naude_restart` reuses, and the restart polls for health before returning.
- **perf**: benchmarks comparing the two discovery paths. Reading the configuration files takes about 0.5 ms; asking the CLI takes about 440 ms. `mcp_list` returns an `_meta.elapsedMs` field.

## 1.8.0

- **run_tests_one_by_one**: new core tool. It runs a suite one test at a time, addressed by rank, and returns each verdict separately, so the agent drives the loop instead of reading one aggregated report.

## 1.7.1

- **run_tests**: new `pattern` parameter, passed to vitest as `-t`. It selects individual tests by name, by substring or by regular expression.

## 1.7.0

- **register_mcp**: warns when an argument looks like a relative path. Claude Desktop ignores the working directory, so a relative script path registers a server that cannot start.
- **README**: extensions guide, covering the loader contract and the absolute-path requirement.

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

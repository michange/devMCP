# mcp-list — read the four configuration files the client merges

## Problem

MCP servers are not declared in one place. The Claude CLI merges four sources at startup, and a server
that appears in one and not another behaves differently depending on where the session was opened.
Answering "which servers exist" by opening four files by hand is slow and easy to get wrong.

## Solution

The extension exposes one tool, `mcp_list`, which reads all four sources and returns one merged object
in JSON, each server annotated with the source it came from.

The four sources, in the order they are applied:

1. `~/.claude.json`, key `mcpServers` — the global list.
2. `~/.claude/mcp.json` — the dedicated global file, when it exists.
3. `<projectRoot>/.claude/mcp.json` — the project file, when `projectRoot` is given.
4. `~/.claude.json`, key `projects[<projectRoot>].mcpServers` — the per-project legacy list.

Later sources overwrite earlier ones under the same name, which is what the client does. A source that
is missing or malformed is skipped rather than reported, because three of the four are optional.

## Output

The result holds `servers`, each entry carrying its original configuration plus a `_source` field
naming which of the four it came from; `sources`, giving the resolved path of each; and `_meta` with
the elapsed time and the number of files read.

## The noCache parameter

Setting `noCache` reads each file through a raw file descriptor into a fresh buffer, bypassing Node's
stream layer. It does not bypass the operating system page cache, which only `sudo purge` clears, so
the measured difference is small. The parameter exists for measurement rather than correctness.

## Speed, and why it matters

Reading the four files takes about half a millisecond. Asking the CLI the same question by running
`claude mcp list` takes about 440 milliseconds. That ratio is why this tool exists next to
`mcp_self_scan`, which asks the CLI. See `extensions/mcp-self-scan/DESIGN.md` for what the slower path
buys.

## Client coupling

The four paths are Claude CLI paths. Serving another client means changing them.

## Tests

Nine cases in `mcp-list.test.js`. Some assert on servers present in this machine's configuration and
fail elsewhere.

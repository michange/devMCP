# mcp-self-scan — ask the CLI what it sees, instead of reading its files

## Problem

Reading configuration files tells you what is written down. It does not tell you what the client
actually loaded. The two differ when a file is malformed, when a source is applied in an order the
reader did not reproduce, or when the client's own resolution rules have changed since the reader was
written.

## Solution

The extension exposes one tool, `mcp_self_scan`, which runs `claude mcp list` and parses its text
output into JSON. The answer comes from the client itself, so it cannot disagree with the client the
way a re-implementation of its merge rules can.

## Parsing

Each non-empty line is matched against `name: detail`. A `detail` starting with `http://` or
`https://` is typed `http`, and the trailing ` (HTTP)` marker the CLI prints is stripped. Everything
else is typed `stdio`. Lines that do not match the shape are skipped, so banner and footer text does
not become a server.

## Failure handling

A non-zero exit does not fail the tool. The CLI writes useful output to stderr in several situations,
so stdout and stderr are concatenated and parsed anyway. Only genuinely empty output returns an error.
Execution times out after 30 seconds, and `FORCE_COLOR=0` with `NO_COLOR=1` keeps escape sequences out
of the text being parsed.

## What it cannot see

`claude mcp list` reports servers declared in local configuration. Cloud connectors and built-in tools
do not appear, so an empty result for a server does not prove that server is unavailable.

## Cost

The call takes about 440 milliseconds, roughly a thousand times the cost of reading the files
directly. `extensions/mcp-list/DESIGN.md` describes the fast path, and
`extensions/mcp-twin-scan/DESIGN.md` describes running both at once.

## Client coupling

The tool shells out to the `claude` binary.

## Tests

Nine cases in `mcp-self-scan.test.js`, plus one in `debug-raw.test.js`. Some assert on servers present
in this machine's configuration and fail elsewhere.

# mcp-twin-scan — run both scans at once and compare what they saw

## Problem

Two ways of listing MCP servers exist, and they answer slightly different questions. Reading the
configuration files says what is declared, in about half a millisecond. Running `claude mcp list`
says what the client loaded, in about 440 milliseconds. Choosing one means giving up what the other
knows.

## Solution

The extension exposes one tool, `mcp_twin_scan`, which runs both and returns both, along with a diff.
The two run concurrently through `Promise.all`, and the file scan is the fast one, so the total cost
is the cost of the CLI scan alone. The second opinion is free in wall-clock time.

## The diff

The result reports `common`, the servers both scans found; `onlyInFileScan`, declared but not loaded;
`onlyInCliScan`, loaded but not found in the four files; and `match`, true when both lists agree.

Each side is worth reading. A name in `onlyInFileScan` is usually a declaration the client rejected or
a source this reader consults and the client does not. A name in `onlyInCliScan` is a server reaching
the client through a path the file scan does not cover.

## Why the two scans are inlined

Both scan implementations are copied into this module rather than imported from `mcp-list` and
`mcp-self-scan`. The loader gives no ordering guarantee between extensions, so importing one extension
from another would couple this tool to a load order nothing enforces. The cost is that a fix to the
merge rules has to be applied in more than one file.

## Output

Besides `diff`, the result holds `fileScan` and `cliScan`, each with its servers and its own elapsed
time, and `_meta` with the total elapsed time and both individual timings.

## Client coupling

The file scan reads Claude CLI paths and the CLI scan shells out to the `claude` binary.

## Tests

Seven cases in `mcp-twin-scan.test.js`. Some assert on servers present in this machine's configuration
and fail elsewhere.

# fs — read a file, write a file, look at a directory

## Problem

Every other capability in the server assumes the agent can already see the filesystem. Reading a
file, writing one, and finding out what a directory contains are the three operations that come
before anything else.

## Solution

The extension exposes three tools, `read_file`, `write_file` and `list_directory`. All three validate
their path through the shared `validatePath` in `validators.js`, so a relative path or a path
containing shell metacharacters is rejected before any syscall.

## read_file

`read_file` returns the file as UTF-8 text. A missing or unreadable file returns an error carrying the
system message rather than throwing.

## write_file

`write_file` takes a safety commit and waits for the approval gate before writing, in that order, so a
rejected gate leaves the file untouched. It then creates the parent directories it needs and writes
the content. The tool overwrites without warning: there is no append mode and no merge.

## list_directory

`list_directory` walks a directory and returns an indented tree, folders before files, each level
sorted by name. It descends two levels by default, which `depth` overrides. Entries whose name starts
with a dot are skipped unless `includeHidden` is set, and `node_modules`, `.git` and `.DS_Store` are
always skipped, because listing them buries the answer the caller wanted.

A subdirectory that cannot be read does not abort the walk. Its line reads `(unreadable: <reason>)`
and the walk continues.

## Tests

None of its own. Four cases in `gate.test.mjs` exercise `write_file` through the approval gate, and
`mcp-server.unit.test.js` exercises the tools indirectly.

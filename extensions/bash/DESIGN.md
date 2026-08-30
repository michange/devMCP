# bash — a shell that can look but cannot touch

## Problem

An agent that inspects a project needs a shell. `ls`, `grep`, `find` and `cat` answer questions no
structured tool answers as quickly. A general shell also deletes files, installs packages, opens
network connections and spawns interpreters, and an agent reaches those by accident as easily as on
purpose.

## Solution

The extension exposes one tool, `bash`, and refuses every command that is not plainly read-only. A
command must pass three independent checks before it runs. Each check is a regular expression, and
each one alone is enough to reject.

## The three checks

The **allowlist** requires the command to begin with one of these words: `ls find cat grep rg head
tail wc stat file echo pwd which env printenv du df tree sort uniq cut awk sed jq diff type`. The
pattern is anchored with `^`, so a forbidden command cannot hide behind an allowed one.

The **forbidden-command list** rejects a second command appearing anywhere in the line: writes
(`rm`, `mv`, `cp`, `touch`, `mkdir`, `tee`, `dd`, `truncate`), permission changes (`chmod`, `chown`),
process control (`kill`, `pkill`, `killall`), network (`curl`, `wget`, `ssh`, `scp`, `rsync`) and
interpreters (`node`, `python`, `bash`, `sh`, `eval`, `exec`, `source`). Every word is wrapped in
`\b`, because without that anchor `exec` rejected the path `/usr/local/exec-tool` and `ln` rejected
any path containing `aln`.

The **metacharacter check** rejects what the shell itself would interpret even when the base command
is allowed: `$(...)` and backticks perform command substitution, and `>` or `>>` write to a file. The
redirect pattern is written `(?<!\|)>(?!=)` so that `>=` inside an `awk` or `jq` expression still
passes, and `\|[^|]*>` rejects a pipe that ends in a redirect while leaving a plain pipe alone.

## Tool

`bash` takes a `command` and an optional `cwd`. Execution times out after 15 seconds. Standard input
is closed, so a command that waits for input fails instead of hanging.

## Limits

The handler calls `execSync`, which runs the command through `/bin/sh -c`. The three checks are the
only barrier; there is no sandbox underneath. A command that passes them runs with the full rights of
the user who started the server.

Comments in this module are written in French, unlike the rest of the repository.

## Tests

None of its own. The tool is exercised indirectly through `mcp-server.unit.test.js`.

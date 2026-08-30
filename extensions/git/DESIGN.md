# git — a fixed list of git subcommands, run without a shell

## Problem

Version control is where an agent does its most useful and its most destructive work. Handing it an
unrestricted `git` means handing it `reset --hard`, `push --force` and `clean -fdx`. Handing it
nothing means it cannot read a diff or record a commit.

## Solution

The extension exposes one tool, `git`, which accepts arguments as an array and runs them through
`execFileSync`. No shell is involved, so an argument containing a space or a quote reaches git as one
argument and nothing is re-parsed.

The first argument must be one of: `status`, `log`, `diff`, `add`, `commit`, `push`, `pull`, `branch`,
`checkout`, `stash`, `tag`, `remote`, `fetch`, `show`, `rev-parse`. Anything else is rejected with the
list. `reset`, `clean`, `rebase`, `filter-branch` and `gc` are absent by design: each can destroy work
that no other copy holds.

## Why this module validates its own arguments

The shared `validateArgs` in `validators.js` rejects newlines, which would make a multi-line commit
message impossible. This module therefore applies its own `validateGitArgs`, which allows newlines and
rejects the shell metacharacters `; & | ` $ ( ) { } ! #`.

Parentheses are among them, so a commit message containing them cannot be passed inline. Writing the
message to a file and calling `git commit -F <path>` works, because a path passes validation.

## Tool

`git` requires `cwd`, an absolute path to the repository, and `args`, the git arguments as an array of
strings. Execution times out after 30 seconds. `FORCE_COLOR=0` is set so the output carries no escape
sequences. A failing command returns its stdout, its stderr and its exit code rather than throwing.

## Tests

None of its own.

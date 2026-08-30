# git-push — pushing is a decision, so a human takes it

## Problem

A push publishes. Once a branch reaches a remote, other people fetch it, continuous integration runs
on it, and taking it back is a second public act rather than an undo. Every other git subcommand this
server exposes stays inside the working copy; `push` is the one that leaves.

## Solution

The extension exposes one tool, `git_push`, and every call goes through the approval gate before
anything is pushed. The human approves in a browser page the agent cannot reach; the tool only saves
the trip to a terminal.

The arguments are deliberately narrow. `git_push` accepts a remote and a branch, and nothing else. A
tool that forwarded arbitrary git arguments would let `--force` and `--mirror` through whatever
allowlist guarded the subcommand, and both rewrite history that other people already hold.

## Order of operations

The gate is awaited **first**. Nothing is pushed until it resolves. A rejection returns `User
rejected` and an unanswered gate returns `Gate timed out` after 120 seconds; in both cases the push
never runs.

## Tool

`git_push` requires `cwd` and `branch`. `remote` defaults to `origin`. `setUpstream` adds `-u`, which
the first push of a new branch needs. The remote and branch names are checked against the shell
metacharacters `; & | ` $ ( ) { } ! #` and whitespace. `execFileSync` already passes arguments
without a shell, so this check is defence in depth against a malformed ref rather than the only
barrier.

## Consequence of a disabled gate

`gate.enabled` currently ships as `false`, so `gate()` returns immediately and `git_push` publishes
without asking anyone. See `extensions/gate/DESIGN.md` for why the gate is disabled.

## Tests

Seven cases in `git-push.test.js`, using the `_gate` and `_exec` injection points to run without a
gate server and without pushing.

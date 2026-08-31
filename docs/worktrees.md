# Managing worktrees

Parallel work happens in git worktrees. Each holds a branch, and at most one session works in it at a
time. This document states what devMCP guarantees about reading that arrangement and about changing
it.

The shape of the answer to a read is defined in [`worktree-view.md`](./worktree-view.md). The way a
capability is served is defined in [`dev-mcp-frontend.md`](./dev-mcp-frontend.md).

## Reading

The view is built from three sources on every read, and none of them is cached. `[BREQ-S01]`

Git supplies the worktrees and the branch each has checked out. `[BREQ-S02]`

The mission registry at `.git/codex-worktrees/index.json` supplies the declared owner of a branch and
the state of its mission, and only entries whose `status` is `open` are read. `[BREQ-S03]`

The current plan, the `plan-<semver>.json` of highest version in `plans/`, supplies work packages,
todos, their statuses and their workspaces. `[BREQ-S04]`

Where a plan node carries `execution.session`, that value supersedes the registry's owner for the
same branch. `[BREQ-S05]`

A worktree is joined to a session through its branch, never through its path. `[BREQ-S06]`

A todo is current when its status is neither `complete` nor `deferred`, and a worktree's current
todos are ordered `in-progress`, `blocked`, `ready`, `pending`. `[BREQ-S07]`

The view holds one entry per worktree git reports, the main one included. `[BREQ-S08]`

A session whose worktree no longer exists keeps its entry, with a null worktree. `[BREQ-S09]`

Every disagreement between the three sources is reported as a divergence naming the branch it
concerns. `[BREQ-S10]`

A read succeeds when `plans/` holds no plan, reporting what the two remaining sources say and a
divergence for the absent plan. `[BREQ-S11]`

## Creating a worktree

A worktree is created for one branch, at a path derived from that branch, and the branch is created
when it does not exist. `[BREQ-S12]`

The starting point is stated by the caller as a branch, a tag or a commit; absent one, the current
`HEAD` is used. `[BREQ-S13]`

Creation is refused when the branch is already checked out in another worktree, naming that
worktree. `[BREQ-S14]`

Creation is refused when the target path exists, whether or not git knows it. `[BREQ-S15]`

Creation records an open mission in the registry, holding the branch, the path and the session that
asked. `[BREQ-S16]`

## Sharing what must not be duplicated

A created worktree reaches `skills/` through a link, because rules that differ between sessions are
no longer rules, and it reaches `node_modules` through a link, because a worktree never carries one.
`[BREQ-S26]`

The versioned link is `../skills` at every depth, so creation guarantees that the parent directory of
the new worktree holds a `skills` entry resolving to the canonical one. `[BREQ-S27]`

Creation never deletes a versioned directory to put a link in its place. `[BREQ-S28]`

A worktree whose shared link does not resolve is reported as a divergence naming it, since git
reports nothing and the error names a path that exists. `[BREQ-S29]`

## Handing over

A handover reports the mission's identity, its commits, the files it touched with their line counts,
those paths inside its declared scope and those outside, the shared paths, and how the target branch
has moved since the mission started. `[BREQ-S37]`

A handover pins the head it was computed from, so a reader can tell that a commit was added after the
report was read. `[BREQ-S38]`

A handover changes nothing. `[BREQ-S39]`

## Closing a mission

Closing is refused while the worktree holds uncommitted or untracked changes. `[BREQ-S30]`

Closing is refused when the worktree has a branch other than the mission's checked out, naming both.
`[BREQ-S31]`

Closing is refused when the mission's head is its own baseline, since nothing was produced.
`[BREQ-S32]`

Closing is refused when the mission's commits are not reachable from the stated integration branch,
unless the caller declares the mission abandoned and gives a reason. `[BREQ-S33]`

Closing a mission whose worktree no longer exists checks reachability alone, because no other
question can still be answered. `[BREQ-S34]`

Abandonment is refused for a mission that is in fact integrated, naming the branch that holds it.
`[BREQ-S35]`

A closed mission records the head it closed at, and either the branch it was integrated into or the
reason it was abandoned. `[BREQ-S36]`

## Deleting a worktree

Deletion removes the worktree directory and its git registration, and closes any mission occupying
its branch. `[BREQ-S19]`

Deletion is refused when the worktree holds uncommitted changes, listing them, unless the caller
states that losing them is intended. `[BREQ-S20]`

Deletion is refused when the worktree holds commits absent from every other ref, listing them, unless
the caller states that losing them is intended. `[BREQ-S21]`

Deletion never deletes the branch. `[BREQ-S22]`

Deletion of the main worktree is refused. `[BREQ-S23]`

## Preparing a commit

The pre-commit collector reports the source worktree path, the source branch, the current parent
commit, the recorded mission base, the intended target branch with its remote-tracking branch, how
far each remote is ahead or behind, and the paths that would be staged. `[BREQ-S40]`

The collector attempts to refresh remote-tracking state, and reports how old that state is when the
attempt does not succeed. `[BREQ-S41]`

The collector stages nothing, commits nothing and pushes nothing. `[BREQ-S42]`

## Every mutation reads first

A mutation resolves the view for the branch it targets before acting, and reports the occupant it
found. `[BREQ-S24]`

A mutation refused for any reason changes nothing: no directory, no registry entry, no ref.
`[BREQ-S25]`

## Retired

`[BREQ-S17]` and `[BREQ-S18]` described releasing a worktree by closing its mission without
verifying anything. Closing now answers that need, and verifies before it closes.

## Excluded

Committing and pushing are performed by no tool of this capability: the collector prepares the gate a
person passes, and passing it stays theirs. A hosted pull request is never opened, because the local
pull request is the handover. A branch is never merged into another. Nothing here starts or stops a
process: a worktree holds work, it runs nothing.

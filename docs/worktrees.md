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

## Releasing a worktree

Releasing marks the mission occupying a branch as closed in the registry, and leaves the worktree,
the branch and every file untouched. `[BREQ-S17]`

Releasing a branch that no open mission occupies succeeds and reports that nothing was occupied.
`[BREQ-S18]`

## Deleting a worktree

Deletion removes the worktree directory and its git registration, and closes any mission occupying
its branch. `[BREQ-S19]`

Deletion is refused when the worktree holds uncommitted changes, listing them, unless the caller
states that losing them is intended. `[BREQ-S20]`

Deletion is refused when the worktree holds commits absent from every other ref, listing them, unless
the caller states that losing them is intended. `[BREQ-S21]`

Deletion never deletes the branch. `[BREQ-S22]`

Deletion of the main worktree is refused. `[BREQ-S23]`

## Every mutation reads first

A mutation resolves the view for the branch it targets before acting, and reports the occupant it
found. `[BREQ-S24]`

A mutation refused for any reason changes nothing: no directory, no registry entry, no ref.
`[BREQ-S25]`

## Excluded

Committing, pushing, opening a pull request, handing a mission to another session, and integrating a
branch are not part of this capability. Enigma's `worktree` skill conducts them, and its scripts
already do. Nothing here starts or stops a process: a worktree holds work, it runs nothing.

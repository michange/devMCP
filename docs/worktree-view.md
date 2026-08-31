# The worktree view

Two questions nobody holds in their head past three parallel sessions: **who occupies this worktree**,
and **where does this session work**. This document defines the answer's shape, independently of how
it is served.

## Three sources, none sufficient

**Git** lists the worktrees and the branch each has checked out. It never knows who occupies one.

```sh
git worktree list --porcelain
```

**The mission registry**, at `.git/codex-worktrees/index.json`, holds the declared owner of a branch
and the state of its mission. It also holds closed missions, whose worktree no longer exists, so
only entries with `status: "open"` are read.

**The current plan**, the `plan-<semver>.json` of highest version in `plans/`, holds the work
packages, their todos, each todo's status and its workspace. Some nodes carry `execution.session`,
which is more reliable than the registry wherever it exists, because it is rewritten on every
publication.

## The join is on the branch

A worktree meets a session through its **branch**, never through its path. The registry stores a
path, the plan stores sometimes a worktree name and sometimes a branch name, and the two have
diverged. Only the branch is stated identically by all three sources.

## A current todo

A todo is current when its status is neither `complete` nor `deferred`. A worktree may hold several.
They are all kept, ordered by how far along they are: `in-progress`, then `blocked`, then `ready`,
then `pending`.

## The view model

```js
{
  worktrees: [{
    path:        '/abs/path/to/worktree',
    branch:      'wp12-gateway',
    isMain:      false,
    session:     'a1b2c3' | null,   // registry owner, or execution.session when the plan has one
    workPackage: 'WP12-web-gateway' | null,
    todos:       [{ path: 'WP12-web-gateway.gateway', status: 'in-progress' }],
  }],
  sessions: [{
    id:          'a1b2c3',
    workPackage: 'WP12-web-gateway' | null,
    todos:       [{ path: '…', status: 'in-progress' }],
    worktree:    '/abs/path' | null,   // null when the session's worktree is gone
  }],
  divergences: [{ kind: 'mission-without-worktree', branch: 'wp9-old', detail: '…' }],
  sources: {
    git:      { worktrees: 4 },
    registry: { path: '.git/codex-worktrees/index.json', open: 3 },
    plan:     { path: 'plans/plan-2.4.0.json', version: '2.4.0' },
  },
}
```

`worktrees` holds one entry per worktree git reports, the main one included. A worktree with no open
mission carries `session: null`. A worktree with no current todo carries an empty `todos`, which says
either that the session is idle or that the plan is behind the work.

`sessions` holds one entry per session that has an open mission or an unfinished todo. A session
whose worktree has disappeared keeps its entry, with `worktree: null`.

## Divergences are the payload, not the error path

A crossing of three sources that agree tells the reader what they already assumed. A crossing that
disagrees tells them where the truth is. Hiding a disagreement makes the whole view decorative.

Four kinds are reported:

| kind | what it means |
|---|---|
| `mission-without-worktree` | the registry holds an open mission whose worktree git does not list |
| `worktree-without-mission` | git lists a worktree that no open mission claims |
| `todo-workspace-unknown` | a todo names a workspace matching no existing branch or worktree |
| `session-worktree-gone` | a session holds unfinished work in a worktree that no longer exists |

Each entry names the branch it concerns, so the reader goes straight to it.

## Two checks before the view is trusted

The number of worktrees git reports and the number of entries in `worktrees` are equal. A view that
loses one has a join defect, not a missing worktree.

Every disagreement between the three sources appears in `divergences`. A source read but not
reconciled is a source that silently loses information.

## Nothing is stored

The model is built on every read. Sessions open and close in minutes, and a saved view is wrong
shortly after it is written while carrying no indication of when that was.

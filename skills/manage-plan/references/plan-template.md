# Canonical plan shape

Store canonical state at `<projectPath>/plans/plan-<semver>.json`. Generate only the adjacent
versioned `.html` projection after publishing the JSON. The JSON uses the following shape:

Every logical plan mutation creates a new immutable SemVer JSON snapshot. `plans/` contains the
current JSON and its derived HTML; `plans/archive/` contains preceding JSON snapshots only.

```json
{
  "project": {
    "name": "enigma",
    "repo": ".",
    "remote": "origin",
    "documentation": "./docs/index.md",
    "versions": [
      {
        "name": "v0.1",
        "status": "active",
        "specification": "./docs/architecture.md",
        "workPackages": [
          {
            "name": "WP1-app-lifecycle",
            "status": "ready",
            "execution": { "cli": "claude", "session": "optional-session-id" },
            "contracts": ["./docs/architecture.md"],
            "todos": [
              {
                "path": "WP1-app-lifecycle.implement",
                "status": "in-progress",
                "workspace": { "kind": "branch", "name": "wp1-implement" },
                "execution": { "cli": "codex" },
                "contracts": ["./docs/architecture.md"],
                "cybuild": [
                  { "step": "PRE-READ", "status": "pending" },
                  { "step": "PURPOSE", "status": "pending" },
                  { "step": "TEST PLAN", "status": "pending" },
                  { "step": "RED", "status": "pending" },
                  { "step": "GREEN", "status": "pending" },
                  { "step": "REGRESSION", "status": "pending" },
                  { "step": "DEMO/DOCS", "status": "pending" },
                  { "step": "REVIEW", "status": "pending" },
                  { "step": "COMMIT", "status": "pending" }
                ],
                "todos": []
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Allowed statuses:

- Version: `planned`, `active`, `complete`, `archived`.
- Work package: `planned`, `ready`, `active`, `blocked`, `complete`, `deferred`.
- Todo: `pending`, `ready`, `in-progress`, `blocked`, `complete`, `deferred`, `dropped`.

Contract references must resolve to existing project-relative Markdown files below the explicit
`projectPath` passed to `write_plan`. Todo segments begin
with a lower-case letter and may contain letters, digits, and hyphens. Branch and worktree assignments
must resolve in the current Git repository.

A todo with status `blocked`, `deferred`, or `dropped` may carry `"contracts": []` when no accepted
contract exists. Other statuses require at least one contract.

## Recursive todo materialization

A dot-delimited todo path mirrors its planning folders below `todos/`:

```text
WP11-library-fixes.lane-b
-> todos/WP11-library-fixes/lane-b/

WP11-library-fixes.lane-b.pull-closed-key-set
-> todos/WP11-library-fixes/lane-b/pull-closed-key-set/
```

Each lane or todo folder contains a Markdown work list. Ordinary actions remain checklist entries in
that document and do not become plan nodes. An action becomes a child todo only when it owns a
separate Cybuild cycle; the child then owns a subfolder, a planning document, and all nine Cybuild
phases. Apply this split recursively at any depth.

A container todo with no Cybuild cycle of its own carries all nine phases as `skipped`. Its Cybuild
children track their phases independently.

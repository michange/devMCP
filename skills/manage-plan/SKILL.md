---
name: manage-plan
description: Create, update, validate, or explain Enigma project plans. Use when a user asks to plan work, change version/work-package/todo status, assign a branch or worktree, reconcile a plan with contracts, or inspect plan structure.
---

# Manage Plan

Create and maintain plans whose execution nodes point to normative contracts. Plans and todos may reference contracts; contracts must never reference plans or todos.

## Workflow

1. Read the affected project, version, and work-package contracts before changing a plan.
2. Load [the canonical plan shape](references/plan-template.md).
3. Read the highest unlocked `plan-<semver>.json` in `<projectPath>/plans/` directly and prepare the
   complete replacement plan before acquiring the write lock.
4. Derive the new snapshot from the latest plan while preserving identifiers and unrelated entries.
5. Put execution state only in the plan: version, work-package, and todo statuses plus todo workspace assignment.
6. Call `write_plan` once with `{ projectPath, baseVersion, plan, cliName, sessionID, wp, todo }`.
   Do not call an MCP tool merely to read the plan.
7. If `write_plan` returns `PLAN_STALE`, reread the current JSON, reapply the intended mutation, and retry.
8. If `write_plan` returns validation errors, read `attribution` before the error list. Errors marked
   `mine` come from the submitted mutation and are the caller's to fix. Errors marked `inherited`
   were already in the plan being replaced: correcting them belongs to whoever owns the faulty node,
   usually a session whose contract is not committed yet. Publication is refused either way, so
   report an inherited-only refusal to the pilot instead of resubmitting. An error marked `unknown`
   means the base plan could not be read, so reread the `plans/` directory before anything else.
9. If `write_plan` returns `missingContracts`, the plan cites documents that do not exist yet. A
   cycle may legitimately start before its contract is written, so this refusal is repairable:
   present the exact list to the pilot, obtain agreement, then call again with
   `stubMissingContracts: true`. Never pass that argument on the first call, and never pass it to
   silence a refusal that carries any other error — the tool refuses to create anything in that
   case. A created document holds a title and one sentence stating that the contract remains to be
   written; filling it is the cycle's work, not the tool's.
10. After `write_plan` succeeds, return a relevant structured summary of the changes made by the
    pilot. By default, present the accepted work-package subtree: its status and the affected todos'
    paths, statuses, workspaces, execution owners, contracts, and changed Cybuild phases. Derive
    this summary from the exact plan accepted by the MCP; omit unrelated work packages and unchanged
    detail.
11. Treat the versioned HTML as a disposable projection. Never edit it by hand and never create a
    Markdown plan projection.

## Plan Versioning

- Keep one canonical current `plan-<major>.<minor>.<patch>.json` and its derived
  `plan-<major>.<minor>.<patch>.html` in `plans/`. Keep older canonical JSON snapshots in
  `plans/archive/`; do not archive generated HTML.
- Treat every canonical JSON snapshot as immutable. Every logical write that changes plan state
  creates the next SemVer JSON; never overwrite a plan JSON.
- Map the three plan hierarchy levels directly to SemVer as `[Version.WorkPackage.Todo]`:
  - increment **major** when a version node is added, removed, or materially changed;
  - increment **minor** when a work-package node is added, removed, or materially changed;
  - increment **patch** when only todo nodes, their status, assignment, execution, contracts, Cybuild state, or detail change.
- When one revision changes several levels, increment the highest affected level and reset every lower component to zero.
- Determine the increment mechanically from the highest changed hierarchy level. Do not ask the user to choose between major, minor, and patch unless the affected hierarchy level itself is genuinely unclear.
- Group all state changes deliberately made in one `manage-plan` invocation into one new snapshot.
  A later invocation, correction, assignment, status transition, or Cybuild-phase update creates
  another version even when the previous snapshot has not been committed yet.
- Keep JSON as the sole canonical state. HTML is a disposable human-readable projection.
- Older versions are history, not contracts, and contracts must not link back to them.

## Atomic write protocol

- Coordinate writers only through an atomic filesystem rename; do not use an in-process MCP mutex.
- Acquire `plan-X.Y.Z.json` by renaming it to
  `plan-X.Y.Z.locked-<YYYYMMDDTHHMMSSmmmZ>.json`.
- Update the locked file's `mtime` every 10 seconds. A lock is reclaimable after 30 seconds without
  a heartbeat or after a hard maximum of 5 minutes from the filename timestamp.
- Reclaim a stale lock by atomically renaming it directly to a new timestamped lock name. Never
  restore the unlocked filename as an intermediate step.
- Before publishing, verify that the exact acquired lock path still exists. Abort with
  `PLAN_LOCK_LOST` if another writer reclaimed it.
- Validate before publication. Publish the new canonical JSON atomically, archive the preceding
  JSON as `plans/archive/plan-X.Y.Z.json`, and release the lock. A stale locked version older than
  an existing current JSON is archived before acquiring that current JSON.
- Generate `plan-<new-semver>.html` only after releasing the JSON lock. HTML failure returns a
  warning and never invalidates the successful JSON write.
- `write_plan` changes no Git state: no staging, commit, push, or rollback of Git history.

## Contract Direction

- Project and version nodes reference existing project documentation.
- Work packages reference one or more existing thematic contracts relative to `projectPath`; do not invent one contract per work package.
- Every todo references one or more contracts declared by its work package.
- A `blocked`, `deferred`, or `dropped` todo may use `contracts: []` to expose a genuine contract gap; never substitute an unrelated document.
- Never add status, progress, roadmap, plan, todo, branch, or worktree information to a contract.
- Never add a link from a contract to a plan or todo artifact.

## Update Rules

- Name every work package `WP<number><optional uppercase suffix>-<semantic-name>`, for example `WP3-topology-source` or `WP4X-topology-branching-demo`.
- Use the complete work-package name as the root segment of every descendant todo path and as its owned documentation-folder name.
- Map every todo path to a planning folder below `todos/`, replacing dots with directory levels. For
  example, `WP11-library-fixes.lane-b.pull-closed-key-set` owns
  `todos/WP11-library-fixes/lane-b/pull-closed-key-set/`.
- Put a Markdown work list in a lane or todo's owned folder. Keep ordinary actions as checklist
  entries in that document; do not create one plan node per checklist entry.
- Promote an action to a child todo only when it owns a distinct Cybuild cycle. Give that child its
  own subfolder, planning document, workspace assignment, contracts, and nine Cybuild phases.
- Apply the same rule recursively: a child todo may keep ordinary work in its Markdown list and may
  split distinct Cybuild cycles into deeper child todos. Preserve this hierarchy in dot notation,
  one path segment per folder level.
- Mark all nine Cybuild phases `skipped` on a pure container todo that owns no Cybuild cycle of its
  own. Its Cybuild children track their phases independently.
- Treat the MCP result as validation, not authorization to invent missing requirements.
- Keep one workspace assignment per todo: either a branch or a worktree.
- Use only a branch or worktree that currently exists; the MCP checks Git as well as document paths.
- Optionally assign a WP or todo with `execution: { cli: "claude" | "codex", session?: "<session-id>" }`. Record only excavated or explicitly supplied session identifiers.
- Track all nine ordered Cybuild phases on every todo with `pending`, `in-progress`, `complete`, or `skipped`; never infer a completed phase merely from the todo's overall status unless the todo itself is verified complete.
- Optionally declare which phases a todo's work comprises with `cycle: "none" | "text" |
  "restructuring" | "complete" | "npm-release"`. Choose it when writing the todo, from the nature
  of the work: `text` for a skill, a contract or a briefing, where no assertion can fail on a writing
  rule; `restructuring` when no test tells the before from the after; `complete` for anything that
  changes observable behavior; and `npm-release` for an immutable record of one package publication.
  Mark every phase the chosen cycle leaves out `skipped` in the same mutation, because a phase the
  cycle excludes is not waiting, it will not happen. An `npm-release` record always marks all nine
  phases `skipped`.
- Omit `cycle` when the shape of the work is not settled. An absent field means `none`, which
  requires nothing of the phases, and a todo can gain its cycle later.
- A node's status is a claim about its children, and validation checks two of them. A `complete` node holds no todo outside `complete`, `deferred` and `dropped` — a finished package containing unfinished work is a contradiction. A `planned` or `ready` node holds no `in-progress` or `complete` todo — a package whose todo has started is `active`, and a session filtering the plan on `ready` must not pick up work already done. Both errors land on the child, which is the node to change.
- A child todo path extends its parent by exactly one segment.
- Do not infer completion from code presence alone; use explicit user intent or verifiable acceptance evidence.
- Keep contracts stable while updating execution state in the plan.

## MCP availability

`projectPath` is the repository root, which contains `docs/` and `plans/`. If `write_plan` is
unavailable, do not reproduce its write protocol in an
ad-hoc script. Keep the prepared mutation in memory and restart or expose the repository MCP.

A script that must publish imports `publishPlan` from `tools/plan-mcp/plan-writer.js`. It throws on
an invalid plan or a lost lock, so a script that ignores its result breaks instead of reporting a
publication that never happened. Importing it is not reproducing the write protocol.

## Claude Compatibility

This skill is plain Markdown and the MCP uses standard stdio JSON-RPC. In Claude Code, trust the
repository MCP configuration, read the JSON directly, then call `write_plan` only when ready to publish.

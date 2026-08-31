# @requirements — state the obligations before designing anything

Turn the accepted purpose into the contract's atomic obligations, each one tagged, before any
structure is proposed. A design answers obligations; obligations written after a design tend to
describe that design instead of the need.

## Procedure

Split the purpose into statements that can fail independently. A sentence holding two claims that
can fail separately is two obligations, and a compound one hides the failure of its weaker half.

Give each obligation one stable tag, in document order, at the end of its statement:

```text
The view holds one entry per worktree git reports, the main one included. `[WT-S08]`
```

The namespace is the deliverable's, never a phase or a cycle. A published tag is never reused,
renumbered, or written as a range: every reference stays mechanically discoverable.

Do not tag a heading, an example, a code sample, a rejected alternative, or a prerequisite. None of
them can be violated, so none of them can be covered.

## What makes an obligation

An obligation states what holds, in terms a reader can check without opening the implementation. It
names an observable: a value returned, a refusal raised, a file left untouched, an order preserved.

An obligation nobody can violate is not one. If no conforming implementation could ever break it,
it is describing the language, the data shape, or a decision already made elsewhere. Remove it.

An obligation that requires reading the code to know whether it holds belongs to the design, not to
the contract.

## Direction

The contract carries the tags. The TDD list and the plan cite them. Neither is cited back: a contract
that refers to a test plan or a todo stops being true the day that artifact is archived.

## Present

Write the tagged obligations into the contract they govern, then present that contract as
[`cyBuildModule`](./skill.cyBuildModule.md) prescribes under **Document presentation**: an active
Markdown link on the absolute path in the chat, and the same path opened in the IDE through the
devMCP `open_in_ide` tool.

Report the obligation count and the namespace used. State any part of the purpose that received no
obligation, and why it could not be stated as one.

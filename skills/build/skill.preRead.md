# @preRead — clear the table

Flatten everything the cycle will work with, before designing anything. Cooking starts by clearing
the table and taking out the ingredients one has in mind; the recipe comes after.

## Read

Read completely:

- `docs/coding-conventions.md`;
- the active todo, its ownership, and its briefing if one exists;
- every directly relevant normative document;
- the affected code, tests, and demos;
- every skill or reference linked by those sources.

Resolve relative links from their source files.

## Sieve

Every item this reading surfaces gets exactly one destination:

- **an immediate action** — answering a direct question, a Git task, anything an existing permission
  already covers. Do it, and report it;
- **a canonical write** — a plan node, a todo folder, a tagged obligation in a contract. This is what
  is understood and settled;
- **a stub** — a title and a waiting marker in the contract it concerns. This is what is identified
  and not settled: a question with no answer, an alternative to arbitrate, a check to run.

A stub carries the question, never a plausible answer, and no invented normative content. It carries
no obligation tag either: a tag names an atomic verifiable obligation, and putting one on an empty
title turns the traceability audit green over nothing.

A stub that requires work also gets a plan node. The stub says what is not known; the todo says who
will find out.

An item that concerns nothing in this project is returned as it stands, unstructured.

## The briefing is the one source that gets archived

A briefing is a bootstrap and a catch-all: free-form input carrying whatever the pilot had in mind,
in any order, in ordinary language. Structuring it belongs to this step, not to whoever wrote it.

Every other source outlives the cycle and is read again. The briefing does not: `@purpose` renames it
`<name>.briefing.archived.md`, in place, once its every item has passed the sieve.

## Present

Present the sources read, the destination given to each item, dependency status — ready, absent,
blocked, or outside the assigned scope — contradictions, and shared-file risks. Return unresolved
contract decisions to Design Dialogue.

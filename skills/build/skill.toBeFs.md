# @toBeFs — project the filesystem change

Project the accepted architecture onto exact repository paths before writing tests or
runtime code. Classify each relevant path as `create`, `edit`, `delete`, or `unchanged`.

For every created or edited path, state its responsibility, direct imports or
consumers, and estimated line budget. Distinguish test and fixture writes allowed in
RED, runtime writes reserved for GREEN, and demo or contract writes reserved for
`demoDocs`. Identify shared paths and out-of-scope paths explicitly. This step does
not modify the projected files.

## Presentation

Render the projection as a classic filesystem tree using ASCII characters only: `|`, `-`, `` ` ``,
and spaces. Do not use Unicode tree glyphs. Use repository-relative paths and add a short action
marker after each affected path.

```text
lib/
|-- existing.js                  [edit]
`-- feature/
    |-- feature.js               [create, GREEN]
    `-- feature.unit.test.js     [create, RED]
```

Prepend a `## Filesystem projection` section containing this tree to the applicable architecture
document. The accepted architecture remains authoritative; do not create a second filesystem
document.

Append the same ASCII tree to the `@toBeFs` response body. It is the final substantive output;
mandatory checkpoint, Design Dialogue, or work-package footer lines may follow it.

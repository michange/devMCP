# @matchConventions — check Enigma conventions

Read `docs/coding-conventions.md` completely and verify every JavaScript file
touched by `@implementation` before running focused GREEN tests.

## Checks

- Confirm that responsibilities, imports, exports, and names follow the surrounding Enigma code.
- Count every touched JavaScript file. Split any file that exceeds 200 lines by responsibility.
- Confirm that tests use `.unit.test.js` and browser tests use `.ui.test.js`.
- Confirm that tests use observable contracts rather than implementation details.
- Run `node --check` where it applies and run `git diff --check`.
- Examine security risks proportionally to the inputs and effects changed.

## Result

Fix mechanical violations inside the current scope. Return public, architectural, or
behavioral conflicts to Design Dialogue instead of deciding them here.

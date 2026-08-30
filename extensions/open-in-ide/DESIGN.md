# open-in-ide — put a file in front of the user

## Problem

An agent that has written a document and wants it read cannot rely on a path in a chat message. The
user has to notice it, copy it, and open it. When a workflow asks for a document to be reviewed before
the next step, that friction is the step that gets skipped.

## Solution

The extension exposes one tool, `open_in_ide`, which opens a file in PhpStorm, optionally at a given
line. It checks that the file exists and that the IDE binary exists, and reports which of the two is
missing rather than failing opaquely.

## Tool

`open_in_ide` requires `path`. The optional `line` is passed to the IDE as `--line <n>`, so the editor
opens with the cursor already there. The tool launches the IDE through `execFile` with a 10-second
timeout and resolves once the process reports back.

## Known failure

The IDE path is the constant `/Applications/PhpStorm.app/Contents/MacOS/phpstorm`, and calling that
binary directly has been observed to fail with `open failed: Command failed`, while
`open -a "PhpStorm" <path>` opens the same file without error. The binary appears not to return
promptly enough for the timeout when the IDE is already running.

Until this is fixed, `open -a` is the reliable way to open a file, and a caller that depends on the
document actually appearing should treat a failure here as expected rather than as a missing file.

## Limits

The IDE is not configurable. The tool opens PhpStorm or it opens nothing, and the path assumes macOS.

## Tests

None of its own.

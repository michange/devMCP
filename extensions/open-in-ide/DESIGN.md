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

`open_in_ide` requires `path`. The optional `line` asks the editor to place the cursor there. The tool
launches the IDE with `open -a PhpStorm`, with a 10-second timeout, and resolves once `open` reports
back. An `_exec` argument replaces the launcher, which is how the tests observe the command without
starting anything.

## Why not the application binary

The tool used to call `/Applications/PhpStorm.app/Contents/MacOS/phpstorm` directly. That binary
cannot hand a file to an instance that is already running. With the project open it exits 15 on
`project name=<name>, locationHash=<hash> is already opened`, and it has also been observed
returning a success the handler reported as `opened <path> in PhpStorm` while nothing appeared on
screen. Either way the file does not open, and one of the two ways says it did.

That second case is worse than an outright failure. Four steps of the build cycle present a document
for review by opening it, and a caller told the document was open had no way to learn it never was.

`open -a` has no such problem: macOS routes the file to the running instance, and reports a real
failure when it cannot.

## The line number is best effort

With a line number every argument goes to the application, so the file travels inside `--args` as
well. macOS hands those arguments over only when it starts the application. An already-running
PhpStorm receives the file and ignores the line.

The returned text says so rather than implying the cursor moved. A caller that needs the line
honoured has to know whether the IDE was already running, which the tool cannot determine.

## Limits

The IDE is not configurable. The tool opens PhpStorm or it opens nothing, and `open -a` is macOS.

## Tests

Five cases in `open-in-ide.test.js`, using the `_exec` injection point. They assert that the command
is `open`, that no argument mentions `Contents/MacOS`, that a line number moves the file inside
`--args`, that a launcher failure is reported instead of claimed as success, and that a missing file
launches nothing.

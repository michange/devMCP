# edit-file — replace one exact string, or refuse

## Problem

Changing three lines of a large file by rewriting the whole file wastes tokens and loses whatever the
writer did not know about. The agent needs a way to state a change as *this exact text becomes that
exact text*, and to be told when the target is not where it thought it was.

## Solution

The extension exposes one tool, `edit_file`, which finds `old_str` in a file and replaces it with
`new_str`. The replacement happens only when `old_str` appears **exactly once**. Zero occurrences and
two occurrences are both errors, and both leave the file untouched.

The uniqueness rule is what makes the tool safe to call without reading the result. An `old_str` that
matches twice is ambiguous, and guessing which occurrence was meant would silently corrupt the file.
The caller receives the count and adds surrounding context to disambiguate.

## Order of operations

The file is read, the occurrences are counted, and both failure cases return before anything else
happens. Only then does the tool take a safety commit and wait for the approval gate, in that order.
The write happens last. A rejected gate therefore leaves no trace, and a gate that is never answered
cannot leave a half-written file.

## Tool

`edit_file` requires `path` and `old_str`. Omitting `new_str`, or passing an empty string, deletes the
matched text. The success message reports the size change, for example `Replaced 40 chars → 12 chars
(-28)`.

## Tests

None of its own. Four cases in `gate.test.mjs` exercise the tool through the approval gate.

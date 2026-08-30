# force-model — pin the model, and be able to undo it exactly

## Problem

Claude Code chooses its model from `~/.claude/settings.json`. Pinning a model there is one line, and
that line is the problem: whoever writes it destroys whatever was there before. If the key held
another model, that value is gone. If the key was absent, the harness default is gone, and adding the
key back with a plausible value is not the same as removing it.

The user also changes the model by hand with `/model`, which edits the same file. A tool that pinned a
value and later restored its own idea of the previous state would silently undo that change.

## Solution

The extension exposes one tool, `force_model`, with four actions. It keeps a snapshot beside the
settings, at `~/.claude/.devmcp-model-backup.json`, holding two things: the **original** state before
the first pin, and the value it **forced** most recently.

Those two fields answer two different questions. The original says what to restore. The forced value
says whether the pin is still the one in effect, or whether something else has written the file since.

## The four actions

`status` reports the current model and the state of the pin. When the file no longer holds the forced
value, it says the pin was overridden outside the tool and names both values.

`force` pins a model. The original state is captured only on the first call, so pinning twice never
overwrites the pre-force truth with an intermediate value. The forced value is refreshed every time,
so drift detection stays accurate.

`restore` puts the original state back exactly: the previous model if there was one, or the deletion
of the key if there was none. It then removes the snapshot. When the model had drifted, it says so and
restores the original anyway.

`adopt` keeps the current model as the new baseline and discards the snapshot. It exists for the case
where the user changed the model by hand and wants that choice to stand rather than be reverted.

## Validation

A model id must match `claude-` followed by lowercase alphanumeric segments, optionally ending in a
context-window suffix such as `[1m]`. `claude-opus-4-6` and `claude-opus-4-6[1m]` both pass.

## Compatibility

Snapshots written by an earlier version hold `{hadModel, model}` with no `forced` field. Those are
read as an original with an unknown forced value, and `status` reports drift as unknown rather than
guessing.

## Client coupling

This extension writes `~/.claude/settings.json` and validates `claude-*` model ids. It is one of the
places that assume the client is Claude Code.

## Tests

Fifteen cases in `force-model.test.js`.

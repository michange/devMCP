// extensions/force-model/index.js — force / restore the Claude Code model in ~/.claude/settings.json
//
// force   : snapshot the ORIGINAL model state (once), then pin "model". Records the value it forced
//           so drift (an out-of-band /model edit) can be detected later.
// restore : re-apply the snapshot exactly (previous model, or delete the key if there was none),
//           then remove the snapshot. Idempotent — re-forcing never clobbers the true original.
// adopt   : accept the current model (e.g. after you changed it via /model) as the new baseline and
//           drop the stale snapshot — keeps your current choice, just cleans up.
// status  : report the current model AND whether the pin is still active or was overridden by /model.

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

// Accepts e.g. "claude-opus-4-6" and the 1M variant "claude-opus-4-6[1m]".
const MODEL_RE = /^claude-[a-z0-9]+(?:-[a-z0-9]+)*(?:\[[0-9]+m\])?$/i

function paths() {
  const home = process.env.HOME || ''
  const dir = join(home, '.claude')
  return {
    settings: join(dir, 'settings.json'),
    backup: join(dir, '.devmcp-model-backup.json'),
  }
}

function readJson(p) {
  if (!existsSync(p)) return {}
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch (e) {
    throw new Error(`cannot parse ${p}: ${e.message}`)
  }
}

function writeJson(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 2) + '\n')
}

function describe(settings) {
  return 'model' in settings ? `"${settings.model}"` : 'harness default (no "model" key)'
}

// Normalise both the current shape {original:{hadModel,model}, forced} and the legacy
// {hadModel, model} shape (older snapshots have no `forced`, so drift is "unknown").
function readBackup(backupPath) {
  const raw = readJson(backupPath)
  if (raw.original) return { original: raw.original, forced: raw.forced }
  return { original: { hadModel: !!raw.hadModel, model: raw.model ?? null }, forced: undefined }
}

function originalDesc(original) {
  return original.hadModel ? `"${original.model}"` : 'harness default (no "model" key)'
}

// Has the model been changed outside the tool (e.g. via /model) since we forced it?
// null = can't tell (legacy snapshot with no recorded `forced`).
function detectDrift(settings, forced) {
  if (forced === undefined) return null
  const current = 'model' in settings ? settings.model : null
  return current !== forced
}

function forceModel({ action = 'status', model }) {
  const { settings: settingsPath, backup: backupPath } = paths()

  let settings
  try {
    settings = readJson(settingsPath)
  } catch (e) {
    return { isError: true, text: e.message }
  }

  if (action === 'status') {
    if (!existsSync(backupPath)) {
      return {
        isError: false,
        text: [`current model : ${describe(settings)}`, 'pin           : none (not managed by force_model)'].join('\n'),
      }
    }
    const { original, forced } = readBackup(backupPath)
    const drift = detectDrift(settings, forced)
    let pinLine
    if (drift === null) pinLine = 'pin           : present (legacy snapshot — drift unknown)'
    else if (drift) pinLine = `pin           : ⚠️ OVERRIDDEN outside tool — forced "${forced}" but model is now ${describe(settings)}`
    else pinLine = `pin           : active (forced "${forced}")`
    const lines = [`current model : ${describe(settings)}`, pinLine, `restore -> ${originalDesc(original)}`]
    if (drift) lines.push(`adopt   -> keep ${describe(settings)} as baseline and clear the stale snapshot`)
    return { isError: false, text: lines.join('\n') }
  }

  if (action === 'force') {
    if (!model || !MODEL_RE.test(model)) {
      return { isError: true, text: `invalid model id: ${JSON.stringify(model)} — expected e.g. "claude-opus-4-6"` }
    }
    // Snapshot the ORIGINAL state only once, so restore always returns to pre-force truth.
    // `forced` is refreshed every time so drift detection stays accurate across re-forces.
    let snapshotNote
    let original
    if (existsSync(backupPath)) {
      original = readBackup(backupPath).original
      snapshotNote = `original kept (${originalDesc(original)})`
    } else {
      original = { hadModel: 'model' in settings, model: settings.model ?? null }
      snapshotNote = `snapshot saved (original: ${originalDesc(original)})`
    }
    const prev = describe(settings)
    settings.model = model
    writeJson(settingsPath, settings)
    writeJson(backupPath, { original, forced: model })
    return {
      isError: false,
      text: [
        `forced model  : "${model}"`,
        `previous      : ${prev}`,
        snapshotNote,
        'Restart Claude Code (new conversation) to pick it up.',
      ].join('\n'),
    }
  }

  if (action === 'restore') {
    if (!existsSync(backupPath)) {
      return { isError: false, text: `no snapshot found — nothing to restore. Current model: ${describe(settings)}` }
    }
    let original, forced
    try {
      ({ original, forced } = readBackup(backupPath))
    } catch (e) {
      return { isError: true, text: e.message }
    }
    const drift = detectDrift(settings, forced)
    const from = describe(settings)
    if (original.hadModel) settings.model = original.model
    else delete settings.model
    writeJson(settingsPath, settings)
    unlinkSync(backupPath)
    const lines = [`restored model: ${describe(settings)}`, `was           : ${from}`]
    if (drift) lines.push(`note          : model had been changed outside the tool (was "${forced}") — restored to original anyway`)
    lines.push('snapshot cleared. Restart Claude Code (new conversation) to pick it up.')
    return { isError: false, text: lines.join('\n') }
  }

  if (action === 'adopt') {
    if (!existsSync(backupPath)) {
      return { isError: false, text: `no snapshot to adopt — current model ${describe(settings)} is already the baseline.` }
    }
    unlinkSync(backupPath)
    return {
      isError: false,
      text: [
        `adopted       : ${describe(settings)} is now the baseline`,
        'snapshot cleared. force_model no longer tracks a prior state.',
      ].join('\n'),
    }
  }

  return { isError: true, text: `unknown action: ${JSON.stringify(action)} — use "status", "force", "restore", or "adopt"` }
}

export default [
  {
    name: 'force_model',
    description: 'Force / restore the Claude Code model in ~/.claude/settings.json. action="force" pins "model" (snapshotting the original once, recording the forced value); action="restore" reverts exactly to the pre-force state and clears the snapshot; action="adopt" keeps the current model (e.g. after a manual /model change) as the new baseline and drops the stale snapshot; action="status" reports the current model AND whether the pin is still active or was overridden outside the tool. Restart Claude Code / new conversation to apply.',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['status', 'force', 'restore', 'adopt'], description: 'status (default), force, restore, or adopt' },
        model: { type: 'string', description: 'Model id to force, required when action="force" (e.g. "claude-opus-4-6" or "claude-opus-4-6[1m]")' },
      },
    },
    handler: forceModel,
  },
]

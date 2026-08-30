// extensions/force-model/force-model.test.js — force/restore/adopt model in a sandboxed HOME
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import ext from './index.js'

const tool = ext[0]
const call = (args) => tool.handler(args)

let home, realHome, settingsPath, backupPath

function readSettings() { return JSON.parse(readFileSync(settingsPath, 'utf-8')) }
function seedSettings(obj) { writeFileSync(settingsPath, JSON.stringify(obj, null, 2)) }
// Simulate an out-of-band /model change (writes settings, bypasses the tool).
function userChangesModelViaSlashModel(value) {
  const s = readSettings(); s.model = value; seedSettings(s)
}

beforeEach(() => {
  realHome = process.env.HOME
  home = mkdtempSync(join(tmpdir(), 'devmcp-forcemodel-'))
  mkdirSync(join(home, '.claude'), { recursive: true })
  process.env.HOME = home
  settingsPath = join(home, '.claude', 'settings.json')
  backupPath = join(home, '.claude', '.devmcp-model-backup.json')
  seedSettings({ theme: 'dark' }) // existing settings, no model key
})

afterEach(() => {
  process.env.HOME = realHome
  rmSync(home, { recursive: true, force: true })
})

describe('force_model extension', () => {
  it('exports a tool named force_model', () => {
    expect(tool.name).toBe('force_model')
    expect(typeof tool.handler).toBe('function')
  })

  it('status reports no pin when nothing forced', () => {
    const r = call({ action: 'status' })
    expect(r.isError).toBe(false)
    expect(r.text).toContain('harness default')
    expect(r.text).toContain('pin           : none')
  })

  it('force pins the model and preserves other settings', () => {
    const r = call({ action: 'force', model: 'claude-opus-4-6' })
    expect(r.isError).toBe(false)
    const s = readSettings()
    expect(s.model).toBe('claude-opus-4-6')
    expect(s.theme).toBe('dark') // untouched
    expect(existsSync(backupPath)).toBe(true)
  })

  it('status shows an active pin after force', () => {
    call({ action: 'force', model: 'claude-opus-4-6' })
    const r = call({ action: 'status' })
    expect(r.text).toContain('active (forced "claude-opus-4-6")')
  })

  it('force snapshots the ORIGINAL (no model) so restore removes the key', () => {
    call({ action: 'force', model: 'claude-opus-4-6' })
    call({ action: 'force', model: 'claude-opus-4-8' }) // re-force keeps original, refreshes forced
    const r = call({ action: 'restore' })
    expect(r.isError).toBe(false)
    const s = readSettings()
    expect('model' in s).toBe(false) // back to harness default
    expect(s.theme).toBe('dark')
    expect(existsSync(backupPath)).toBe(false) // snapshot cleared
  })

  it('restore returns to a pre-existing model value', () => {
    seedSettings({ theme: 'dark', model: 'claude-opus-4-8' })
    call({ action: 'force', model: 'claude-opus-4-6' })
    expect(readSettings().model).toBe('claude-opus-4-6')
    const r = call({ action: 'restore' })
    expect(r.isError).toBe(false)
    expect(readSettings().model).toBe('claude-opus-4-8') // exact original restored
  })

  it('detects drift when model is changed via /model after forcing', () => {
    call({ action: 'force', model: 'claude-opus-4-6' })
    userChangesModelViaSlashModel('claude-sonnet-5') // out-of-band
    const r = call({ action: 'status' })
    expect(r.text).toContain('OVERRIDDEN outside tool')
    expect(r.text).toContain('forced "claude-opus-4-6"')
    expect(r.text).toContain('claude-sonnet-5')
    expect(r.text).toContain('adopt')
  })

  it('adopt keeps the current (manually changed) model and clears the snapshot', () => {
    call({ action: 'force', model: 'claude-opus-4-6' })
    userChangesModelViaSlashModel('claude-sonnet-5')
    const r = call({ action: 'adopt' })
    expect(r.isError).toBe(false)
    expect(readSettings().model).toBe('claude-sonnet-5') // choice kept
    expect(existsSync(backupPath)).toBe(false) // snapshot gone
    // status is now clean — no stale pin
    expect(call({ action: 'status' }).text).toContain('pin           : none')
  })

  it('restore after drift still returns to original and flags the drift', () => {
    call({ action: 'force', model: 'claude-opus-4-6' })
    userChangesModelViaSlashModel('claude-sonnet-5')
    const r = call({ action: 'restore' })
    expect(r.isError).toBe(false)
    expect('model' in readSettings()).toBe(false) // back to true original
    expect(r.text).toContain('changed outside the tool')
  })

  it('adopt with no snapshot is a no-op', () => {
    const r = call({ action: 'adopt' })
    expect(r.isError).toBe(false)
    expect(r.text).toContain('no snapshot to adopt')
  })

  it('reads a legacy {hadModel,model} snapshot and restores it', () => {
    seedSettings({ theme: 'dark', model: 'claude-opus-4-6' })
    writeFileSync(backupPath, JSON.stringify({ hadModel: false, model: null })) // legacy shape
    const s = call({ action: 'status' })
    expect(s.text).toContain('drift unknown')
    const r = call({ action: 'restore' })
    expect('model' in readSettings()).toBe(false)
    expect(r.isError).toBe(false)
  })

  it('rejects an invalid model id', () => {
    const r = call({ action: 'force', model: 'gpt-4; rm -rf /' })
    expect(r.isError).toBe(true)
    expect(r.text).toContain('invalid model id')
    expect('model' in readSettings()).toBe(false) // nothing written
  })

  it('accepts the 1m context variant', () => {
    const r = call({ action: 'force', model: 'claude-opus-4-6[1m]' })
    expect(r.isError).toBe(false)
    expect(readSettings().model).toBe('claude-opus-4-6[1m]')
  })

  it('restore with no snapshot is a no-op, not an error', () => {
    const r = call({ action: 'restore' })
    expect(r.isError).toBe(false)
    expect(r.text).toContain('nothing to restore')
  })

  it('unknown action errors clearly', () => {
    const r = call({ action: 'nuke' })
    expect(r.isError).toBe(true)
    expect(r.text).toContain('unknown action')
  })
})

import { describe, it, expect } from 'vitest'
import tools from './index.js'

const [openInIde] = tools

// Captures what would have been executed instead of launching anything.
function spyExec(err = null) {
  const calls = []
  const exec = (cmd, args, opts, cb) => { calls.push({ cmd, args, opts }); cb(err) }
  return { calls, exec }
}

const THIS_FILE = new URL(import.meta.url).pathname
const NO_LAUNCHER = '/nope/no-launcher-here'

describe('open_in_ide', () => {
  it('launches through `open -a`, never the application binary', async () => {
    const { calls, exec } = spyExec()
    await openInIde.handler({ path: THIS_FILE, _exec: exec, _launcher: NO_LAUNCHER })
    expect(calls).toHaveLength(1)
    expect(calls[0].cmd).toBe('open')
    expect(calls[0].args).toEqual(['-a', 'PhpStorm', THIS_FILE])
    expect(calls[0].args.join(' ')).not.toContain('Contents/MacOS')
  })

  it('passes the file inside --args when a line is given', async () => {
    const { calls, exec } = spyExec()
    await openInIde.handler({ path: THIS_FILE, line: 42, _exec: exec, _launcher: NO_LAUNCHER })
    expect(calls[0].args).toEqual(['-a', 'PhpStorm', '--args', '--line', '42', THIS_FILE])
  })

  it('says the line is only honoured when the call starts the IDE', async () => {
    const { exec } = spyExec()
    const res = await openInIde.handler({ path: THIS_FILE, line: 42, _exec: exec, _launcher: NO_LAUNCHER })
    expect(res.isError).toBe(false)
    expect(res.text).toContain('line 42')
    expect(res.text).toContain('only if this call started the IDE')
  })

  it('reports failure when the launcher fails, rather than claiming success', async () => {
    const { exec } = spyExec(new Error('boom'))
    const res = await openInIde.handler({ path: THIS_FILE, _exec: exec, _launcher: NO_LAUNCHER })
    expect(res.isError).toBe(true)
    expect(res.text).toContain('open failed: boom')
  })

  it('refuses a path that does not exist without launching anything', async () => {
    const { calls, exec } = spyExec()
    const res = await openInIde.handler({ path: '/nope/does-not-exist.md', _exec: exec, _launcher: NO_LAUNCHER })
    expect(res.isError).toBe(true)
    expect(res.text).toContain('file not found')
    expect(calls).toHaveLength(0)
  })
  it('prefers the command-line launcher when one is installed', async () => {
    const { calls, exec } = spyExec()
    await openInIde.handler({ path: THIS_FILE, _exec: exec, _launcher: THIS_FILE })
    expect(calls[0].cmd).toBe(THIS_FILE)
    expect(calls[0].args).toEqual([THIS_FILE])
  })

  it('gives the launcher the line directly, without --args', async () => {
    const { calls, exec } = spyExec()
    const res = await openInIde.handler({ path: THIS_FILE, line: 7, _exec: exec, _launcher: THIS_FILE })
    expect(calls[0].args).toEqual(['--line', '7', THIS_FILE])
    expect(res.text).toContain('via the command-line launcher')
    expect(res.text).not.toContain('active window')
  })

  it('warns that open -a may target another project when no launcher exists', async () => {
    const { exec } = spyExec()
    const res = await openInIde.handler({ path: THIS_FILE, _exec: exec, _launcher: NO_LAUNCHER })
    expect(res.text).toContain('via open -a')
    expect(res.text).toContain('may hold another project')
  })
})

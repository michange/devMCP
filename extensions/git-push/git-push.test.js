// extensions/git-push/git-push.test.js — gated push extension
import { describe, it, expect } from 'vitest'
import gitPushExt from './index.js'

const tool = gitPushExt[0]

// Mock injectors: _gate (approval) and _exec (the actual git push).
function fakeExec(calls) {
  return (cmd, args, opts) => { calls.push({ cmd, args, opts }); return 'Everything up-to-date' }
}

describe('git_push extension', () => {
  it('exports a tool named git_push', () => {
    expect(tool.name).toBe('git_push')
    expect(typeof tool.handler).toBe('function')
  })

  it('calls the gate BEFORE pushing', async () => {
    const order = []
    const calls = []
    await tool.handler({
      cwd: '/Users/mic/PhpstormProjects/voteCards',
      branch: 'may-conformity-refactor',
      _gate: async () => { order.push('gate') },
      _exec: (cmd, args) => { order.push('push'); calls.push(args); return 'ok' },
    })
    expect(order).toEqual(['gate', 'push'])
  })

  it('pushes the given remote + branch with -u when setUpstream', async () => {
    const calls = []
    const res = await tool.handler({
      cwd: '/Users/mic/PhpstormProjects/voteCards',
      remote: 'origin',
      branch: 'may-conformity-refactor',
      setUpstream: true,
      _gate: async () => {},
      _exec: fakeExec(calls),
    })
    expect(res.isError).toBe(false)
    expect(calls[0].args).toEqual(['push', '-u', 'origin', 'may-conformity-refactor'])
  })

  it('defaults remote to origin and omits -u without setUpstream', async () => {
    const calls = []
    await tool.handler({
      cwd: '/Users/mic/PhpstormProjects/voteCards',
      branch: 'main',
      _gate: async () => {},
      _exec: fakeExec(calls),
    })
    expect(calls[0].args).toEqual(['push', 'origin', 'main'])
  })

  it('does NOT push if the gate rejects', async () => {
    const calls = []
    const res = await tool.handler({
      cwd: '/Users/mic/PhpstormProjects/voteCards',
      branch: 'main',
      _gate: async () => { throw new Error('User rejected') },
      _exec: fakeExec(calls),
    })
    expect(res.isError).toBe(true)
    expect(res.text).toContain('User rejected')
    expect(calls.length).toBe(0)
  })

  it('rejects branch names with shell metacharacters', async () => {
    const calls = []
    const res = await tool.handler({
      cwd: '/Users/mic/PhpstormProjects/voteCards',
      branch: 'main; rm -rf /',
      _gate: async () => {},
      _exec: fakeExec(calls),
    })
    expect(res.isError).toBe(true)
    expect(calls.length).toBe(0)
  })

  it('requires cwd and branch', async () => {
    const res = await tool.handler({ _gate: async () => {}, _exec: () => {} })
    expect(res.isError).toBe(true)
  })
})

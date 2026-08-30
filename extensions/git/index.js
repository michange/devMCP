// extensions/git/index.js — git extension for devMCP
// Whitelisted git subcommands via execFileSync. Same security model as core.

import { execFileSync } from 'node:child_process'
import { validatePath } from '../../validators.js'

const GIT_ALLOWED = new Set([
  'status', 'log', 'diff', 'add', 'commit', 'push', 'pull',
  'branch', 'checkout', 'stash', 'tag', 'remote', 'fetch', 'show', 'rev-parse',
])

// Git-specific arg validation: allows newlines (for commit messages) but blocks
// shell metacharacters. Safe because execFileSync passes args directly, no shell.
function validateGitArgs(args) {
  if (!args) return []
  if (!Array.isArray(args)) throw new Error('args must be an array')
  return args.map((a, i) => {
    if (typeof a !== 'string') throw new Error(`args[${i}] must be a string`)
    if (/[;&|`$(){}!#]/.test(a)) throw new Error(`args[${i}] contains forbidden characters: ${a}`)
    return a
  })
}

function git({ cwd: rawCwd, args: rawArgs }) {
  const cwd = validatePath(rawCwd)
  const args = validateGitArgs(rawArgs)
  if (!args.length) return { isError: true, text: 'args required — e.g. ["status"] or ["commit", "-m", "msg"]' }
  const sub = args[0]
  if (!GIT_ALLOWED.has(sub)) return { isError: true, text: `git subcommand not allowed: ${sub}. Allowed: ${[...GIT_ALLOWED].join(', ')}` }
  try {
    const output = execFileSync('git', args, {
      cwd, encoding: 'utf-8', timeout: 30_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    })
    return { isError: false, text: output || '(no output)' }
  } catch (e) {
    return { isError: true, text: (e.stdout || '') + '\n' + (e.stderr || '') + `\nexit code: ${e.status}` }
  }
}

export default [{
  name: 'git',
  description: 'Run git commands. Whitelisted: status, log, diff, add, commit, push, pull, branch, checkout, stash, tag, remote, fetch, show, rev-parse.',
  inputSchema: {
    type: 'object', required: ['cwd', 'args'],
    properties: {
      cwd: { type: 'string', description: 'Absolute path to the git repo' },
      args: { type: 'array', items: { type: 'string' }, description: 'Git arguments as array — e.g. ["commit", "-m", "my message"]' },
    },
  },
  handler: git,
}]

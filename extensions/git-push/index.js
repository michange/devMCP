// extensions/git-push/index.js — gated `git push` for devMCP.
// Push is a publishing action with side effects, so it ALWAYS goes through the
// approval gate (terminal/web `yes`) before executing. The human approves; the
// tool just saves the trip to a terminal. Args are restricted to remote+branch
// (no arbitrary git args — no --force/--mirror sneaking through a wide allowlist).
import { execFileSync } from 'node:child_process'
import { validatePath } from '../../validators.js'
import { gate } from '../gate/index.js'

// Reject shell metacharacters in remote/branch. execFileSync passes args
// directly (no shell) but we defend in depth and reject obviously bad refs.
function cleanRef(name, label) {
  if (typeof name !== 'string' || !name) throw new Error(`${label} required`)
  if (/[;&|`$(){}!#\s]/.test(name)) throw new Error(`${label} contains forbidden characters: ${name}`)
  return name
}

async function gitPush({ cwd: rawCwd, remote = 'origin', branch, setUpstream, _gate, _exec }) {
  let cwd, r, b
  try {
    cwd = validatePath(rawCwd)
    r = cleanRef(remote, 'remote')
    b = cleanRef(branch, 'branch')
  } catch (e) {
    return { isError: true, text: e.message }
  }

  const args = ['push']
  if (setUpstream) args.push('-u')
  args.push(r, b)

  // Gate FIRST — nothing is pushed until the human approves.
  const doGate = _gate || gate
  try {
    await doGate(`git push ${setUpstream ? '-u ' : ''}${r} ${b}\nrepo: ${cwd}`)
  } catch (e) {
    return { isError: true, text: e.message }  // "User rejected" or "Gate timed out"
  }

  const doExec = _exec || ((cmd, a, opts) => execFileSync(cmd, a, opts))
  try {
    const out = doExec('git', args, {
      cwd, encoding: 'utf-8', timeout: 120_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    })
    return { isError: false, text: out || '(pushed — no output)' }
  } catch (e) {
    return { isError: true, text: (e.stdout || '') + '\n' + (e.stderr || '') + `\nexit code: ${e.status}` }
  }
}

export default [{
  name: 'git_push',
  description: 'Push a branch to a remote, gated by user approval (terminal/web yes). Restricted to remote + branch — no arbitrary git args, no --force. Default remote: origin. Use setUpstream:true for the first push of a new branch (-u).',
  inputSchema: {
    type: 'object',
    required: ['cwd', 'branch'],
    properties: {
      cwd:        { type: 'string', description: 'Absolute path to the git repo' },
      remote:     { type: 'string', description: 'Remote name (default: origin)' },
      branch:     { type: 'string', description: 'Branch to push' },
      setUpstream:{ type: 'boolean', description: 'Add -u to set upstream (first push of a new branch)' },
    },
  },
  handler: gitPush,
}]

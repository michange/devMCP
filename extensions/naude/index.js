import { spawn, execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const NAUDE_ENTRY = '/Users/mic/PhpstormProjects/naude-new/naude/core/naude.js'
const NAUDE_ROOT  = '/Users/mic/PhpstormProjects/naude-new'
const NAUDE_URL   = 'http://localhost:1967/'
const PID_FILE    = join(NAUDE_ROOT, 'logs/naude.pid')

let naudeProcess = null
let _lastConfigPath = null

function isRunning() {
  if (!naudeProcess) return false
  try {
    process.kill(naudeProcess.pid, 0)
    return true
  } catch {
    naudeProcess = null
    return false
  }
}

function killPort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf-8' }).trim()
    if (!pids) return { killed: 0, pids: [] }
    const pidList = pids.split('\n').map(p => parseInt(p.trim())).filter(Boolean)
    for (const pid of pidList) {
      try { process.kill(pid, 'SIGTERM') } catch {}
    }
    return { killed: pidList.length, pids: pidList }
  } catch {
    return { killed: 0, pids: [] }
  }
}

export default [
  {
    name: 'naude_start',
    description: 'Start the naude server. Pass configPath for a specific instance, otherwise defaults to :1967. No-op if already running.',
    inputSchema: {
      type: 'object',
      properties: {
        configPath: { type: 'string', description: 'Absolute path to instance config.json. Omit for default (:1967).' }
      }
    },
    handler: ({ configPath } = {}) => {
      if (!existsSync(NAUDE_ENTRY)) {
        return { isError: true, text: `naude entry not found: ${NAUDE_ENTRY}` }
      }
      if (isRunning()) {
        execSync(`open ${NAUDE_URL}`)
        return { isError: false, text: `naude already running (pid ${naudeProcess.pid}) — browser opened.` }
      }
      const args = configPath ? [NAUDE_ENTRY, configPath] : [NAUDE_ENTRY]
      _lastConfigPath = configPath ?? null
      naudeProcess = spawn('node', args, {
        detached: false,
        stdio: 'ignore'
      })
      naudeProcess.on('exit', () => { naudeProcess = null })
      let url = NAUDE_URL
      if (configPath && existsSync(configPath)) {
        try {
          const cfg = JSON.parse(readFileSync(configPath, 'utf-8'))
          if (cfg.port) url = `http://localhost:${cfg.port}/`
        } catch {}
      }
      setTimeout(() => {
        try { execSync(`open ${url}`) } catch {}
      }, 800)
      return { isError: false, text: `naude started (pid ${naudeProcess.pid}) — browser will open at ${url}` }
    }
  },
  {
    name: 'naude_stop',
    description: 'Stop the naude server. Reads logs/naude.pid if the process was restarted outside of naude_start (e.g. via WS restart).',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      // Try the in-memory handle first
      if (isRunning()) {
        const pid = naudeProcess.pid
        try {
          naudeProcess.kill('SIGTERM')
          naudeProcess = null
          return { isError: false, text: `naude stopped (pid ${pid}).` }
        } catch (e) {
          return { isError: true, text: `Kill failed: ${e.message}` }
        }
      }
      // Fallback: read PID file (written by boot.js)
      if (existsSync(PID_FILE)) {
        try {
          const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim())
          if (pid) {
            try { process.kill(pid, 0) } catch {
              return { isError: false, text: `naude is not running (stale PID ${pid}).` }
            }
            process.kill(pid, 'SIGTERM')
            return { isError: false, text: `naude stopped via PID file (pid ${pid}).` }
          }
        } catch {}
      }
      // Last resort: kill whatever is on :1967
      const result = killPort(1967)
      if (result.killed > 0) {
        return { isError: false, text: `killed ${result.killed} process(es) on :1967: ${result.pids.join(', ')}` }
      }
      return { isError: false, text: 'naude is not running.' }
    }
  },
  {
    name: 'naude_restart',
    description: 'Stop the running naude instance and restart it with the same config. Preserves instance identity (port, instanceDir). Polls /health to confirm ready.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const configPath = _lastConfigPath
      const port = configPath && existsSync(configPath)
        ? (JSON.parse(readFileSync(configPath, 'utf-8')).port ?? 1967)
        : 1967

      // Kill current
      if (isRunning()) {
        naudeProcess.kill('SIGTERM')
        naudeProcess = null
      } else if (existsSync(PID_FILE)) {
        try {
          const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim())
          if (pid) { try { process.kill(pid, 'SIGTERM') } catch {} }
        } catch {}
      } else {
        killPort(port)
      }

      // Respawn with same config
      const args = configPath ? [NAUDE_ENTRY, configPath] : [NAUDE_ENTRY]
      naudeProcess = spawn('node', args, {
        detached: false,
        stdio: 'ignore'
      })
      naudeProcess.on('exit', () => { naudeProcess = null })

      // Poll /health until ready
      const url = `http://localhost:${port}/health`
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 250))
        try {
          const res = await fetch(url)
          if (res.ok) {
            return { isError: false, text: `naude restarted — :${port} healthy (pid ${naudeProcess?.pid})` }
          }
        } catch {}
      }
      return { isError: true, text: `naude spawned on :${port} but /health not responding after 5s` }
    }
  },
  {
    name: 'kill_port',
    description: 'Kill all processes listening on a given port. Use to clear orphan naude instances or free a port.',
    inputSchema: {
      type: 'object', required: ['port'],
      properties: {
        port: { type: 'integer', description: 'Port number to kill processes on' }
      }
    },
    handler: ({ port }) => {
      if (!port || port < 1 || port > 65535) {
        return { isError: true, text: `Invalid port: ${port}` }
      }
      const result = killPort(port)
      if (result.killed === 0) {
        return { isError: false, text: `No process on port ${port}.` }
      }
      return { isError: false, text: `Killed ${result.killed} process(es) on :${port}: ${result.pids.join(', ')}` }
    }
  }
]

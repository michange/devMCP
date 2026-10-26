// extensions/votecards-syntax/index.js — dependency trees for VoteCards card texts
//
// The parser is Python, because no JavaScript library produces dependency trees; spaCy's
// en_core_web_trf is the only model that reads these titles correctly — the small one makes
// `Handball` the root of "Handball & Basketball Synergy" and takes `Bridging` for a noun.
//
// Loading that model costs two seconds and parsing a card sixty milliseconds, so the worker is
// kept alive between calls: a process spawned per call would spend half an hour loading over a
// thousand cards. It is spawned on first use, reused after, and respawned if it dies.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PYTHON = join(HERE, '.venv', 'bin', 'python')
const SCRIPT = join(HERE, 'parse.py')
const CALL_TIMEOUT = 60_000

let worker = null
let queue = Promise.resolve()

function startWorker(_spawn) {
  const proc = (_spawn || spawn)(PYTHON, [SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] })
  const w = { proc, lines: [], waiting: null, stderr: '' }
  let buffer = ''

  proc.stdout.on('data', (chunk) => {
    buffer += chunk
    let nl
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      if (w.waiting) { const resolve = w.waiting; w.waiting = null; resolve(line) }
      else w.lines.push(line)
    }
  })
  // Kept for the error message: torch prints warnings here, so it is not a failure by itself.
  proc.stderr.on('data', (chunk) => { w.stderr = (w.stderr + chunk).slice(-2000) })
  proc.on('exit', () => { if (worker === w) worker = null })
  return w
}

function readLine(w) {
  if (w.lines.length) return Promise.resolve(w.lines.shift())
  return new Promise((resolve, reject) => {
    // The timer is cleared on the answer: left pending, it would hold the event loop open for a
    // minute after every call.
    const timer = setTimeout(() => {
      if (w.waiting === onLine) { w.waiting = null; reject(new Error('parser timed out')) }
    }, CALL_TIMEOUT)
    const onLine = (line) => { clearTimeout(timer); resolve(line) }
    w.waiting = onLine
  })
}

async function ask(request, _spawn) {
  if (!worker || worker.proc.exitCode !== null) {
    worker = startWorker(_spawn)
    await readLine(worker) // the worker's ready line
  }
  worker.proc.stdin.write(JSON.stringify(request) + '\n')
  return JSON.parse(await readLine(worker))
}

async function parseSyntax({ title, desc = '', _spawn }) {
  if (!title || !String(title).trim()) {
    return { isError: true, text: 'title is empty: there is nothing to parse' }
  }
  if (!_spawn && !existsSync(PYTHON)) {
    return { isError: true, text: `parser venv missing at ${PYTHON} — create it with: python3 -m venv .venv && .venv/bin/pip install spacy && .venv/bin/python -m spacy download en_core_web_trf` }
  }
  try {
    const answer = await ask({ title: String(title), desc: String(desc) }, _spawn)
    if (answer.error) return { isError: true, text: `parser: ${answer.error}` }
    return { isError: false, text: JSON.stringify(answer, null, 1) }
  } catch (e) {
    const tail = worker?.stderr ? ` — parser said: ${worker.stderr.trim().split('\n').pop()}` : ''
    if (worker) { worker.proc.kill(); worker = null }
    return { isError: true, text: `parse failed: ${e.message}${tail}` }
  }
}

export default [
  {
    name: 'parse_syntax',
    description: 'Dependency tree of a VoteCards card title and description, English only. Returns one node per word, nested under the word that governs it: `i` is the word\'s rank in its own text, `pos` its part of speech, `deprel` its Universal Dependencies relation to its head, and `children` the words it governs in reading order. A coordination hangs off its first conjunct. Nothing is stored; each call parses afresh.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'The card title' },
        desc: { type: 'string', description: 'The card description (optional)' },
      },
    },
    // One call at a time: the worker answers one line per request, in order.
    handler: (args) => (queue = queue.then(() => parseSyntax(args), () => parseSyntax(args))),
  },
]

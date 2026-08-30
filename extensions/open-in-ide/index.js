// extensions/open-in-ide/index.js — open a file in the IDE (PhpStorm)
//
// The IDE is launched through `open -a`, not through the application binary. Calling
// /Applications/PhpStorm.app/Contents/MacOS/phpstorm directly exits 0 without opening anything,
// which made this tool report a success it never obtained — worse than failing, because a caller
// that presents a document for review had no way to know the document never appeared.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { validatePath } from '../../validators.js'

const IDE_APP = 'PhpStorm'
const IDE_PATH = '/Applications/PhpStorm.app'
// JetBrains' command-line launcher, created from the IDE by Tools > Create Command-line Launcher.
// It talks to the running instance and routes a file to the window holding its project, which is
// what `open -a` cannot do: macOS hands the file to the application, which opens it in whatever
// window is active. The launcher also honours --line on a running instance.
const LAUNCHER = '/usr/local/bin/phpstorm'

function openInIde({ path: rawPath, line, _exec, _launcher }) {
  const path = validatePath(rawPath)

  if (!existsSync(path)) {
    return { isError: true, text: `file not found: ${path}` }
  }

  if (!existsSync(IDE_PATH)) {
    return { isError: true, text: `IDE not found: ${IDE_PATH}` }
  }

  // The launcher is preferred when installed. Without it, every argument goes to the application
  // through --args, so the file travels there too, and macOS hands those arguments over only when
  // it starts the application: a running PhpStorm receives the file and ignores the line.
  const launcher = _launcher ?? LAUNCHER
  const useLauncher = existsSync(launcher)
  const cmd = useLauncher ? launcher : 'open'
  const args = useLauncher
    ? (line ? ['--line', String(line), path] : [path])
    : (line ? ['-a', IDE_APP, '--args', '--line', String(line), path] : ['-a', IDE_APP, path])

  const run = _exec || execFile

  return new Promise((resolve) => {
    run(cmd, args, { timeout: 10_000 }, (err) => {
      if (err) {
        resolve({ isError: true, text: `open failed: ${err.message}` })
        return
      }
      const via = useLauncher ? 'the command-line launcher' : 'open -a'
      const note = line && !useLauncher
        ? ' — the line is honoured only if this call started the IDE, and the file opens in the active window'
        : (useLauncher ? '' : ' — opens in the active PhpStorm window, which may hold another project')
      resolve({
        isError: false,
        text: `opened ${path} in ${IDE_APP}${line ? ` at line ${line}` : ''} via ${via}${note}`,
      })
    })
  })
}

export default [
  {
    name: 'open_in_ide',
    description: 'Open a file in PhpStorm at an optional line number. The line is honoured only when the call starts the IDE; an already-running instance opens the file and ignores it.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
        line: { type: 'integer', description: 'Line number to jump to (optional)' },
      },
    },
    handler: openInIde,
  },
]

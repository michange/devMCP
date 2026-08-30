import { execSync } from 'child_process'

// Seules les commandes de cette liste peuvent s'exécuter.
// L'ancrage ^ + \b garantit que la commande doit COMMENCER par ce mot.
const ALLOWED = /^(ls|find|cat|grep|rg|head|tail|wc|stat|file|echo|pwd|which|env|printenv|du|df|tree|sort|uniq|cut|awk|sed|jq|diff|type)\b/

// Commandes dangereuses — toutes ancrées avec \b pour éviter les faux
// positifs sur les paths. Sans \b, "exec" bloquait "/usr/local/exec-tool",
// "write" bloquait "/path/to/writefile", "ln" bloquait "/Users/alan/".
// Avec \b, seul le mot isolé est bloqué.
const FORBIDDEN_COMMANDS = /\brm\b|\brmdir\b|\bmv\b|\bcp\b|\btouch\b|\bmkdir\b|\bchmod\b|\bchown\b|\bchgrp\b|\btee\b|\bdd\b|\btruncate\b|\bshred\b|\bunlink\b|\bln\b|\bmount\b|\bumount\b|\bkill\b|\bpkill\b|\bkillall\b|\bcurl\b|\bwget\b|\bssh\b|\bscp\b|\brsync\b|\bnpm\s+install\b|\bnpm\s+run\b|\bnode\b|\bpython\b|\bruby\b|\bperl\b|\bbash\b|\bsh\b|\beval\b|\bexec\b|\bsource\b|\bwrite\b/

// Métacaractères shell — interprétés par /bin/sh -c même si la commande
// de base est safe. $() et `` permettent la command substitution,
// > et >> redirigent vers des fichiers (écriture), | combiné à > idem.
// (?<!\|)>(?!=) bloque les redirections simples mais laisse passer >= dans awk/jq.
// \|[^|]*> bloque pipe-vers-redirect (ls | tee > file) mais pas pipe seul.
const FORBIDDEN_METACHAR = /\$\(|`|>>|(?<!\|)>(?!=)|\|[^|]*>/

export default [{
  name: 'bash',
  description: 'Read-only bash — ls, find, cat, grep, rg, head, tail, wc, stat, tree, sort, uniq, cut, awk, sed, jq, diff. No writes, no installs, no shells.',
  inputSchema: {
    type: 'object',
    required: ['command'],
    properties: {
      command: { type: 'string', description: 'The bash command to run' },
      cwd: { type: 'string', description: 'Working directory (optional)' }
    }
  },
  handler: ({ command, cwd }) => {
    if (!ALLOWED.test(command.trimStart())) {
      return { isError: true, text: `Blocked — command not in allowlist. Allowed: ls find cat grep head tail wc stat file echo pwd which env printenv du df tree sort uniq cut awk sed jq diff type` }
    }
    if (FORBIDDEN_COMMANDS.test(command)) {
      return { isError: true, text: `Blocked — forbidden command detected.` }
    }
    if (FORBIDDEN_METACHAR.test(command)) {
      return { isError: true, text: `Blocked — forbidden pattern detected (write, shell, network, or redirect).` }
    }
    try {
      const out = execSync(command, {
        encoding: 'utf8',
        timeout: 15000,
        cwd: cwd || undefined,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      return { isError: false, text: out || '(no output)' }
    } catch (e) {
      return { isError: true, text: (e.stdout || '') + '\n' + (e.stderr || '') }
    }
  }
}]

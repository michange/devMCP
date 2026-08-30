// extensions/gate/index.js — web-based approval gate + safety commit
//
// STATUS: ORPHAN CODE — disabled, kept for backward compatibility.
//
// devmcp.config.json ships gate.enabled:false, so gate() returns on its first line and
// safetyCommit() is never reached. write_file, edit_file and git_push are ungated today.
//
// This module never hosted its own server — it polls a host app for the /gate routes. That
// host was voteCards, now archived: the routes survive only in voteCards-archive/src/server.js
// (branch legacy/main). Kept rather than deleted so a future host — naude-new is the owner's
// intent — can serve the same three routes and flip enabled back on with no change here. As of
// 30 August 2026 naude-new implements none of them.
//
// Do not set enabled:true without a live server on gate.server: every gated call then hangs
// for the full 120 s timeout. See DESIGN.md.
//
import { readFileSync } from 'node:fs';
import { execFileSync, exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../devmcp.config.json');

function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return { gate: { enabled: false } };
  }
}

// ── Safety commit ───────────────────────────────────────────────────

function gitRoot(filePath) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: dirname(filePath), encoding: 'utf-8', timeout: 5000,
    }).trim();
  } catch { return null; }
}

function isDirty(root) {
  try {
    return execFileSync('git', ['status', '--porcelain'], {
      cwd: root, encoding: 'utf-8', timeout: 5000,
    }).trim().length > 0;
  } catch { return false; }
}

export function safetyCommit(filePath) {
  const root = gitRoot(filePath);
  if (!root) return null;
  if (!isDirty(root)) return null;
  try {
    execFileSync('git', ['add', '-A'], { cwd: root, timeout: 10_000 });
    execFileSync('git', ['commit', '-m', '[devmcp-safety] before write'], { cwd: root, timeout: 10_000 });
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root, encoding: 'utf-8', timeout: 5000,
    }).trim();
  } catch { return null; }
}

// ── Web gate ────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Opens a browser gate page and waits for user approval.
 *
 * @param {string} description — shown on the gate page
 * @param {object} [opts]
 * @param {function} [opts.opener] — called with (url). Default: exec('open url')
 * @param {function} [opts.onId]  — called with (id) after ID is generated (for testing)
 * @param {number}   [opts.timeout] — ms to wait (default 120000)
 * @param {number}   [opts.poll]    — ms between polls (default 500)
 */
export async function gate(description, opts = {}) {
  const config = loadConfig();
  if (!config.gate?.enabled) return;

  const server = config.gate.server;
  if (!server) throw new Error('gate.server not configured in devmcp.config.json');

  const id = `gate-${randomUUID().slice(0, 8)}`;
  const desc = encodeURIComponent(description);
  const url = `${server}/gate?id=${id}&desc=${desc}`;

  if (opts.onId) opts.onId(id);

  const opener = opts.opener || (u => exec(`open -na "Google Chrome" --args --app="${u}"`));
  opener(url);

  const timeout = opts.timeout || 120_000;
  const poll = opts.poll || 500;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${server}/gate/status?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          if (data.answer === 'yes') {
            exec(`osascript -e 'tell app "Claude" to activate'`);
            return;
          }
          throw new Error('User rejected');
        }
      }
    } catch (e) {
      if (e.message === 'User rejected') throw e;
    }
    await sleep(poll);
  }

  throw new Error('Gate timed out');
}

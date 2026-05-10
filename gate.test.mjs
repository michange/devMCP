import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'devmcp.config.json');
const GATE_PORT = 3939;
const ORIG_CONFIG = '{"gate":{"server":"http://localhost:3737","enabled":true}}';
const TEST_FILE = '/tmp/gate-test-file.txt';

// ── Tiny gate server ────────────────────────────────────────────────

let server;
const answers = new Map();

function startGateServer() {
  return new Promise(resolve => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${GATE_PORT}`);

      if (req.method === 'GET' && url.pathname === '/gate') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>gate</body></html>');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/gate/status') {
        const id = url.searchParams.get('id');
        const answer = answers.get(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (answer) { answers.delete(id); res.end(JSON.stringify({ answer })); }
        else res.end(JSON.stringify({ answer: null }));
        return;
      }
      res.writeHead(404); res.end();
    });
    server.listen(GATE_PORT, resolve);
  });
}

const noop = () => {};
const gateOpts = (answerValue, delay = 100) => ({
  opener: noop,
  poll: 50,
  timeout: 5000,
  onId: id => setTimeout(() => answers.set(id, answerValue), delay),
});

// ── gate() unit tests ───────────────────────────────────────────────

describe('gate()', () => {

  beforeAll(async () => { await startGateServer(); });
  afterAll(() => { server?.close(); writeFileSync(CONFIG_PATH, ORIG_CONFIG); });

  beforeEach(() => {
    answers.clear();
  });

  it('resolves silently when gate disabled', async () => {
    writeFileSync(CONFIG_PATH, JSON.stringify({ gate: { enabled: false } }));
    const { gate } = await import('./extensions/gate/index.js?disabled');
    await gate('anything');
  });

  it('resolves when user approves', async () => {
    writeFileSync(CONFIG_PATH, JSON.stringify({
      gate: { enabled: true, server: `http://localhost:${GATE_PORT}` }
    }));
    const { gate } = await import('./extensions/gate/index.js?approve');
    await gate('write_file: /tmp/foo.txt', gateOpts('yes'));
  });

  it('throws when user rejects', async () => {
    writeFileSync(CONFIG_PATH, JSON.stringify({
      gate: { enabled: true, server: `http://localhost:${GATE_PORT}` }
    }));
    const { gate } = await import('./extensions/gate/index.js?reject');
    await expect(gate('write_file: /tmp/foo.txt', gateOpts('no'))).rejects.toThrow('User rejected');
  });

  it('throws on timeout', async () => {
    writeFileSync(CONFIG_PATH, JSON.stringify({
      gate: { enabled: true, server: `http://localhost:${GATE_PORT}` }
    }));
    const { gate } = await import('./extensions/gate/index.js?timeout');
    await expect(gate('write_file: /tmp/foo.txt', {
      opener: noop, poll: 50, timeout: 300,
    })).rejects.toThrow('Gate timed out');
  });

  it('calls opener with correct URL', async () => {
    writeFileSync(CONFIG_PATH, JSON.stringify({
      gate: { enabled: true, server: `http://localhost:${GATE_PORT}` }
    }));
    const { gate } = await import('./extensions/gate/index.js?opener');
    let openedUrl = '';
    await gate('test op', {
      ...gateOpts('yes'),
      opener: url => { openedUrl = url; },
    });
    expect(openedUrl).toContain(`http://localhost:${GATE_PORT}/gate?id=gate-`);
    expect(openedUrl).toContain('desc=test%20op');
  });
});

// ── Integration: write_file + edit_file with gate ───────────────────

describe('write_file with gate', () => {

  beforeAll(async () => { await startGateServer().catch(() => {}); });
  afterAll(() => { server?.close(); try { unlinkSync(TEST_FILE); } catch {} writeFileSync(CONFIG_PATH, ORIG_CONFIG); });
  beforeEach(() => { answers.clear(); });

  it('writes file when gate approves', async () => {
    writeFileSync(CONFIG_PATH, JSON.stringify({
      gate: { enabled: true, server: `http://localhost:${GATE_PORT}` }
    }));
    const fsMod = await import('./extensions/fs/index.js?int-approve');
    const writeHandler = fsMod.default.find(t => t.name === 'write_file').handler;
    const result = await writeHandler({
      path: TEST_FILE, content: 'hello world',
      _gateOpts: gateOpts('yes'),
    });
    expect(result.isError).toBe(false);
    expect(readFileSync(TEST_FILE, 'utf-8')).toBe('hello world');
  });

  it('blocks write when gate rejects', async () => {
    writeFileSync(CONFIG_PATH, JSON.stringify({
      gate: { enabled: true, server: `http://localhost:${GATE_PORT}` }
    }));
    try { unlinkSync(TEST_FILE); } catch {}
    const fsMod = await import('./extensions/fs/index.js?int-reject');
    const writeHandler = fsMod.default.find(t => t.name === 'write_file').handler;
    const result = await writeHandler({
      path: TEST_FILE, content: 'should not write',
      _gateOpts: gateOpts('no'),
    });
    expect(result.isError).toBe(true);
    expect(result.text).toContain('rejected');
    expect(existsSync(TEST_FILE)).toBe(false);
  });
});

describe('edit_file with gate', () => {

  beforeAll(async () => { await startGateServer().catch(() => {}); });
  afterAll(() => { server?.close(); try { unlinkSync(TEST_FILE); } catch {} writeFileSync(CONFIG_PATH, ORIG_CONFIG); });
  beforeEach(() => { answers.clear(); });

  it('edits file when gate approves', async () => {
    writeFileSync(TEST_FILE, 'hello world');
    writeFileSync(CONFIG_PATH, JSON.stringify({
      gate: { enabled: true, server: `http://localhost:${GATE_PORT}` }
    }));
    const editMod = await import('./extensions/edit-file/index.js?int-approve');
    const editHandler = editMod.default.find(t => t.name === 'edit_file').handler;
    const result = await editHandler({
      path: TEST_FILE, old_str: 'world', new_str: 'gated',
      _gateOpts: gateOpts('yes'),
    });
    expect(result.isError).toBe(false);
    expect(readFileSync(TEST_FILE, 'utf-8')).toBe('hello gated');
  });

  it('blocks edit when gate rejects', async () => {
    writeFileSync(TEST_FILE, 'hello world');
    writeFileSync(CONFIG_PATH, JSON.stringify({
      gate: { enabled: true, server: `http://localhost:${GATE_PORT}` }
    }));
    const editMod = await import('./extensions/edit-file/index.js?int-reject');
    const editHandler = editMod.default.find(t => t.name === 'edit_file').handler;
    const result = await editHandler({
      path: TEST_FILE, old_str: 'world', new_str: 'blocked',
      _gateOpts: gateOpts('no'),
    });
    expect(result.isError).toBe(true);
    expect(result.text).toContain('rejected');
    expect(readFileSync(TEST_FILE, 'utf-8')).toBe('hello world');
  });
});

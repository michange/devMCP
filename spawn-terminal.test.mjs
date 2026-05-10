import { describe, it, expect, beforeAll } from 'vitest';
import { exec } from 'node:child_process';
import { readFileSync, unlinkSync, mkdirSync } from 'node:fs';
import http from 'node:http';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const PROJECT = '/Users/mic/PhpstormProjects/voteCards';
const PORT = 3737;

function waitForServer(timeout = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://localhost:${PORT}/api/batches`, res => {
        res.resume(); resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('Server timeout'));
        setTimeout(check, 300);
      });
      req.setTimeout(1000, () => { req.destroy(); setTimeout(check, 300); });
    };
    check();
  });
}

describe('web gate on localhost:3737', () => {

  beforeAll(async () => {
    try { await waitForServer(2000); } catch {
      // server not running, start it
      exec(`node --env-file=.env src/server.js`, { cwd: PROJECT });
      await waitForServer(8000);
    }
  });

  for (let i = 1; i <= 3; i++) {
    it(`web gate ${i}/3`, async () => {
      const id = `test-${Date.now()}-${i}`;
      const desc = `write_file: /tmp/demo-${i}.txt%0AContent: hello world (11 chars)`;
      exec(`open "http://localhost:${PORT}/gate?id=${id}&desc=${desc}"`);
      await sleep(15000);
      let answer = '';
      try {
        answer = readFileSync(`${PROJECT}/gate-markers/${id}.txt`, 'utf-8').trim();
        unlinkSync(`${PROJECT}/gate-markers/${id}.txt`);
      } catch {}
      console.log(`gate ${i}: ${answer}`);
      expect(answer).toBeTruthy();
    }, 25000);
  }
});

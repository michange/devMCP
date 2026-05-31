import { it, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BATCHES = '/Users/mic/PhpstormProjects/voteCards/batches';
const OUT = '/Users/mic/PhpstormProjects/voteCards/cards';

const ATOMS = {
  A: ['vocab_title', 'vocab_desc', 'correctness_title', 'correctness_desc', 'acronyms_title', 'acronyms_desc'],
  B: ['context', 'goal', 'method', 'concrete'],
  C: ['rank'],
};

it('find inconsistent cards per atom', () => {
  const perAtom = {};
  for (const atoms of Object.values(ATOMS)) {
    for (const atom of atoms) perAtom[atom] = new Map();
  }

  for (const batchId of readdirSync(BATCHES)) {
    const rdPath = join(BATCHES, batchId, 'report-data.json');
    let data;
    try { data = JSON.parse(readFileSync(rdPath, 'utf-8')); } catch { continue; }
    const cfgPath = join(BATCHES, batchId, 'config.json');
    let cfg;
    try { cfg = JSON.parse(readFileSync(cfgPath, 'utf-8')); } catch { continue; }
    if (cfg.runs_per_item < 3) continue;

    for (const card of data.cards) {
      for (const [crit, atoms] of Object.entries(ATOMS)) {
        if (!card.atoms?.[crit]) continue;
        for (const atom of atoms) {
          const a = card.atoms[crit][atom];
          if (!a) continue;
          const cv = a.cv ?? 0;
          if (cv === 0) continue;
          const map = perAtom[atom];
          const existing = map.get(card.id);
          if (!existing || cv > existing.cv) {
            map.set(card.id, {
              id: card.id, title: card.title, desc: card.desc || '',
              cv, stddev: a.stddev ?? 0, normalized: a.normalized ?? 0,
              batch: batchId, runs: cfg.runs_per_item,
            });
          }
        }
      }
    }
  }

  const summary = [];
  for (const [atom, map] of Object.entries(perAtom)) {
    const top10 = [...map.values()].sort((a, b) => b.cv - a.cv).slice(0, 10);
    const lines = top10.map(c => `  CV=${c.cv.toFixed(4)} norm=${c.normalized.toFixed(2)} runs=${c.runs} | ${c.title.slice(0, 60)}`);
    summary.push(`${atom}: ${map.size} cards with CV>0\n${lines.join('\n')}`);
    const voteCards = top10.map(c => ({ title: c.title, desc: c.desc }));
    writeFileSync(join(OUT, `inconsistent-${atom}.json`), JSON.stringify(voteCards, null, 2));
  }

  console.log(summary.join('\n\n'));
  expect(Object.keys(perAtom).length).toBe(11);
});

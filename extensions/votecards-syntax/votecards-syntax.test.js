import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import tools from './index.js'

const [parseSyntax] = tools
const HERE = dirname(fileURLToPath(import.meta.url))
const HAS_VENV = existsSync(join(HERE, '.venv', 'bin', 'python'))

// Collects every node of every tree, so a test can assert on words wherever they sit.
function flatten(trees) {
  const out = []
  const walk = (n) => { out.push(n); (n.children || []).forEach(walk) }
  ;(trees || []).forEach(walk)
  return out
}

function find(trees, word) {
  return flatten(trees).find((n) => n.word === word)
}

describe('parse_syntax — contract', () => {
  it('declares a title and an optional description', () => {
    expect(parseSyntax.name).toBe('parse_syntax')
    expect(parseSyntax.inputSchema.required).toEqual(['title'])
    expect(Object.keys(parseSyntax.inputSchema.properties)).toEqual(['title', 'desc'])
  })

  it('refuses an empty title instead of spawning a parser for nothing', async () => {
    const res = await parseSyntax.handler({ title: '   ' })
    expect(res.isError).toBe(true)
    expect(res.text).toContain('nothing to parse')
  })

  it('says how to create the venv when the interpreter is missing', async () => {
    // A spawn that fails immediately stands for a broken install.
    const res = await parseSyntax.handler({
      title: 'anything',
      _spawn: () => { throw new Error('ENOENT') },
    })
    expect(res.isError).toBe(true)
    expect(res.text).toMatch(/parse failed|venv missing/)
  })
})

describe.skipIf(!HAS_VENV)('parse_syntax — against the real parser', () => {
  it('returns one node per word, and the words put back together give the title', async () => {
    const title = 'Board Games for Climate Education'
    const res = await parseSyntax.handler({ title })
    expect(res.isError).toBe(false)
    const tree = JSON.parse(res.text)
    const nodes = flatten(tree.title).sort((a, b) => a.i - b.i)
    expect(nodes.map((n) => n.word).join(' ')).toBe(title)
    expect(new Set(nodes.map((n) => n.i)).size).toBe(nodes.length)
  })

  it('reads the head of a nominal title, where the small model fails', async () => {
    const res = await parseSyntax.handler({ title: 'Handball & Basketball Synergy: Bridging Techniques and Tactics' })
    const tree = JSON.parse(res.text)
    expect(tree.title[0].word).toBe('Synergy')
    expect(find(tree.title, 'Bridging').pos).toBe('VERB')
  })

  it('hangs a coordination off its first conjunct, as Universal Dependencies does', async () => {
    const res = await parseSyntax.handler({ title: 'Handball and Basketball Synergy' })
    const tree = JSON.parse(res.text)
    const second = find(tree.title, 'Basketball')
    expect(second.deprel).toBe('conj')
    expect(find(tree.title, 'Handball').children.some((c) => c.word === 'Basketball')).toBe(true)
  })

  it('gives null for a description that is not there', async () => {
    const res = await parseSyntax.handler({ title: 'Digital Libraries' })
    expect(JSON.parse(res.text).desc).toBe(null)
  })

  it('keeps the worker alive, so the second call does not reload the model', async () => {
    await parseSyntax.handler({ title: 'Green Games' })
    const t0 = Date.now()
    const res = await parseSyntax.handler({ title: 'Digital Libraries' })
    expect(res.isError).toBe(false)
    // Loading the model costs about two seconds; a reused worker answers far inside that.
    expect(Date.now() - t0).toBeLessThan(1500)
  })
})

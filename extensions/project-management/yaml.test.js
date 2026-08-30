import { describe, it, expect } from 'vitest'
import { parse } from './plan/yaml.js'

// The parser covers the subset a cycle declaration needs: nested keys, lists of mappings,
// booleans, strings. Anything else is refused with the line that carries it, because a construct
// silently dropped costs a step, and a cycle missing a step tracks the wrong work.

describe('yaml — the subset parser', () => {
  it('reads a scalar under a key', () => {
    expect(parse('name: cyBuild')).toEqual({ name: 'cyBuild' })
  })

  it('reads a list of mappings', () => {
    const doc = parse([
      'steps:',
      '  - name: preRead',
      '    skill: skill.preRead.md',
      '  - name: purpose',
      '    skill: skill.purpose.md',
    ].join('\n'))
    expect(doc.steps).toHaveLength(2)
    expect(doc.steps[0]).toEqual({ name: 'preRead', skill: 'skill.preRead.md' })
    expect(doc.steps[1]).toEqual({ name: 'purpose', skill: 'skill.purpose.md' })
  })

  it('reads booleans as booleans, not as strings', () => {
    const doc = parse('gated: true\nskippable: false')
    expect(doc.gated).toBe(true)
    expect(doc.skippable).toBe(false)
  })

  it('preserves the written order of a list', () => {
    const names = ['preRead', 'purpose', 'red', 'green', 'commit']
    const doc = parse(['steps:', ...names.map(n => `  - name: ${n}`)].join('\n'))
    expect(doc.steps.map(s => s.name)).toEqual(names)
  })

  it('refuses a tab indent, naming the line', () => {
    expect(() => parse('steps:\n\t- name: preRead')).toThrow(/line 2/)
  })

  it('refuses a construct outside the subset, naming the line', () => {
    expect(() => parse('name: cyBuild\nbase: &anchor value')).toThrow(/line 2/)
  })

  it('ignores comments and blank lines', () => {
    const withNoise = parse([
      '# the build cycle',
      'name: cyBuild',
      '',
      '  # a step follows',
      'steps:',
      '  - name: preRead',
    ].join('\n'))
    expect(withNoise).toEqual(parse('name: cyBuild\nsteps:\n  - name: preRead'))
  })
})

// extensions/project-management/plan/yaml.js — the YAML subset a cycle declaration needs.
//
// devMCP has no runtime dependency, and Node reads no YAML, so a cycle file is parsed here. The
// subset is nested keys, lists of mappings, booleans and strings — enough for a cycle and nothing
// more. Anything outside it throws with its line number rather than being skipped: a construct
// silently dropped costs a step, and a cycle missing a step tracks the wrong work.

const KEY = /^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$/
// Constructs YAML allows and this parser does not: anchors, aliases, merge keys, block scalars.
const OUTSIDE_SUBSET = /^[&*|>]|^<<:/

class YamlError extends Error {
  constructor(message, line) {
    super(`${message} (line ${line})`)
    this.line = line
  }
}

// Blank lines and comments carry nothing; dropping them here keeps every later step working on
// meaningful lines only, so an indentation comparison never lands on a comment.
function significantLines(text) {
  const lines = []
  text.split('\n').forEach((raw, index) => {
    const line = index + 1
    if (/^\s*(#.*)?$/.test(raw)) return
    const indent = raw.length - raw.trimStart().length
    if (raw.slice(0, indent).includes('\t')) throw new YamlError('tab indentation is not allowed', line)
    lines.push({ indent, content: raw.trim(), line })
  })
  return lines
}

function scalar(raw, line) {
  if (OUTSIDE_SUBSET.test(raw)) throw new YamlError(`unsupported construct: ${raw}`, line)
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === '[]') return []
  if (raw === '') return null
  const quoted = raw.match(/^"(.*)"$|^'(.*)'$/)
  return quoted ? (quoted[1] ?? quoted[2]) : raw
}

// Both readers advance the shared cursor, so the caller resumes exactly where the nested block
// ended without counting lines itself.
function readMapping(state, indent) {
  const mapping = {}
  while (state.at < state.lines.length && state.lines[state.at].indent === indent) {
    const { content, line } = state.lines[state.at]
    if (content.startsWith('- ')) break
    const matched = content.match(KEY)
    if (!matched) throw new YamlError(`expected "key: value", got: ${content}`, line)
    const [, key, rest] = matched
    state.at += 1
    mapping[key] = rest === '' ? readNested(state, indent, line) : scalar(rest, line)
  }
  return mapping
}

function readNested(state, indent, line) {
  const next = state.lines[state.at]
  if (!next || next.indent <= indent) return null
  return next.content.startsWith('- ')
    ? readList(state, next.indent)
    : readMapping(state, next.indent)
}

function readList(state, indent) {
  const items = []
  while (state.at < state.lines.length && state.lines[state.at].indent === indent) {
    const { content, line } = state.lines[state.at]
    if (!content.startsWith('- ')) break
    const first = content.slice(2).trim()
    const matched = first.match(KEY)
    if (!matched) {
      state.at += 1
      items.push(scalar(first, line))
      continue
    }
    // A list item's own keys sit deeper than the dash, and the first one shares the dash's line.
    const [, key, rest] = matched
    const itemIndent = indent + 2
    state.at += 1
    const item = { [key]: rest === '' ? readNested(state, itemIndent, line) : scalar(rest, line) }
    Object.assign(item, readMapping(state, itemIndent))
    items.push(item)
  }
  return items
}

export function parse(text) {
  const state = { lines: significantLines(text), at: 0 }
  if (state.lines.length === 0) return {}
  const document = state.lines[0].content.startsWith('- ')
    ? readList(state, state.lines[0].indent)
    : readMapping(state, state.lines[0].indent)
  if (state.at < state.lines.length) {
    const { content, line } = state.lines[state.at]
    throw new YamlError(`unexpected indentation at: ${content}`, line)
  }
  return document
}

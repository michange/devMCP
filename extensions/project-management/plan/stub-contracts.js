import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve, sep } from 'node:path'

const TITLE = /\.md$/

/**
 * The document paths a plan cites and the filesystem does not hold, deduplicated and in the order
 * the validator met them. Reading the reference from the error rather than from its JSONPath
 * matters: the path says where the error sits in the plan, not which file is missing.
 */
export function missingContracts(errors) {
  return [...new Set(errors
    .filter(error => error.code === 'CONTRACT_MISSING')
    .map(error => error.reference))]
}

// A stub says what the document is and that it holds nothing yet. Inventing a plausible obligation
// here would put normative prose in a contract nobody wrote.
const body = reference =>
  `# ${basename(reference).replace(TITLE, '')}\n\nCe contrat reste à écrire.\n`

/**
 * Create every missing document, and only those. A reference resolving outside `projectPath` is
 * skipped rather than created: a plan must not be able to write wherever the process can reach.
 * Nothing is ever written over an existing file, since only absent references reach this point.
 */
export async function stubContracts(projectPath, references) {
  const root = resolve(projectPath)
  const created = []
  for (const reference of references) {
    const target = resolve(root, reference)
    if (!target.startsWith(`${root}${sep}`)) continue
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, body(reference), { flag: 'wx' })
    created.push(reference)
  }
  return created
}

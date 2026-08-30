// The elementary shape checkers. Each one appends to the caller's error array and answers
// whether the value was usable, so a caller can stop before reading further into it.

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

export function checkObject(value, path, keys, errors, optional = []) {
  if (!isObject(value)) {
    errors.push({ path, message: 'must be an object' })
    return false
  }

  for (const key of keys) {
    if (!(key in value) && !optional.includes(key)) errors.push({ path: `${path}.${key}`, message: 'is required' })
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) errors.push({ path: `${path}.${key}`, message: 'is not allowed' })
  }
  return true
}

export function checkString(value, path, errors) {
  if (typeof value !== 'string' || value.length === 0) {
    errors.push({ path, message: 'must be a non-empty string' })
    return false
  }
  return true
}

export function checkStatus(value, path, allowed, errors) {
  if (!allowed.has(value)) errors.push({ path, message: `must be one of: ${[...allowed].join(', ')}` })
}

export function checkExact(value, expected, path, errors) {
  if (value !== expected) errors.push({ path, message: `must equal ${expected}` })
}

export function checkReferences(value, path, allowed, context, errors, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    errors.push({ path, message: allowEmpty ? 'must be an array' : 'must be a non-empty array' })
    return
  }
  value.forEach((reference, index) => {
    const referencePath = `${path}[${index}]`
    if (!checkString(reference, referencePath, errors)) return
    if (!reference.startsWith('./') || !reference.endsWith('.md')) {
      errors.push({ path: referencePath, message: 'must be a project-relative Markdown path beginning with ./' })
    }
    if (allowed && !allowed.has(reference)) errors.push({ path: referencePath, message: 'must be one of the work package contracts' })
    if (context.referenceExists && !context.referenceExists(reference)) {
      errors.push({
        path: referencePath, message: 'does not exist',
        code: 'CONTRACT_MISSING', reference
      })
    }
  })
}


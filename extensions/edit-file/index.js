// extensions/edit-file/index.js — surgical str_replace with safety commit
import { readFileSync, writeFileSync } from 'node:fs';
import { validatePath } from '../../validators.js';
import { safetyCommit, gate } from '../gate/index.js';

async function editFile({ path: rawPath, old_str, new_str, _gateOpts }) {
  if (typeof old_str !== 'string' || !old_str) {
    return { isError: true, text: 'old_str is required and must be non-empty' };
  }
  const path = validatePath(rawPath);
  let content;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (e) {
    return { isError: true, text: `read failed: ${e.message}` };
  }

  // Count occurrences
  let count = 0, idx = -1;
  while ((idx = content.indexOf(old_str, idx + 1)) !== -1) count++;

  if (count === 0) {
    return { isError: true, text: `old_str not found in ${path}` };
  }
  if (count > 1) {
    return { isError: true, text: `old_str appears ${count} times in ${path} — must be unique` };
  }

  try {
    safetyCommit(path);
    await gate(`edit_file: ${path}\n-old: "${old_str.slice(0, 80)}"\n+new: "${(new_str || '').slice(0, 80)}"`, _gateOpts);
  } catch (e) {
    return { isError: true, text: e.message };
  }

  const replacement = typeof new_str === 'string' ? new_str : '';
  const updated = content.replace(old_str, replacement);
  try {
    writeFileSync(path, updated);
  } catch (e) {
    return { isError: true, text: `write failed: ${e.message}` };
  }

  const delta = replacement.length - old_str.length;
  return { isError: false, text: `Replaced ${old_str.length} chars → ${replacement.length} chars (${delta >= 0 ? '+' : ''}${delta}) in ${path}` };
}

export default [{
  name: 'edit_file',
  description: 'Surgical string replacement in a file. old_str must appear exactly once. new_str="" deletes it. Like CLI Edit tool.',
  inputSchema: {
    type: 'object',
    required: ['path', 'old_str'],
    properties: {
      path:    { type: 'string', description: 'Absolute path to the file' },
      old_str: { type: 'string', description: 'Exact string to find (must appear once)' },
      new_str: { type: 'string', description: 'Replacement string (empty = delete)', default: '' },
    },
  },
  handler: editFile,
}];

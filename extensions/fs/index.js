// extensions/fs/index.js — filesystem extension for devMCP
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { validatePath } from '../../validators.js';
import { safetyCommit, gate } from '../gate/index.js';

function readFile({ path: rawPath }) {
    const path = validatePath(rawPath);
    try {
        const content = readFileSync(path, 'utf-8');
        return { isError: false, text: content };
    } catch (e) {
        return { isError: true, text: `read failed: ${e.message}` };
    }
}

async function writeFile({ path: rawPath, content, _gateOpts }) {
    const path = validatePath(rawPath);
    if (typeof content !== 'string') return { isError: true, text: 'content must be a string' };

    try {
        safetyCommit(path);
        await gate(`write_file: ${path}\n${content.length} chars`, _gateOpts);
    } catch (e) {
        return { isError: true, text: e.message };
    }

    try {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, content);
        return { isError: false, text: `wrote ${content.length} chars to ${path}` };
    } catch (e) {
        return { isError: true, text: `write failed: ${e.message}` };
    }
}

function listDirectory({ path: rawPath, depth = 2, includeHidden = false }) {
    const path = validatePath(rawPath);
    const IGNORE = new Set(['node_modules', '.git', '.DS_Store']);

    function walk(dir, currentDepth) {
        if (currentDepth > depth) return [];
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        } catch (e) {
            return [`(unreadable: ${e.message})`];
        }
        return entries
            .filter(e => includeHidden ? true : !e.name.startsWith('.'))
            .filter(e => !IGNORE.has(e.name))
            .sort((a, b) => {
                if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
                return a.name.localeCompare(b.name);
            })
            .flatMap(e => {
                const prefix = '  '.repeat(currentDepth) + (e.isDirectory() ? '📁 ' : '📄 ');
                const line   = prefix + e.name;
                if (e.isDirectory()) {
                    return [line, ...walk(join(dir, e.name), currentDepth + 1)];
                }
                return [line];
            });
    }

    try {
        statSync(path);
    } catch {
        return { isError: true, text: `path not found: ${path}` };
    }

    const lines = walk(path, 0);
    return {
        isError: false,
        text: `${path}\n${lines.join('\n')}`,
    };
}

export default [
    {
        name: 'read_file',
        description: 'Read a text file. Returns its content.',
        inputSchema: {
            type: 'object', required: ['path'],
            properties: { path: { type: 'string', description: 'Absolute path to the file' } },
        },
        handler: readFile,
    },
    {
        name: 'write_file',
        description: 'Write content to a file. Creates parent directories if needed.',
        inputSchema: {
            type: 'object', required: ['path', 'content'],
            properties: {
                path:    { type: 'string', description: 'Absolute path to the file' },
                content: { type: 'string', description: 'Content to write' },
            },
        },
        handler: writeFile,
    },
    {
        name: 'list_directory',
        description: 'List contents of a directory as an indented tree. Excludes node_modules and .git.',
        inputSchema: {
            type: 'object', required: ['path'],
            properties: {
                path:          { type: 'string',  description: 'Absolute path to the directory' },
                depth:         { type: 'number',  description: 'Max depth (default: 2)' },
                includeHidden: { type: 'boolean', description: 'Include hidden files (default: false)' },
            },
        },
        handler: listDirectory,
    },
];

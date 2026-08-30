# npm-install — install dependencies, and only under the projects root

## Problem

A repository whose dependencies are not installed fails every test for a reason that has nothing to do
with its code. The agent needs to run `npm install` itself, otherwise it stops and asks a human for a
command they will paste unchanged.

`npm install` also runs whatever `postinstall` scripts the packages declare, which is arbitrary code
execution. The `bash` extension therefore rejects it, and this extension exists to allow exactly that
one command, in exactly one place.

## Solution

The extension exposes one tool, `npm_install`, which runs `npm install` through `execFileSync` with no
shell involved. Two checks run before it.

The **location check** requires the directory to sit under the projects root, computed as the
grandparent of the extensions directory — `/Users/mic/PhpstormProjects` in this installation. An
install outside that tree is refused. This keeps the tool from writing into a system directory or a
home directory that happens to hold a `package.json`.

The **manifest check** requires a `package.json` in the directory. Without it `npm install` would
create one, or walk up to a parent and install there instead.

## Tool

`npm_install` requires `cwd`, an absolute path to the directory holding the `package.json`. Execution
times out after 60 seconds, which a cold install of a large dependency tree can exceed. A failure
returns stdout, stderr and the exit code.

The tool takes no package argument. It installs what the manifest already declares and cannot add a
dependency.

## Limits

The projects root is derived from where this file sits, so moving the repository moves the boundary
with it.

## Tests

None of its own.

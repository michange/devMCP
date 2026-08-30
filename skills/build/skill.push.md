# @push — publish an accepted local commit

This step is never eligible for `auto` or `ungate`. Pushing, merging into an
integration branch, and deleting a branch or worktree each require explicit user
authorization through Design Dialogue.

After authorization, verify the current branch, upstream, exact commits, and clean
scope. Push only the named branch. Report the remote result and do not merge or clean
up unless those separate decisions were also accepted.

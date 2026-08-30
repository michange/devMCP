# @behavior — describe end-to-end behavior

Describe the complete observable flow in plain language, from entry point to result.
Name concrete functions, values, dependencies, state changes, errors, and effects only
when they are already fixed by the accepted contract or architecture.

Cover the nominal path first, then errors and relevant edge cases. End with a compact
text flow. Persist durable accepted behavior in the applicable Markdown contract;
never create a derivative `doc.html` as its authority.

Present the contract that received the accepted behavior as
[`cyBuildModule`](./skill.cyBuildModule.md) prescribes under **Document presentation**: an
active Markdown link on the absolute path in the chat, and the same path opened in the IDE
through the devMCP `open_in_ide` tool.

# votecards-syntax — the syntax of a card, so the LLM only has to read its meaning

## Problem

VoteCards scores Erasmus+ project cards by having an LLM fill a domain model: which words name the
project's goal, which name its method, which name nobody in particular. Before it can attribute
anything, the LLM has to cut the text into syntagms — and that cut is where it goes wrong. On one
title it took `Bridging Techniques and Tactics` for two syntagms and filed half of it under the
goal; on another it pulled `Handball` and `Basketball` out of the noun phrase they modify and
treated them as autonomous. Worse, it cuts differently from one run to the next, so two runs on the
same card disagree before they have judged anything.

Cutting a sentence is not a matter of judgement. It is the code of the language, and a parser does
it the same way every time.

## Solution

One tool, `parse_syntax`, returns the dependency tree of a card's title and description. The LLM
receives the tree and attributes meaning to its nodes; it no longer decides where words begin and
end. A syntagm stops being a group to delimit and becomes the subtree of a word, designated by that
word's rank in the text.

## Why Python, and why the big model

No JavaScript library produces dependency trees: `compromise` and `wink-nlp` tag parts of speech
and stop there. So the parser is spaCy, in its own venv, and the extension talks to it over a pipe.

The model is `en_core_web_trf`, and the small one will not do. On `Handball & Basketball Synergy:
Bridging Techniques and Tactics`, `en_core_web_sm` makes `Handball` the root, hangs `Synergy` off it
as a conjunct, and labels `Bridging` a proper noun; `en_core_web_trf` roots the phrase on `Synergy`,
attaches `Handball` as its modifier and `Basketball` as a conjunct of `Handball`, and reads
`Bridging` as the verb it is. Lowercasing the title fixes the parts of speech under the small model
but not the structure. On ten titles judged by hand, `trf` is clearly better on five, equal on
three, mixed on one.

Two of its gains bear directly on the scoring rules. In `Walking in Europe for Learning Languages`
it reads `Learning` as a verb governing `Languages`, which is the distinction the grid draws between
a subject taught and the act of teaching. In `VR Game Based Training` it reads `Based` as a verb,
which turns the project's marker of means into something syntax can find instead of a word list.

The price is a 1.3 GB venv, excluded from the repository, and a model that takes two seconds to
load.

## Why the worker stays alive

Loading `en_core_web_trf` costs about two seconds; parsing a card costs about sixty milliseconds. A
process spawned per call would spend half an hour loading over a thousand cards, and two seconds
before every single evaluation. So the worker is spawned on first use, kept alive, and respawned if
it dies. `parse.py` prints a ready line before loading anything, so the extension knows the process
is up without paying for a model it has not needed yet.

Calls are serialised through a promise queue, because the protocol is one request per line and one
answer per line, in order. Two concurrent calls would read each other's answers.

## Tool

`parse_syntax` requires `title` and accepts `desc`. It returns one node per word:

- `i` — the word's rank in its own text, so sorting every node by `i` and joining the words gives
  the text back. The tests check exactly that;
- `pos` — part of speech;
- `deprel` — the Universal Dependencies relation to its head;
- `children` — the words it governs, in reading order.

`desc` comes back `null` when there is nothing to parse. Coordination follows UD, where the first
conjunct is the head and the conjunction attaches by `cc` — not the generative-grammar analysis,
which heads a coordination on the conjunction itself.

A `_spawn` argument replaces the process launcher, which is how the tests observe failures without
starting anything.

## What this does not do

It stores nothing. Each call parses afresh, by decision: a stored tree is a tree that drifts from
the card it came from.

It covers English only, which is the scope of the VoteCards grid. Of the thousand cards, 704 titles
are English and 996 descriptions are; the rest are out of scope and are not parsed differently —
they are simply not evaluated.

It does not give a syntagm its semantic status. Whether a phrase is concrete, abstract or verbal is
the LLM's call, because it depends on the model being filled, not on the grammar.

## Install

```sh
cd extensions/votecards-syntax
python3 -m venv .venv
.venv/bin/pip install spacy
.venv/bin/python -m spacy download en_core_web_trf
```

`spacy-transformers` is not needed and must not be installed: spaCy 3.8's `trf` model pulls
`spacy-curated-transformers` and torch on its own, and `spacy-transformers` drags in
`spacy-alignments`, which fails to build here.

Torch warns that `torch.jit.script` is unsupported on Python 3.14 and may break. It works today;
that warning is where to look first if the parser stops loading.

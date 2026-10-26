"""Dependency trees for VoteCards card texts, English only.

A long-lived worker: it loads the model once, then answers one request per line
of stdin with one JSON object per line of stdout. Loading en_core_web_trf costs
about two seconds and parsing a card about sixty milliseconds, so a process that
died between calls would spend its whole life loading.

Request   {"title": "...", "desc": "..."}
Response  {"model": "...", "title": [tree, ...], "desc": [tree, ...] | null}
          {"error": "..."}

A tree is one node per word, nested under the word that governs it. Every word
carries `i`, its rank in its own text, so sorting all nodes by `i` and joining
their words gives the text back. `deprel` follows Universal Dependencies, where
a coordination hangs off its first conjunct.
"""

import json
import sys

MODEL = "en_core_web_trf"

_nlp = None


def _load():
    """Load the model once, on the first request, so startup stays cheap."""
    global _nlp
    if _nlp is None:
        import spacy

        _nlp = spacy.load(MODEL, exclude=["ner", "lemmatizer"])
    return _nlp


def _node(token):
    """One word and everything it governs, children in reading order."""
    out = {"i": token.i, "word": token.text, "pos": token.pos_, "deprel": token.dep_}
    children = sorted((_node(c) for c in token.children), key=lambda n: n["i"])
    if children:
        out["children"] = children
    return out


def _trees(text):
    """The maximal constituents of a text: one tree per sentence root."""
    if not text or not text.strip():
        return None
    doc = _load()(text)
    roots = [t for t in doc if t.head.i == t.i]
    return [_node(r) for r in sorted(roots, key=lambda t: t.i)]


def _answer(line):
    try:
        req = json.loads(line)
    except ValueError as e:
        return {"error": f"request is not JSON: {e}"}
    try:
        return {
            "model": MODEL,
            "title": _trees(req.get("title", "")),
            "desc": _trees(req.get("desc", "")),
        }
    except Exception as e:  # a parse failure must not kill the worker
        return {"error": f"{type(e).__name__}: {e}"}


def main():
    # Announced before the first load, so the caller knows the worker is up
    # without paying for the model it has not needed yet.
    print(json.dumps({"ready": True}), flush=True)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        print(json.dumps(_answer(line), ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()

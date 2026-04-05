# Reproducible Example

A small document pipeline (parser, validator, processor, storage, API) with architecture notes and research notes. Six files, two languages, clear call relationships between modules.

Run graphify on it and you get a knowledge graph showing how the modules connect, which functions call which, and how the architecture notes relate to the code.

## Input files

```
raw/
├── parser.py        reads files, detects format, kicks off the pipeline
├── validator.py     schema checks, calls processor for text normalization
├── processor.py     keyword extraction, cross-reference detection
├── storage.py       persists everything, maintains the index
├── api.py           HTTP handlers that orchestrate the above four modules
├── architecture.md  design decisions and module responsibilities
└── notes.md         open questions and tradeoffs, written informally
```

## How to run it

```bash
pip install graphifyy && graphify install
```

Then open Claude Code in this directory and type:

```
/graphify ./raw
```

Takes under a minute. No PDF or image extraction, so it runs entirely on AST and markdown parsing with no token cost for semantic extraction.

## What to expect

The graph should show:

- api.py as a hub node connected to all four modules
- parser.py calling validator.py and storage.py
- validator.py calling processor.py for normalize_text
- processor.py calling storage.py for load_index and save_processed
- architecture.md and notes.md linked to the code modules they discuss

The community detection will likely cluster the four Python modules together and the two markdown files together, or split api.py into its own cluster given its high connectivity.

God nodes will be storage.py (everything reads and writes through it) and api.py (connects to everything at the top level).

## After it runs

Ask questions in Claude Code and it answers from the graph:

- "what calls storage directly?"
- "what is the shortest path between parser and processor?"
- "which module has the most connections?"
- "what does the architecture doc say about the storage design?"

The graph lives in graphify-out/ and persists across sessions.

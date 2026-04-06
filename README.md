# graphify

[![CI](https://github.com/safishamsi/graphify/actions/workflows/ci.yml/badge.svg?branch=v2)](https://github.com/safishamsi/graphify/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/pypi/v/graphifyy)](https://pypi.org/project/graphifyy/)

**A Claude Code skill.** Type `/graphify` in Claude Code - it reads your files, builds a knowledge graph, and gives you back structure you didn't know was there. Understand a codebase faster. Find the "why" behind architectural decisions.

Fully multimodal. Drop in code, PDFs, markdown, screenshots, diagrams, whiteboard photos, even images in other languages - graphify uses Claude vision to extract concepts and relationships from all of it and connects them into one graph.

> Andrej Karpathy keeps a `/raw` folder where he drops papers, tweets, screenshots, and notes. graphify is the answer to that problem - 71.5x fewer tokens per query vs reading the raw files, persistent across sessions, honest about what it found vs guessed.

```
/graphify .                        # works on any folder - your codebase, notes, papers, anything
```

```
graphify-out/
├── graph.html       interactive graph - click nodes, search, filter by community
├── GRAPH_REPORT.md  god nodes, surprising connections, suggested questions
├── graph.json       persistent graph - query weeks later without re-reading
└── cache/           SHA256 cache - re-runs only process changed files
```

## How it works

graphify runs in two passes. First, a deterministic AST pass extracts structure from code files (classes, functions, imports, call graphs, docstrings, rationale comments) with no LLM needed. Second, Claude subagents run in parallel over docs, papers, and images to extract concepts, relationships, and design rationale. The results are merged into a NetworkX graph, clustered with Leiden community detection, and exported as interactive HTML, queryable JSON, and a plain-language audit report.

Every relationship is tagged `EXTRACTED` (found directly in source), `INFERRED` (reasonable inference, with a confidence score), or `AMBIGUOUS` (flagged for review). You always know what was found vs guessed.

## Install

**Requires:** [Claude Code](https://claude.ai/code) and Python 3.10+

```bash
pip install graphifyy && graphify install
```

> The PyPI package is temporarily named `graphifyy` while the `graphify` name is being reclaimed. The CLI and skill command are still `graphify`.

Then open Claude Code in any directory and type:

```
/graphify .
```

### Make Claude always use the graph (recommended)

After building a graph, run this once in your project:

```bash
graphify claude install
```

This does two things:

1. **CLAUDE.md rules** - tells Claude to read `graphify-out/GRAPH_REPORT.md` before answering architecture questions, and to rebuild the graph after editing code files.

2. **PreToolUse hook** (`settings.json`) - fires automatically before every Glob and Grep call. If a knowledge graph exists, Claude sees: _"graphify: Knowledge graph exists. Read GRAPH_REPORT.md for god nodes and community structure before searching raw files."_ This means Claude navigates via the graph instead of grepping through every file - faster answers, fewer wasted tool calls, and responses grounded in the actual structure of your codebase rather than keyword matches.

Without this, Claude will grep raw files by default even when a graph exists. With it, the graph becomes the first thing Claude reaches for.

Uninstall with `graphify claude uninstall`.

<details>
<summary>Manual install (curl)</summary>

```bash
mkdir -p ~/.claude/skills/graphify
curl -fsSL https://raw.githubusercontent.com/safishamsi/graphify/v2/graphify/skill.md \
  > ~/.claude/skills/graphify/SKILL.md
```

Add to `~/.claude/CLAUDE.md`:

```
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
```

</details>

## Usage

```
/graphify                          # run on current directory
/graphify ./raw                    # run on a specific folder
/graphify ./raw --mode deep        # more aggressive INFERRED edge extraction
/graphify ./raw --update           # re-extract only changed files, merge into existing graph
/graphify ./raw --obsidian         # also generate Obsidian vault (opt-in)

/graphify add https://arxiv.org/abs/1706.03762        # fetch a paper, save, update graph
/graphify add https://x.com/karpathy/status/...       # fetch a tweet

/graphify query "what connects attention to the optimizer?"
/graphify path "DigestAuth" "Response"
/graphify explain "SwinTransformer"

/graphify ./raw --watch            # auto-sync graph as files change (code: instant, docs: notifies you)
/graphify ./raw --wiki             # build agent-crawlable wiki (index.md + article per community)
/graphify ./raw --svg              # export graph.svg
/graphify ./raw --graphml          # export graph.graphml (Gephi, yEd)
/graphify ./raw --neo4j            # generate cypher.txt for Neo4j
/graphify ./raw --mcp              # start MCP stdio server

graphify hook install              # git hooks - rebuilds graph on commit and branch switch
graphify claude install            # always-on: CLAUDE.md + PreToolUse hook for this project
```

Works with any mix of file types:

| Type | Extensions | Extraction |
|------|-----------|------------|
| Code | `.py .ts .js .go .rs .java .c .cpp .rb .cs .kt .scala .php` | AST via tree-sitter + call-graph + docstring/comment rationale |
| Docs | `.md .txt .rst` | Concepts + relationships + design rationale via Claude |
| Papers | `.pdf` | Citation mining + concept extraction |
| Images | `.png .jpg .webp .gif` | Claude vision - screenshots, diagrams, any language |

## What you get

**God nodes** - highest-degree concepts (what everything connects through)

**Surprising connections** - ranked by composite score. Code-paper edges rank higher than code-code. Each result includes a plain-English why.

**Suggested questions** - 4-5 questions the graph is uniquely positioned to answer

**The "why"** - docstrings, inline comments (`# NOTE:`, `# IMPORTANT:`, `# HACK:`, `# WHY:`), and design rationale from docs are extracted as `rationale_for` nodes. Not just what the code does - why it was written that way.

**Confidence scores** - every INFERRED edge has a `confidence_score` (0.0-1.0). You know not just what was guessed but how confident the model was. EXTRACTED edges are always 1.0.

**Semantic similarity edges** - cross-file conceptual links with no structural connection. Two functions solving the same problem without calling each other, a class in code and a concept in a paper describing the same algorithm.

**Hyperedges** - group relationships connecting 3+ nodes that pairwise edges can't express. All classes implementing a shared protocol, all functions in an auth flow, all concepts from a paper section forming one idea.

**Token benchmark** - printed automatically after every run. On a mixed corpus (Karpathy repos + papers + images): **71.5x** fewer tokens per query vs reading raw files.

**Auto-sync** (`--watch`) - run in a background terminal and the graph updates itself as your codebase changes. Code file saves trigger an instant rebuild (AST only, no LLM). Doc/image changes notify you to run `--update` for the LLM re-pass.

**Git hooks** (`graphify hook install`) - installs post-commit and post-checkout hooks. Graph rebuilds automatically after every commit and every branch switch. No background process needed.

**Wiki** (`--wiki`) - Wikipedia-style markdown articles per community and god node, with an `index.md` entry point. Point any agent at `index.md` and it can navigate the knowledge base by reading files instead of parsing JSON.

## Worked examples

| Corpus | Files | Reduction | Output |
|--------|-------|-----------|--------|
| Karpathy repos + 5 papers + 4 images | 52 | **71.5x** | [`worked/karpathy-repos/`](worked/karpathy-repos/) |
| graphify source + Transformer paper | 4 | **5.4x** | [`worked/mixed-corpus/`](worked/mixed-corpus/) |
| httpx (synthetic Python library) | 6 | ~1x | [`worked/httpx/`](worked/httpx/) |

Token reduction scales with corpus size. 6 files fits in a context window anyway, so graph value there is structural clarity, not compression. At 52 files (code + papers + images) you get 71x+. Each `worked/` folder has the raw input files and the actual output (`GRAPH_REPORT.md`, `graph.json`) so you can run it yourself and verify the numbers.

## Tech stack

NetworkX + Leiden (graspologic) + tree-sitter + Claude + vis.js. No Neo4j required, no server, runs entirely locally.

<details>
<summary>Contributing</summary>

**Worked examples** are the most trust-building contribution. Run `/graphify` on a real corpus, save output to `worked/{slug}/`, write an honest `review.md` evaluating what the graph got right and wrong, submit a PR.

**Extraction bugs** - open an issue with the input file, the cache entry (`graphify-out/cache/`), and what was missed or invented.

See [ARCHITECTURE.md](ARCHITECTURE.md) for module responsibilities and how to add a language.

</details>

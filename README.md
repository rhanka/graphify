# graphify

[![CI](https://github.com/safishamsi/graphify/actions/workflows/ci.yml/badge.svg?branch=v1)](https://github.com/safishamsi/graphify/actions/workflows/ci.yml)

**A Claude Code skill.** Type `/graphify` in Claude Code - it reads your files, builds a knowledge graph, and gives you back structure you didn't know was there.

> Andrej Karpathy keeps a `/raw` folder where he drops papers, tweets, screenshots, and notes. The problem: that folder becomes opaque. You forget what's in it. You can't see what connects. graphify is the answer to that problem.

```
/graphify ./raw
```

```
graphify-out/
├── graph.html       interactive graph - click nodes, search, filter by community, open in any browser
├── obsidian/        open as Obsidian vault - visual graph, wikilinks, filter by community
├── GRAPH_REPORT.md  what the graph found: god nodes, surprising connections, suggested questions
├── graph.json       persistent graph - query it weeks later without re-reading anything
├── cache/           per-file SHA256 cache - re-runs only process changed files
└── memory/          Q&A results filed back in - what you ask grows the graph on next --update
```

## Why this exists

graphify takes that observation and builds the missing infrastructure:

| His problem | What graphify adds |
|---|---|
| Folder becomes opaque | Community detection surfaces structure automatically |
| Forget what's in it | Persistent `graph.json` - query weeks later without re-reading |
| Can't see connections | Cross-community surprising connections as a first-class output |
| Claude hallucinates missing links | `EXTRACTED` / `INFERRED` / `AMBIGUOUS` - honest about what was found vs guessed |
| Context resets every session | Memory feedback loop - what you ask grows the graph on `--update` |
| Only works on text | PDFs, images, screenshots, tweets, any language via vision |
| Reading everything costs tokens | **71.5x token reduction** on large mixed corpora - query the graph, not the files |

**What LLMs get wrong without it:** Naive summarization fills every gap confidently. You get output that sounds complete but you can't tell what was actually in the files vs invented. And next session, it's all gone.

**What graphify does differently:**

- **71.5x token reduction** - on a mixed corpus (Karpathy repos + papers + images), querying the graph costs 71.5x fewer tokens than reading the raw files. The benchmark runs automatically after every `/graphify` run.
- **Persistent graph** - relationships stored in `graphify-out/graph.json`, survive across sessions. Query weeks later without re-reading anything.
- **Honest audit trail** - every edge tagged `EXTRACTED` (explicitly stated), `INFERRED` (call-graph or reasonable deduction), or `AMBIGUOUS` (flagged for review). You always know what was found vs invented.
- **Cross-document surprise** - Leiden community detection finds clusters, then surfaces cross-community connections: the things you would never think to ask about directly.
- **Feedback loop** - every query answer saved to `graphify-out/memory/`. On next `--update`, that Q&A becomes a node. The graph grows from what you ask, not just what you add.

The result: a navigable map of your corpus that is honest about what it knows and what it guessed.

## Install

**Requires:** [Claude Code](https://claude.ai/code) (the CLI or desktop app) and Python 3.10+

```bash
pip install graphifyy && graphify install
```

> **Note:** The PyPI package is temporarily named `graphifyy` while the `graphify` name is being reclaimed. The CLI, skill command, and everything else is still called `graphify` - only `pip install` uses the extra `y`.

This copies the skill file into `~/.claude/skills/graphify/` and registers it in `~/.claude/CLAUDE.md`. The Python package and all dependencies install automatically on first `/graphify` run - you never touch pip again.

Then open Claude Code in any directory and type:

```
/graphify .
```

<details>
<summary>Manual install (curl)</summary>

**Step 1 - copy the skill file**

```bash
mkdir -p ~/.claude/skills/graphify
curl -fsSL https://raw.githubusercontent.com/safishamsi/graphify/v1/skills/graphify/skill.md \
  > ~/.claude/skills/graphify/SKILL.md
```

**Step 2 - register it in Claude Code**

Add this to `~/.claude/CLAUDE.md` (create the file if it doesn't exist):

```
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
```

</details>

## Usage

All commands are typed inside Claude Code:

```
/graphify                          # run on current directory
/graphify ./raw                    # run on a specific folder
/graphify ./raw --mode deep        # more aggressive INFERRED edge extraction
/graphify ./raw --update           # re-extract only changed files, merge into existing graph
/graphify ./raw --watch            # notify when new files appear

/graphify add https://arxiv.org/abs/1706.03762        # fetch a paper, save, update graph
/graphify add https://x.com/karpathy/status/...       # fetch a tweet
/graphify add <url> --author "Karpathy" --contributor "safi"

/graphify query "what connects attention to the optimizer?"    # BFS - broad context
/graphify query "how does the encoder reach the loss?" --dfs   # DFS - trace a path
/graphify query "..." --budget 1500                            # cap at N tokens

/graphify path "DigestAuth" "Response"      # shortest path between two concepts
/graphify explain "SwinTransformer"         # plain-language node explanation

/graphify ./raw --svg              # also export graph.svg (embeds in Notion, GitHub)
/graphify ./raw --graphml          # also export graph.graphml (Gephi, yEd, any GraphML tool)
/graphify ./raw --neo4j            # generate cypher.txt for Neo4j import
/graphify ./raw --mcp              # start MCP stdio server for agent access
```

Works with any mix of file types in the same folder:

| Type | Extensions | How it's extracted |
|------|-----------|-------------------|
| Code | `.py .ts .tsx .js .go .rs .java .c .cpp .rb .cs .kt .scala .php` | AST via tree-sitter (deterministic) + call-graph pass (INFERRED) |
| Documents | `.md .txt .rst` | Concepts + relationships via Claude |
| Papers | `.pdf` | Citation mining + concept extraction |
| Images | `.png .jpg .webp .gif .svg` | Claude vision - screenshots, charts, whiteboards, any language |

## What you get

After running, Claude outputs three things directly in chat:

**God nodes** - highest-degree concepts (what everything connects through)

**Surprising connections** - ranked by a composite surprise score, not just confidence. A code-paper edge scores higher than code-code. A cross-repo connection scores higher than same-repo. Each result includes a plain-English `why` explaining what makes it non-obvious.

**Suggested questions** - 4-5 questions the graph is uniquely positioned to answer, with the reason why (which bridge node makes it interesting, which community boundary it crosses)

The full GRAPH_REPORT.md adds community summaries with cohesion scores and a list of ambiguous edges for review.

**Token reduction benchmark** - automatically printed after every run on corpora over 5,000 words. Shows how many fewer tokens querying the graph costs vs reading the raw files directly.

## Key files explained

| File | Purpose |
|------|---------|
| `graph.html` | Interactive vis.js graph. Node size = degree. Click any node for details + clickable neighbors. Search by name. Filter by community. Opens in any browser. |
| `GRAPH_REPORT.md` | The audit report. God nodes, surprising connections, community cohesion scores, ambiguous edge list, suggested questions. |
| `graph.json` | Persistent graph in node-link format. Load it with NetworkX or push to Neo4j. Survives sessions. |
| `obsidian/` | Wikilink vault. Open in Obsidian → enable graph view → see communities as clusters. Filter by tag, search across everything. |
| `graphify-out/cache/` | SHA256-based per-file cache. A re-run on an unchanged corpus takes seconds. |
| `graphify-out/memory/` | Q&A feedback loop. Every `/graphify query` answer is saved here. Next `--update` extracts it into the graph. |

## What this skill will NOT do

- **Won't invent edges** - `AMBIGUOUS` exists so uncertain relationships are flagged, not hidden. If the connection isn't clear, it's tagged, not fabricated.
- **Won't claim the graph is useful when it isn't** - a corpus over 2M words or 200 files gets a cost warning before proceeding.
- **Won't re-extract unchanged files** - SHA256 cache ensures warm re-runs skip everything that hasn't changed.
- **Won't visualize graphs over 5,000 nodes** - use `--no-viz` or query instead.
- **Won't download datasets or set up infrastructure** - graphify reads your files. What you put in the folder is what it works with.
- **Won't implement baselines or run experiments** - it reads and maps. Analysis is yours.

## Design principles

1. **Extraction quality is everything** - clustering is downstream of it. A bad graph clusters into bad communities. The AST + call-graph pass exists because deterministic beats probabilistic for code.
2. **Show the numbers** - cohesion is `0.91`, not "good". Token cost is always printed. You know what you spent.
3. **The best output is what you didn't know** - Surprising Connections is not optional. God nodes you probably already suspected. Cross-community edges are what you came for.
4. **The graph earns its complexity** - below a certain density, just use Claude directly. The graph adds value when you have more than you can hold in context across sessions.
5. **What you ask grows the graph** - query results are filed back in automatically. The corpus is not static.
6. **Honest uncertainty** - `EXTRACTED`, `INFERRED`, `AMBIGUOUS` are not cosmetic labels. They are the difference between trusting the graph and being misled by it.

## Contributing

**Adding worked examples**

Worked examples are the most trust-building part of this project. To add one:

1. Pick a real corpus (people should be able to verify the output)
2. Run the skill: `/graphify <path>`
3. Save the full output to `worked/{corpus_slug}/`
4. Write a `review.md` that honestly evaluates:
   - What the graph got right
   - What edges it correctly flagged AMBIGUOUS
   - Any mistakes or missed connections
   - Any surprising connections that were genuinely surprising
5. Submit a PR with all of the above

**Improving extraction**

If you find a file type or language where extraction is poor, open an issue with a minimal reproduction case. The best bug reports include: the input file, the extraction output (`graphify-out/cache/` entry), and what was missed or invented.

**Adding domain knowledge**

If corpora in your domain consistently contain structures graphify doesn't extract well (e.g., legal documents, lab notebooks, musical scores), open a discussion with examples.

## Worked examples

| Corpus | Type | Reduction | Eval report |
|--------|------|-----------|-------------|
| Karpathy repos + 5 research papers + 4 images | Mixed (code + papers + images) | **71.5x** | [`worked/karpathy-repos/review.md`](worked/karpathy-repos/review.md) |
| httpx (Python HTTP client) | Codebase (6 files) | small corpus¹ | [`worked/httpx/review.md`](worked/httpx/review.md) + [`GRAPH_REPORT.md`](worked/httpx/GRAPH_REPORT.md) |
| Mixed corpus (code + paper + Arabic image) | Multi-type (5 files) | small corpus¹ | [`worked/mixed-corpus/review.md`](worked/mixed-corpus/review.md) |

¹ Small corpora fit in a single context window - graph value is structural clarity, not token reduction. Reduction ratios grow with corpus size.

Each includes the full graph output and an honest evaluation of what the skill got right and wrong.

## Tech stack

| Layer | Library | Why |
|-------|---------|-----|
| Graph | NetworkX | Pure Python, same internals as MS GraphRAG |
| Community detection | Leiden via graspologic | Better than K-means for sparse graphs |
| Code parsing | tree-sitter | Multi-language AST, deterministic, zero hallucination |
| Extraction | Claude (parallel subagents) | Reads anything, outputs structured graph data |
| Visualization | vis.js (HTML) + Obsidian vault | Interactive browser graph + wikilink vault, no server needed |

No Neo4j required. No dashboards. No server. Runs entirely locally.

## Files

```
graphify/
├── detect.py     detect file types, auto-exclude venvs/caches/node_modules; scan graphify-out/memory/
├── extract.py    AST extraction (13 languages via tree-sitter) + call-graph pass (INFERRED edges)
├── build.py      assemble NetworkX graph from extraction JSON; schema-validates before assembly
├── cluster.py    Leiden community detection, cohesion scoring
├── analyze.py    god nodes, bridge nodes, surprising connections, suggested questions, graph diff
├── report.py     render GRAPH_REPORT.md
├── export.py     Obsidian vault, graph.json, graph.html (vis.js), graph.svg, graph.graphml, Neo4j Cypher, Canvas
├── ingest.py     fetch URLs (arXiv, Twitter/X, PDF, any webpage); save Q&A to graphify-out/memory/
├── cache.py      SHA256-based per-file extraction cache; check_semantic_cache / save_semantic_cache
├── security.py   URL validation (http/https only), safe fetch with size cap, path guards, label sanitisation
├── validate.py   JSON schema checks on extraction output
├── serve.py      MCP stdio server - query_graph, get_node, get_neighbors, shortest_path, god_nodes
├── benchmark.py  token reduction benchmark - corpus tokens vs graph query tokens
└── watch.py      fs watcher, writes flag file when new files appear

skills/graphify/
└── skill.md      the Claude Code skill - the full pipeline the agent runs step by step

ARCHITECTURE.md   module responsibilities, extraction schema, how to add a language
SECURITY.md       threat model, mitigations, vulnerability reporting
worked/           eval reports from real corpora (karpathy-repos, httpx, mixed-corpus)
tests/            223 tests, one file per module
pyproject.toml    pip install graphifyy  |  pip install graphifyy[mcp,neo4j,pdf,watch]
```

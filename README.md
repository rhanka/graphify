# graphify

A Claude Code skill that turns any folder of files into a navigable knowledge graph — then opens it as an Obsidian vault you can explore, filter, and query.

```
/graphify ./raw
```

```
.graphify/
├── obsidian/        open as Obsidian vault to explore the graph visually
├── GRAPH_REPORT.md  what the graph found — surprising connections, knowledge gaps, suggested questions
└── graph.json       persistent graph — query it weeks later without re-reading anything
```

## The problem it solves

Andrej Karpathy described it well: he keeps a `/raw` folder where he drops papers, tweets, screenshots, and notes. The problem is that folder becomes opaque. You forget what's in it. You can't see what connects.

Claude can read any single file. But ask Claude "what connects paper A to the code in repo B?" and it will hallucinate — it hasn't read both, and even if it has, it has no memory of the connection next session.

graphify solves this by:

1. Reading everything once, extracting a persistent graph
2. Tagging every edge as `[EXTRACTED]` (explicitly stated), `[INFERRED]` (reasonable), or `[AMBIGUOUS]` (flagged for review) — you always know what was found vs invented
3. Running community detection to find clusters you didn't know existed
4. Surfacing cross-community connections — the things you would never think to ask about directly
5. Storing the graph in `.graphify/graph.json` so you can query it in any future session without re-extracting

## Install

Copy the skill into your Claude Code skills directory:

```bash
mkdir -p ~/.claude/skills/graphify
curl -s https://raw.githubusercontent.com/safishamsi/graphify/v1/skills/graphify/skill.md \
  > ~/.claude/skills/graphify/SKILL.md
```

Add to `~/.claude/CLAUDE.md`:
```
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) — any input to knowledge graph. Trigger: `/graphify`
```

## Usage

```bash
/graphify                          # run on current directory
/graphify ./raw                    # run on a specific folder
/graphify ./raw --mode deep        # more aggressive INFERRED edge extraction
/graphify ./raw --update           # re-extract only changed files, merge into existing graph
/graphify ./raw --watch            # notify when new files appear (drop files, get pinged)

/graphify add https://arxiv.org/abs/1706.03762        # fetch a paper, save, update graph
/graphify add https://x.com/karpathy/status/...       # fetch a tweet
/graphify add <url> --author "Karpathy" --contributor "safi"  # tag who wrote it and who added it

/graphify query "what connects attention to the optimizer?"    # BFS — broad context
/graphify query "how does the encoder reach the loss?" --dfs   # DFS — trace a path
/graphify query "..." --budget 1500                            # cap at N tokens

/graphify ./raw --html             # also export graph.html (browser, no Obsidian needed)
/graphify ./raw --svg              # also export graph.svg (embeds in Notion, GitHub)
/graphify ./raw --neo4j            # generate cypher.txt for Neo4j import
```

Works with any mix of file types in the same folder:

| Type | Extensions | How it's extracted |
|------|-----------|-------------------|
| Code | `.py .ts .js .go .rs .java .cpp .rb` etc | AST (deterministic) + semantic (Claude) |
| Documents | `.md .txt .rst` | Claude reads and extracts concepts + relationships |
| Papers | `.pdf` | Citation mining + concept extraction |
| Images | `.png .jpg .webp .gif .svg` | Claude vision — reads UI screenshots, charts, tweets, diagrams, whiteboards |

## What you get

After running, Claude pastes three things directly into the chat:

**God nodes** — the highest-degree concepts (what everything connects through)

**Surprising connections** — cross-community edges; relationships between concepts that live in different clusters. These are what you didn't know to look for.

**Suggested questions** — 4-5 questions the graph is uniquely positioned to answer, with the reason why (which bridge node makes it interesting, which community boundary it crosses)

The full `GRAPH_REPORT.md` also includes community summaries with cohesion scores and a list of ambiguous edges for your review.

## Use cases

**New codebase** — run `/graphify` before touching anything. Find the god nodes (what you have to understand first), the community structure (what the major subsystems are), and the surprising connections (what talks to what that you wouldn't expect).

**Research reading list** — drop papers, tweets, and notes into `/raw`. Run `/graphify ./raw`. Get a graph of how concepts connect across everything you've read. Query it: "what connects sparse autoencoders to superposition?"

**Personal knowledge base** — leave `--watch` running on your `/raw` folder. Drop things in throughout the day. The graph grows. Query it weeks later without re-reading anything.

**Collaborative corpus** — use `--contributor` to tag who added what. The graph knows provenance. "What did safi add that connects to the attention mechanism?"

## What it will NOT do

- Won't invent edges — `[AMBIGUOUS]` exists so uncertain relationships are flagged, not hidden
- Won't claim the graph is useful when it isn't — corpus under 50K words gets a warning
- Won't re-extract unchanged files — `--update` uses a manifest to skip unchanged files
- Won't visualize graphs over 5,000 nodes — use `--no-viz` or query instead

## Files

```
graphify/
├── detect.py     detect file types, auto-exclude venvs/caches/node_modules
├── extract.py    parse files into nodes + edges (tree-sitter AST + Claude)
├── build.py      assemble NetworkX graph from extraction JSON
├── cluster.py    Leiden community detection, cohesion scoring
├── analyze.py    god nodes, bridge nodes, surprising connections, suggested questions
├── report.py     render GRAPH_REPORT.md
├── export.py     Obsidian vault, graph.json, graph.html, graph.svg, Neo4j Cypher
├── ingest.py     fetch URLs (arXiv, Twitter/X, PDF, any webpage), save annotated markdown
├── validate.py   JSON schema checks on extraction output
├── serve.py      MCP stdio server — exposes graph tools to other agents
└── watch.py      fs watcher, writes flag file when new files appear

skills/graphify/
└── skill.md      the Claude Code skill — everything the agent runs

tests/            71 tests, one file per module
pyproject.toml    deps: networkx, graspologic, tree-sitter, pyvis
```

## Tech stack

| Layer | Library | Why |
|-------|---------|-----|
| Graph | NetworkX | Pure Python, same internals as MS GraphRAG |
| Community detection | Leiden via graspologic | Better than K-means for sparse graphs |
| Code parsing | tree-sitter | Multi-language AST, deterministic, zero hallucination |
| Extraction | Claude (parallel subagents) | Reads anything, outputs structured graph data |
| Visualization | Obsidian vault | Native graph view, wikilinks, search, no server needed |

No Neo4j required. No dashboards. No server. Runs entirely locally.

## Design principles

1. Extraction quality is everything — clustering is downstream of it
2. Show the numbers — cohesion is 0.91, not "good"
3. The best output is what you didn't know — Surprising Connections is not optional
4. Token cost is always visible
5. The graph earns its complexity — corpus under 50K words gets a warning to just use Claude directly

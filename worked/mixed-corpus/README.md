# Mixed Corpus Benchmark — How to Reproduce

A small but realistic mixed-input corpus: Python source files, a markdown paper with
arXiv citations, and one image. Tests graphify's ability to handle different file types
in a single run.

## Corpus (5 files)

All input files are in `raw/`:

```
raw/
├── analyze.py          — graphify's graph analysis module (god_nodes, surprising_connections, etc.)
├── build.py            — graphify's graph builder (build_from_json, networkx wrapper)
├── cluster.py          — graphify's Leiden community detection (cluster, score_all)
├── attention_notes.md  — Transformer paper notes (Vaswani et al., 2017), with arXiv citation
```

Note: the original benchmark included `attention_arabic.png` (an Arabic-language figure from the
Attention paper). PNG files are not stored in this repo. To reproduce with the image, save any
diagram or figure from the Attention Is All You Need paper as `raw/attention_arabic.png`.

## How to run

```bash
pip install graphifyy && graphify install
/graphify ./raw
```

Or from the CLI directly:

```bash
pip install graphifyy
graphify ./raw
```

## What to expect

- ~20 nodes, ~19 edges from AST alone (3 Python modules)
- 3 communities: Graph Analysis, Clustering & Scoring, Graph Building
- God nodes: `analyze.py`, `cluster.py`, `build.py`
- `attention_notes.md` classified as `paper` (arXiv heuristic fires on `1706.03762`)
- If you include the image: 1 extra node describing the figure content via vision

Full eval with scores and analysis: `review.md`

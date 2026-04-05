# httpx Corpus Benchmark — How to Reproduce

A synthetic 6-file Python codebase modeled after httpx's architecture. Tests graphify
on a realistic library codebase with clean layering: exceptions → models → auth/transport → client.

## Corpus (6 files)

All input files are in `raw/`:

```
raw/
├── exceptions.py   — full HTTPError hierarchy (RequestError, TransportError, HTTPStatusError, etc.)
├── models.py       — URL, Headers, Cookies, Request, Response with raise_for_status
├── auth.py         — BasicAuth, BearerAuth, DigestAuth (challenge-response), NetRCAuth
├── utils.py        — header normalization, query param flattening, content-type parsing
├── transport.py    — ConnectionPool, HTTPTransport, AsyncHTTPTransport, MockTransport, ProxyTransport
└── client.py       — Timeout, Limits, BaseClient, Client (sync), AsyncClient
```

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

- 144 nodes, 330 edges, 6 communities
- God nodes: `Client`, `AsyncClient`, `Response`, `Request`, `BaseClient`, `HTTPTransport`
- Surprising connections: `DigestAuth` ↔ `Response` (auth.py reads Response to parse WWW-Authenticate)
- **~1x token reduction** — 6 files fits in a context window, so there's no compression win here

The graph value on a small corpus is structural, not compressive: you can see the full dependency graph, identify god nodes, and understand architecture at a glance. For token reduction to matter you need 20+ files. At 52 files (Karpathy repos benchmark) graphify achieves 71.5x.

Run `graphify benchmark worked/httpx/graph.json` to verify the numbers yourself.
Actual output is already in this folder: `GRAPH_REPORT.md` (human-readable) and `graph.json` (full graph data).

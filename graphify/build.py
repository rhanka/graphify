# assemble node+edge dicts into a NetworkX graph, preserving edge direction
from __future__ import annotations
import networkx as nx


def build_from_json(extraction: dict) -> nx.Graph:
    G = nx.Graph()
    for node in extraction.get("nodes", []):
        G.add_node(node["id"], **{k: v for k, v in node.items() if k != "id"})
    for edge in extraction.get("edges", []):
        attrs = {k: v for k, v in edge.items() if k not in ("source", "target")}
        # Preserve original edge direction — undirected graphs lose it otherwise,
        # causing display functions to show edges backwards.
        attrs["_src"] = edge["source"]
        attrs["_tgt"] = edge["target"]
        G.add_edge(edge["source"], edge["target"], **attrs)
    return G


def build(extractions: list[dict]) -> nx.Graph:
    """Merge multiple extraction results into one graph."""
    G = nx.Graph()
    for ext in extractions:
        sub = build_from_json(ext)
        G.update(sub)
    return G

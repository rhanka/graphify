import { describe, expect, it } from "vitest";

import { injectOntologyClassNodes } from "../lib/classNodes.js";
import { buildScene, computeDegrees, computeGodClass } from "../lib/graphAdapter.js";

// A small graph: two Characters (one is a clear hub), a Location, and a few
// edges. Mirrors the mystery-pack shape (node `type`, link `relation`).
function baseGraph() {
  return {
    nodes: [
      { id: "char_holmes", label: "Sherlock Holmes", type: "Character" },
      { id: "char_watson", label: "John Watson", type: "Character" },
      { id: "place_baker", label: "Baker Street", type: "Location" },
    ],
    links: [
      { source: "char_holmes", target: "char_watson", relation: "assists" },
      { source: "char_holmes", target: "place_baker", relation: "located_in" },
      { source: "char_watson", target: "place_baker", relation: "located_in" },
    ],
  };
}

// A class-hierarchies.json artifact (graphify_ontology_class_hierarchies_v1):
// Agent -> { Character (leaf, members), Location-as-leaf }. The "char_ghost"
// member is ABSENT from the graph — its has_instance edge must NOT be drawn.
function classHierarchies() {
  return {
    schema: "graphify_ontology_class_hierarchies_v1",
    generated_at: "2026-06-19T00:00:00.000Z",
    hierarchies: {
      mystery: {
        relation_type: "subclass_of",
        membership_relation_type: "has_instance",
        root_class_ids: ["class:Agent"],
        max_depth: 1,
        classes_by_id: {
          "class:Agent": {
            id: "class:Agent",
            label: "Agent",
            parent_id: null,
            child_ids: ["class:Character"],
            level: 0,
            member_node_types: [],
            member_ids: [],
            source: "profile",
            status: "reference",
          },
          "class:Character": {
            id: "class:Character",
            label: "Character",
            parent_id: "class:Agent",
            child_ids: [],
            level: 1,
            member_node_types: ["Character"],
            member_ids: ["char_holmes", "char_watson", "char_ghost"],
            source: "profile",
            status: "reference",
          },
          "class:Location": {
            id: "class:Location",
            label: "Location",
            parent_id: null,
            child_ids: [],
            level: 0,
            member_node_types: ["Location"],
            member_ids: ["place_baker"],
            source: "profile",
            status: "reference",
          },
        },
      },
    },
  };
}

describe("injectOntologyClassNodes — leaf mode (default)", () => {
  it("adds leaf class nodes + has_instance edges to PRESENT members only", () => {
    const graph = baseGraph();
    const out = injectOntologyClassNodes(graph, classHierarchies());

    // Original nodes/links are preserved, and a NEW graph is returned.
    expect(out).not.toBe(graph);
    expect(out.nodes).toHaveLength(3 + 2); // + class:Character, class:Location
    // Inner class:Agent (no member_node_types) is NOT injected in leaf mode.
    const ids = out.nodes.map((n) => n.id);
    expect(ids).toContain("class:Character");
    expect(ids).toContain("class:Location");
    expect(ids).not.toContain("class:Agent");

    const classNode = out.nodes.find((n) => n.id === "class:Character");
    expect(classNode).toMatchObject({
      id: "class:Character",
      label: "Character",
      type: "OntologyClass",
      ontology_node_kind: "class",
      ontology_class_id: "Character",
      level: 1,
    });

    // has_instance edges target ONLY members present in the graph (char_ghost
    // is absent and gets no edge); they are flagged structural + membership.
    const memberEdges = out.links.filter((e) => e.relation === "has_instance");
    expect(memberEdges).toHaveLength(3); // holmes, watson (Character) + baker (Location)
    for (const e of memberEdges) {
      expect(e.structural).toBe(true);
      expect(e.ontology_edge_kind).toBe("membership");
    }
    const charMembers = memberEdges
      .filter((e) => e.source === "class:Character")
      .map((e) => e.target)
      .sort();
    expect(charMembers).toEqual(["char_holmes", "char_watson"]);
    expect(memberEdges.some((e) => e.target === "char_ghost")).toBe(false);

    // Leaf mode draws NO inter-class subclass_of edges.
    expect(out.links.some((e) => e.relation === "subclass_of")).toBe(false);
  });

  it("never mutates the input graph", () => {
    const graph = baseGraph();
    injectOntologyClassNodes(graph, classHierarchies());
    expect(graph.nodes).toHaveLength(3);
    expect(graph.links).toHaveLength(3);
  });
});

describe("injectOntologyClassNodes — all mode", () => {
  it("injects EVERY class + subclass_of edges between them", () => {
    const graph = baseGraph();
    const out = injectOntologyClassNodes(graph, classHierarchies(), { levels: "all" });

    const ids = out.nodes.map((n) => n.id);
    // Inner class:Agent is now injected too.
    expect(ids).toContain("class:Agent");
    expect(ids).toContain("class:Character");
    expect(ids).toContain("class:Location");

    // subclass_of: parent -> child (Agent -> Character), flagged structural.
    const subclassEdges = out.links.filter((e) => e.relation === "subclass_of");
    expect(subclassEdges).toHaveLength(1);
    expect(subclassEdges[0]).toMatchObject({
      source: "class:Agent",
      target: "class:Character",
      structural: true,
      ontology_edge_kind: "subclass",
    });

    // Member edges still only point at present entities.
    const memberEdges = out.links.filter((e) => e.relation === "has_instance");
    expect(memberEdges).toHaveLength(3);
  });
});

describe("injectOntologyClassNodes — absent / empty artifact", () => {
  it("returns the graph UNCHANGED for null / empty hierarchies", () => {
    const graph = baseGraph();
    expect(injectOntologyClassNodes(graph, null)).toBe(graph);
    expect(injectOntologyClassNodes(graph, {})).toBe(graph);
    expect(injectOntologyClassNodes(graph, { hierarchies: {} })).toBe(graph);
  });
});

describe("injectOntologyClassNodes — idempotency / dedup", () => {
  it("re-injecting over an already-injected graph is a no-op", () => {
    const graph = baseGraph();
    const once = injectOntologyClassNodes(graph, classHierarchies());
    const twice = injectOntologyClassNodes(once, classHierarchies());
    // No duplicate class nodes nor duplicate has_instance edges.
    expect(twice.nodes).toHaveLength(once.nodes.length);
    expect(twice.links).toHaveLength(once.links.length);
    // Nothing new was added, so the same graph object is returned.
    expect(twice).toBe(once);
  });
});

describe("synthetic structural edges do not change the god-class election", () => {
  it("god-class + degrees are identical with and without injected class nodes", () => {
    const graph = baseGraph();
    const injected = injectOntologyClassNodes(graph, classHierarchies());

    // Degrees over the entity nodes are unchanged: structural has_instance edges
    // are excluded from the degree count.
    const baseDeg = computeDegrees(graph.nodes, graph.links);
    const injDeg = computeDegrees(injected.nodes, injected.links);
    for (const node of graph.nodes) {
      expect(injDeg.get(node.id)).toBe(baseDeg.get(node.id));
    }
    // Class nodes themselves sit at the degree floor (0) — structural-only.
    expect(injDeg.get("class:Character")).toBe(0);
    expect(injDeg.get("class:Location")).toBe(0);

    // The god-class election (Character bucket) is identical.
    const baseMax = Math.max(...baseDeg.values());
    const injMax = Math.max(...injDeg.values());
    expect(computeGodClass(injected.nodes, injDeg, injMax)).toBe(
      computeGodClass(graph.nodes, baseDeg, baseMax),
    );
    expect(computeGodClass(injected.nodes, injDeg, injMax)).toBe("Character");
  });

  it("buildScene renders class nodes as roundedbox without disturbing entity boxes", () => {
    const graph = baseGraph();
    const injected = injectOntologyClassNodes(graph, classHierarchies());

    const baseScene = buildScene(graph, { showWeakLinks: true });
    const injScene = buildScene(injected, { showWeakLinks: true });

    // The god-class hub (most-connected Character) is the same box in both.
    const baseHolmes = baseScene.nodes.find((n) => n.id === "char_holmes");
    const injHolmes = injScene.nodes.find((n) => n.id === "char_holmes");
    expect(injHolmes.shape).toBe(baseHolmes.shape);

    // Class nodes are labelled rounded boxes carrying their passthrough fields.
    const classNode = injScene.nodes.find((n) => n.id === "class:Character");
    expect(classNode.shape).toBe("roundedbox");
    expect(classNode.type).toBe("OntologyClass");
    expect(classNode.ontology_node_kind).toBe("class");
    expect(classNode.ontology_class_id).toBe("Character");

    // The membership edge carries the dotted dash + passthrough kind.
    const memberEdge = injScene.edges.find(
      (e) => e.relation === "has_instance" && e.source === "class:Character",
    );
    expect(memberEdge.dash).toBe("dotted");
    expect(memberEdge.structural).toBe(true);
    expect(memberEdge.ontology_edge_kind).toBe("membership");
  });
});

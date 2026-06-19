/**
 * EVOL 2.a — ontology CLASS-node injection (studio side).
 *
 * Consumes the standalone `class-hierarchies.json` artifact (schema
 * `graphify_ontology_class_hierarchies_v1`, emitted by EVOL 2.c) and injects
 * SYNTHETIC class nodes + their structural edges INTO a GraphLike payload, so
 * the Options toggle can show ontology classes connected to their member
 * entities. The result is a NEW graph ({ nodes, links }) — the original is
 * never mutated — that the existing `buildScene` then turns into a scene, which
 * keeps degrees / god-class / weak-filter operating on the displayed topology.
 *
 * The injection is PURE and ADDITIVE:
 *   - OFF (toggle off, the default) means this module is never called and the
 *     studio renders exactly as before.
 *   - A null / empty `classHierarchies` artifact returns the graph unchanged.
 *
 * Class node shape (id taken VERBATIM from the artifact, e.g. "class:Character"):
 *   { id, label, type: "OntologyClass", ontology_node_kind: "class",
 *     ontology_class_id: "<Name>", level }
 *
 * Synthetic edges (always flagged `structural: true` so the renderer / degree
 * election can exclude them):
 *   - has_instance : class -> each member entity id present in the graph
 *       { relation: "has_instance", ontology_edge_kind: "membership" }
 *   - subclass_of  : parent class -> child class ("all" levels only)
 *       { relation: "subclass_of", ontology_edge_kind: "subclass" }
 *
 * `levels`:
 *   "leaf" (default) — inject only classes that carry `member_node_types`
 *       (leaf classes) plus their `has_instance` member edges; no inter-class
 *       subclass edges.
 *   "all" — inject EVERY class plus the `subclass_of` edges between them.
 *
 * Idempotent: nodes and edges are de-duplicated by id / (source|target|relation)
 * so re-running over an already-injected graph is a no-op.
 */

/** Class id namespace prefix the artifact uses (`class:<Name>`). */
const CLASS_ID_PREFIX = "class:";

function graphNodeList(graph) {
  return graph?.nodes ?? [];
}

/** Graphify persists `links`; some callers/tests pass `edges`. Accept both. */
function graphEdgeList(graph) {
  return graph?.edges ?? graph?.links ?? [];
}

/** True for a class entry that gathers entity members (a leaf class). */
function isLeafClass(entry) {
  return Array.isArray(entry?.member_node_types) && entry.member_node_types.length > 0;
}

/**
 * Inject ontology CLASS nodes + their structural edges into a GraphLike payload.
 *
 * @param {{ nodes?: object[], links?: object[], edges?: object[] }} graph
 *        the source graph (returned unchanged when there is nothing to inject).
 * @param {object|null} classHierarchies  the `class-hierarchies.json` artifact
 *        ({ hierarchies: { <id>: { classes_by_id, ... } } }), or null.
 * @param {object} [options]
 * @param {"leaf"|"all"} [options.levels="leaf"]  which classes to inject.
 * @returns {{ nodes: object[], links: object[] }} a NEW graph (original + class
 *        nodes + synthetic edges), or the original graph when nothing is added.
 */
export function injectOntologyClassNodes(graph, classHierarchies, { levels = "leaf" } = {}) {
  const hierarchies = classHierarchies?.hierarchies;
  if (!hierarchies || typeof hierarchies !== "object") return graph;

  const baseNodes = graphNodeList(graph);
  const baseEdges = graphEdgeList(graph);

  // Entity ids already present in the graph — has_instance edges are only drawn
  // to members that actually exist in the displayed topology.
  const entityIds = new Set(baseNodes.map((n) => n.id));
  // Track ids already present so re-injection (idempotency) never duplicates a
  // class node, and an existing entity id can never be overwritten by a class.
  const nodeIds = new Set(entityIds);
  // Dedup synthetic edges by directional key so parallel injections collapse.
  const edgeKeys = new Set(
    baseEdges.map((e) => `${e.source} ${e.target} ${e.relation ?? e.relation_type ?? ""}`),
  );

  const addedNodes = [];
  const addedEdges = [];
  const all = levels === "all";

  function pushEdge(source, target, relation, ontologyEdgeKind) {
    const key = `${source} ${target} ${relation}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    addedEdges.push({
      source,
      target,
      relation,
      structural: true,
      ontology_edge_kind: ontologyEdgeKind,
    });
  }

  for (const hierarchy of Object.values(hierarchies)) {
    const classesById = hierarchy?.classes_by_id;
    if (!classesById || typeof classesById !== "object") continue;

    for (const entry of Object.values(classesById)) {
      const id = typeof entry?.id === "string" ? entry.id : null;
      if (!id) continue;
      const leaf = isLeafClass(entry);
      // "leaf" mode only injects leaf classes (those with entity members).
      if (!all && !leaf) continue;

      // Class node (deduped by id; an existing entity id is never clobbered).
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        const name = id.startsWith(CLASS_ID_PREFIX) ? id.slice(CLASS_ID_PREFIX.length) : id;
        addedNodes.push({
          id,
          label: typeof entry.label === "string" && entry.label ? entry.label : name,
          type: "OntologyClass",
          ontology_node_kind: "class",
          ontology_class_id: name,
          level: typeof entry.level === "number" ? entry.level : 0,
        });
      }

      // has_instance: class -> each member entity present in the graph.
      if (leaf && Array.isArray(entry.member_ids)) {
        for (const memberId of entry.member_ids) {
          if (entityIds.has(memberId)) pushEdge(id, memberId, "has_instance", "membership");
        }
      }
    }

    // subclass_of: parent class -> child class. "all" levels only — leaf mode
    // injects no inter-class edges. Drawn only between injected class nodes.
    if (all) {
      for (const entry of Object.values(classesById)) {
        const id = typeof entry?.id === "string" ? entry.id : null;
        if (!id || !Array.isArray(entry.child_ids)) continue;
        for (const childId of entry.child_ids) {
          if (nodeIds.has(childId)) pushEdge(id, childId, "subclass_of", "subclass");
        }
      }
    }
  }

  if (addedNodes.length === 0 && addedEdges.length === 0) return graph;

  return {
    nodes: [...baseNodes, ...addedNodes],
    links: [...baseEdges, ...addedEdges],
  };
}

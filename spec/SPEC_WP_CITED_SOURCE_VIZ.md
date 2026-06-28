# SPEC — WP Cited-Source Visualization

> Implementation-ready spec for the **buildable** lots of the cited-source-visualization WP
> (graphify #24): the citation **data contract** (Lot 0), the **producer** `graphify cite`
> (Lot 1), the **viewer seam** (the contract the shared `@sentropic/pdf-*` lib consumes), and
> the **per-consumer adapter** sketch. Companion to `WP_CITED_SOURCE_VIZ_DECISION_DOSSIER.md`.
>
> Status: DRAFT · Date: 2026-06-23 · graphify @ 0.16.0
> Scope note: **Lot 0 + Lot 1 are being built in parallel by another agent.** This SPEC is the
> formal record and the broader WP frame (seam + adapters + sequence), not a blocker for that build.
> Increment (2026-06-23, principal): the shared viewer must support **five source modalities** —
> **MD · PDF · DOCX · PPTX · image-bbox**. The `OntologyCitation`/`CitedSource` contract is extended
> with `modality?` and `region?` (plus the Lot-0 `quote?`/`confidence?`/`source_location?`), the
> viewer-seam expresses all five (incl. a **quote-less geometry-only image-bbox** citation), and a
> v1 / v2 / v3 per-modality lot sequence is added (image-bbox = **v3, needs detection, excluded from
> Lot 1**). See §"Per-modality lots" and the dossier §8 Source-modality matrix.
> Sign-off: Lot 0 + Lot 1 ship **unilaterally** (graphify-owned). The viewer (Lots 2–3 internals)
> needs **architect sign-off** — its public API is a sibling SPEC; this doc freezes only its *seam*.

---

## 0. Background (verified)

- `OntologyCitation` today (`src/types.ts:500`) is **locator-only**: `source_file`, `source_url?`,
  `page?`, `section?`, `paragraph_id?`, `figure_id?`, `bbox?`. **No `quote`, no `confidence`.**
- `OntologyEvidenceRecord` (`src/types.ts:510`) **already declares** `quote?: string` and
  `confidence?: number`. The omission on `OntologyCitation` is drift, not a boundary.
- `src/citations.ts` already ships the full downstream machinery the producer reuses:
  `CITATIONS_INLINE_TOP_K = 8`, schema `graphify_ontology_citations_v1`, sidecar relpath
  `ontology/citations.json`, `citationKey`, `unionCitations`, `foldCitationsInto`,
  `selectTopCitations`, `aggregateCitations`, `backfillCitations`, `computeCitationSignature`,
  `writeCitationsSidecar`, `reprojectCitationsLLMFree`.
- The producer's job is to fill the **upstream** `node.citations[]` that the finalizer's citation
  stage currently assumes already exists. `cite` only adds grounding; aggregation/tiering is done.

---

## Lot 0 — Contract ratification  *(graphify, unilateral, blocking)*

### 0.1 Type change (additive, backward-compatible)

Add two optional fields to `OntologyCitation` in `src/types.ts`:

```ts
export interface OntologyCitation {
  quote?: string;        // NEW — verbatim passage from the source (already on OntologyEvidenceRecord)
  source_file: string;
  source_url?: string;       // doubles as the image ref for modality:"image"
  source_location?: string;  // NEW (optional) — human-readable modality-encoded locator string
  page?: number | string;    // page (PDF/MD) · slide index (PPTX)
  section?: string;
  paragraph_id?: string;     // paragraph / text-frame / CSV-row id
  figure_id?: string;        // image / figure identifier (modality:"image")
  bbox?: [number, number, number, number];   // [x0,y0,x1,y1] normalized 0..1 page/source fractions (see §0.1.1)
  region?: [number, number, number, number]; // NEW — explicit normalized overlay rect [x0,y0,x1,y1] (image/pdf/pptx)
  modality?:                 // NEW — explicit modality tag (else derived by citationModality())
    | "markdown" | "pdf" | "docx" | "pptx" | "image"
    | "plain-text" | "csv" | "web";
  confidence?: "EXTRACTED" | "INFERRED" | number;  // NEW — grounding strength (string enum or 0..1)
}
```

Notes:
- `quote?` and `confidence?` mirror the fields already on `OntologyEvidenceRecord` — no new concept.
- `confidence` accepts the string enum `{EXTRACTED, INFERRED}` (producer convention: exact match =
  `EXTRACTED`, fuzzy word-run = `INFERRED`) **or** a numeric `0..1`; the viewer/legend treats both.
- `source_location?` is an *optional* convenience string for display; the structured fields
  (`page`/`section`/`paragraph_id`/`bbox`/`region`) remain authoritative. The router derives one from the other.
- **`modality?` and `region?` are NEW (this increment)** for the principal's five-modality set
  (MD · PDF · DOCX · PPTX · image-bbox). Both optional, additive, backward-compatible. `bbox?` and
  `figure_id?` already existed; only `region?` and `modality?` are genuinely new fields.
- **Quote-less citations are legal.** A `modality:"image"` citation carries **no `quote`** and is
  highlighted purely by `bbox`/`region`. The anti-hallucination "quote-is-a-substring" invariant (Lot 1,
  §1.3) applies to **text modalities only**; image citations are gated by detection confidence instead.

#### 0.1.1 `bbox` / `region` semantics for image (and PDF/PPTX region) highlights

- `region?` is the canonical **normalized rectangle** `[x0, y0, x1, y1]` in `0..1` against the source's
  intrinsic dimensions (resolution- and zoom-independent), with top-left origin and `x1 >= x0`,
  `y1 >= y0`. It is the overlay rect the viewer draws.
- Producers SHOULD emit `bbox` and/or `region` as **`[x0, y0, x1, y1]` normalized 0..1** for PDF,
  PPTX slide-image, and image overlays. Legacy producer outputs in `[x,y,w,h]` MUST be converted at
  the adapter/router boundary before entering the graphify `CitedSourceRef` contract.
- `citationKey` identity MUST remain derived from locators **only** (NOT from `modality`/`region`/`quote`)
  so union-dedup is unaffected (see AC0.2).

### 0.2 `source_location` semantics, pinned per modality

| Modality (`modality`) | `source_location` string | Authoritative structured fields |
|---|---|---|
| MD / OCR-markdown (`markdown`) | `"p.{page} · {section}"` | `page`, `section`, `paragraph_id?` |
| native PDF text-layer (`pdf`) | `"p.{page}"` (+ region) | `page`, `bbox?`/`region?` |
| DOCX (`docx`) | `"{section} ¶{paragraph_id}"` | `section?`, `paragraph_id?` (no `page` — Word reflows) |
| PPTX (`pptx`) | `"slide {page}"` | `page` (= slide index), `paragraph_id?`, `region?` |
| IMAGE + bbox (`image`) | `"{figure_id} @ [{x0},{y0},{x1},{y1}]"` | `bbox`/`region` (normalized), `figure_id?`, image ref (`source_url?`/`source_file`); **no `quote`** |
| plain text / novel (`plain-text`) | `"{section}"` (chapter/story) | `section`, `paragraph_id?` |
| registry CSV row (`csv`) | `"row {row_id}"` | `paragraph_id` carries the row id / `row_hash` |
| web (`web`) | `"{url}#{anchor}"` | `source_url`, `paragraph_id?` |

### 0.3 Acceptance criteria (Lot 0)

- AC0.1 — `OntologyCitation` carries `quote?`, `confidence?`, `source_location?`, **`modality?`,
  `region?`**; build type-checks. Image-bbox citations (`modality:"image"`, no `quote`, `bbox`/`region`
  present) are representable and load/aggregate/re-project unchanged.
- AC0.2 — **Backward compatibility**: existing graphs (no `quote`) load, aggregate, re-project, and
  render unchanged. `citationKey` identity is unaffected by the new fields (key still derived from
  locators, NOT from `quote`/`confidence`) — otherwise union dedup would break.
- AC0.3 — SPEC_CITATIONS gets a delta note: the "no verbatim-quote capture" v1 non-goal is reversed;
  `quote?`/`confidence?` are now first-class optional; `graphify_ontology_citations_v1` is declared
  the public cited-source contract.
- AC0.4 — Golden: re-projecting an existing sidecar (`reprojectCitationsLLMFree`) is byte-stable
  before/after the type change for graphs that have no `quote` field.

### 0.4 Sign-off — **graphify unilateral.** Data + schema graphify owns. No external sign-off.

---

## Lot 1 — Producer `graphify cite`  *(graphify, unilateral)*

### 1.1 Command shape

```
graphify cite [path]                          # ground citations into the graph from the corpus
  [--graph <path>]                            # explicit graph.json (default: auto-resolve)
  --mode <heuristic|assistant|api>            # default: heuristic (NO KEY). assistant = LLM-free
                                              #   skill round-trip; api = direct provider (like describe)
  [--modality <auto|markdown|pdf|docx|pptx|plain-text|csv|web>]  # default: auto (from corpus detect).
                                              #   NB: image (bbox) grounding is NOT a cite mode — it
                                              #   needs a detection step (v3); see Per-modality lots.
  [--source <glob>]                           # corpus to ground against (default: converted/ + corpus text)
  [--types <a,b,c>]                           # restrict to node types (person,concept,reference,image,…)
  [--top-k <n>]                               # max citations grounded per node (default 6, ia-aero's value)
  [--min-words <n>]                           # min fuzzy-window length in words (default 5)
  [--min-confidence <EXTRACTED|INFERRED>]     # floor for emitted citations
  [--no-overwrite]                            # additive 2nd pass (ground2.py semantics): fill empty nodes only
  [--citations-top-k <n>]                     # inline-K override (else inherits corpus-type policy)
  [--dry-run]                                 # report coverage (cited/total, by type) without writing
```

Symmetric to `describe`/`label`/`update`: reads `graph.json`, walks nodes, grounds, **unions** into
`node.citations[]`, then runs the existing `aggregateCitations` pass (count + top-K + `citations.json`).

### 1.2 Grounding modes (D3)

**`--mode heuristic` (DEFAULT, no key) — the productized `ground.py` core:**

1. **Parse source into locatable units.** Markdown: `---` or `## Page N` markers → page; `#{1,4}` →
   section; `![](…)` → image with prev/next paragraph context; paragraphs as match units. Plain text:
   chapter heading → section; paragraph units. CSV: row → unit. (Modality-specific parsers; same downstream.)
2. **Normalize** node terms and source text: NFKD deaccent, ligature fold (œ→oe), lowercase, whitespace
   collapse — keeping a **normalized→raw index map** so the emitted `quote` is *raw* text. (radar's
   `normalizeForMatch` / `buildNormalizedIndex` is the production-grade reference.)
3. **Type-aware term selection:** `person` → surname → match section headings first, then body;
   `reference` → the `[N]` marker → match into body; `image` → surrounding prose (`confidence:INFERRED`);
   `quote`-type node → its `rationale` *is* the verbatim quote; `concept|technology|regulation|…` →
   longest specific content word (stopword-filtered); `acronym` (3–6 caps) → whole-word `\b(ACR)\b`.
4. **Window the quote** (`make_quote`): ±~110/210 chars around the match, snap to sentence/quote
   boundaries, ellipsis-pad, cap length; dedup by quote prefix; cap at `--top-k`.
5. **Emit** `{quote, source_file, source_location, page?, section?, paragraph_id?, confidence}`;
   then run existing `aggregateCitations` → `citations.json`.

**`--mode assistant|api` (opt-in) — recall upgrade, verification-gated:**
- Prompt: "for entity X, find passages in this source that ground it; return verbatim quotes + locators."
- **Anti-hallucination gate (mandatory):** every LLM-proposed quote is re-located in the source via
  the same deterministic matcher; if coverage < threshold, it is **dropped, never emitted**. The LLM
  *locates*; the heuristic *confirms*. So even `api` mode cannot fabricate a source — it can only fail
  to find one. Confidence: exact match → `EXTRACTED`; fuzzy word-run → `INFERRED`.

### 1.3 Anti-hallucination invariant (the load-bearing guarantee)

> **A citation MUST NOT be emitted unless its `quote` is a substring (post-normalization) of the
> cited `source_file`.** In heuristic mode this is structural (there is no path to invent text). In
> assistant/api mode it is enforced by the post-hoc verification gate above. This invariant holds in
> all modes and is the single most important correctness property of `cite`.

### 1.4 Modality handling (incl. OCR-markdown page resolution — the aclp-am unblock)

| Modality | Lib | Locator extraction | Tier |
|---|---|---|---|
| MD / OCR-markdown | `markdown-it` (regex markers) | page from `---` / `## Page N` markers; section from `#{1,4}`; paragraph index → `paragraph_id`. **This resolves aclp-am's `page:"unknown"` to real page numbers.** | **v1** |
| native PDF (text layer) | `pdf.js` / existing `pdf-ocr.ts` | page from text-layer; `bbox?`/`region?` when available; else verbatim text-match → highlight rects (in viewer). | **v1** |
| plain text | (none) | section from chapter heading above match; paragraph index → `paragraph_id`; `page = null`. | v1 |
| DOCX | **`mammoth`** (extract) | text-match over mammoth-extracted text; `section` = nearest heading; `paragraph_id` = paragraph index; **no `page`** (Word reflows). Needs a DOCX→text prep step (mirrors `pdf-ocr.ts`). | **v2** |
| PPTX | **pptx text-frame parse** (`js-pptx` / LibreOffice) | per-slide text extracted; `page` = slide index; `paragraph_id` = text-frame index; text-only slides degrade to image (M5). | **v2** |
| **IMAGE + bbox** | **detection (YOLO-style / layout) OR figure-caption heuristic** | **NO text to match** — bbox must come from a detection step or be seeded from existing `*.ocr.json` figure bboxes / caption→figure heuristic. `bbox`/`region` normalized `[x0,y0,x1,y1]`. **NOT in Lot 1.** | **v3 (needs detection)** |
| registry CSV | (none) | row id / `row_hash` carried in `paragraph_id`. | v2 |
| web | (fetch/capture) | `source_url` + anchor. | v2 |

> **Flag:** every text modality (MD, PDF, DOCX, PPTX-text, plain-text, CSV) is grounded by the *same*
> deterministic text-match core (no key, no detection). **Image-bbox (M5) is the sole exception** — it
> needs a YOLO-style / layout **detection** step (or a figure-caption heuristic), so it is sequenced as
> a **later lot (v3)** and is explicitly **excluded from Lot 1**. The `bbox`/`region`/`modality` contract
> fields ship in Lot 0 so the viewer's image path is render-ready before a detector exists.

### 1.5 Union-not-clobber (D4)

`cite` **unions** with existing extraction citations — never replaces:
- Existing LLM-extracted citations are preserved.
- Heuristic-found citations are added iff their `citationKey` (locator identity) is not already present.
- **Reuse** `unionCitations` / `foldCitationsInto` from `src/citations.ts`. After grounding, re-run
  `aggregateCitations` to refresh `citation_count` and the Level-2 sidecar; honor corpus-type policy
  (`code → inlineTopK 3`, `long-document → 8`) and `--citations-top-k`.

### 1.6 Acceptance criteria + golden oracles (Lot 1)

- AC1.1 — **ia-aero 876/876 parity.** `graphify cite --mode heuristic` over ia-aero's
  `converted/pdf/*.md` reproduces the **876/876** grounded matches of the reference `ground.py`
  (`~/src/contribution-ia-aeronautique/.graphify/.cite/ground.py`). Golden = the existing
  `~/.../.graphify/ontology/citations.json`.
- AC1.2 — **mystery byte-parity.** `cite` (re-grounding mode) over mystery `corpus/.../text.txt`
  **byte-reproduces the already-shipped** `~/src/public-domaine-mystery-sagas-pack/.graphify/ontology/citations.json`
  (`{source_file, section, quote}`, 1983 nodes) — exhaustive, contract-verified, public regression oracle.
- AC1.3 — **anti-hallucination.** A test with a node whose label does not appear in the corpus emits
  **zero** citations. An assistant/api test where the LLM is fed a fabricated quote drops it (coverage gate).
- AC1.4 — **union-not-clobber.** A graph with pre-existing extraction citations + a `cite` pass keeps
  all pre-existing citations and only adds non-duplicate locators (verified by `citationKey`).
- AC1.5 — **no-key default.** `cite` with no flags runs fully offline, zero API calls, deterministic
  / byte-stable output across runs.
- AC1.6 — **small fixture.** A 5-node / 2-source fixture (one ocr-markdown, one plain-text) with known
  matches produces byte-identical output, checked in as the unit golden.
- AC1.7 — **page resolution.** An ocr-markdown fixture with `## Page N` markers yields real `page`
  integers (no `"unknown"`), proving the aclp-am unblock path.

### 1.7 Sign-off — **graphify unilateral.** Symmetric to `describe`/`label`. No external sign-off.

---

## Viewer SEAM — the contract `@sentropic/pdf-*` consumes  *(architect sign-off)*

The viewer is a sibling SPEC under architect governance. This section freezes **only the seam**: the
exact citation type the shared lib imports, and the two pure helpers, so producer and viewer stay in lockstep.

### S.1 The consumed type (imported FROM graphify — the lockstep point)

```ts
// @sentropic/pdf-* imports this shape; it is graphify's OntologyCitation (post-Lot-0).
interface CitedSource {
  quote?: string;                 // text to locate + highlight (verbatim) — ABSENT for image-bbox
  source_file: string;            // resolved to bytes/url by the consumer adapter (see below)
  source_url?: string;            // doubles as the image ref for modality:"image"
  source_location?: string;       // display label
  page?: number | string;         // page (PDF/MD) · slide index (PPTX)
  section?: string;
  paragraph_id?: string;          // paragraph / text-frame / CSV-row id
  figure_id?: string;             // image / figure identifier (modality:"image")
  bbox?: [number, number, number, number];    // [x0,y0,x1,y1] normalized 0..1
  region?: [number, number, number, number];  // explicit normalized overlay rect [x0,y0,x1,y1]
  modality?:                      // explicit modality tag — else derived by citationModality()
    | "markdown" | "pdf" | "docx" | "pptx" | "image"
    | "plain-text" | "csv" | "web";
  confidence?: "EXTRACTED" | "INFERRED" | number;  // drives the weak-grounding visual flag
}
```

The viewer **MUST NOT** import any other graphify type and **MUST NOT** depend on graphify at
runtime (so nc-fullstack can adopt it standalone, D10). The citation type is the *only* shared seam,
and it **must express all five principal-specified modalities** — including a **quote-less,
geometry-only image citation** (`modality:"image"`, `bbox`/`region`, no `quote`). The viewer's
highlight path therefore branches on `modality`: text modalities → `findCitationInPage` text-match
highlight; `image` → draw the `bbox`/`region` overlay rect on the image canvas.

### S.2 The two pure helpers (lifted from radar)

```ts
// 1. The deterministic matcher — SHARED between producer (ground) and viewer (locate-for-highlight).
//    One matcher, two callers. Lifted verbatim from radar pdf-citation-match.ts.
function findCitationInPage(
  pageText: string, quote: string,
  opts?: { minWords?: number; minCoverage?: number }
): { start: number; end: number; coverage: number } | null;
//    exact normalized-substring → longest consecutive-word-run fallback.

// 2. The modality router — graphify-owned tiny pure helper the viewer may call.
function citationModality(c: CitedSource):
  "markdown" | "pdf" | "docx" | "pptx" | "image"
  | "plain-text" | "csv" | "web";
//    returns c.modality if set; else derives from source_file suffix
//    (.md → markdown · .pdf → pdf · .docx → docx · .pptx → pptx ·
//     .png|.jpg|.jpeg|.webp → image · .txt → plain-text · .csv → csv · http(s):// → web)
//    + present locator fields (bbox/region & no quote ⇒ image).
```

### S.3 The source-byte resolver (the pluggable seam, D7)

```ts
// The viewer never reads bytes itself. Each consumer supplies a resolver.
type ResolveSource = (c: CitedSource) => Promise<{ bytes: Uint8Array } | { url: string } | { text: string }>;
```

- graphify offline studio → bundled-file resolver (mystery `text.txt`, converted md; works `file://`).
- radar → `/api/documents/raw` CORS-proxied resolver.
- This keeps the viewer **pure** and lets each consumer own auth/layout/streaming.

### S.4 Viewer behavior + parsing libs per modality (architect-owned internals)

Modality dispatcher (`citationModality()` → render path), **all reading the same `CitedSource`**:

| Modality | Render lib (architect vendors into `@sentropic/pdf-*`) | Highlight |
|---|---|---|
| **MD / OCR-markdown** | `markdown-it` / `marked` → HTML | `<mark>` the `findCitationInPage` span; scroll to section/page |
| **PDF** | **`pdf.js`** (render + text layer) — seed from radar `SignalPdfOverlay.svelte` | page jump + text-layer highlight rects; `region` fast-path |
| **DOCX** | **`mammoth`** (→HTML) or **`docx-preview`** (fidelity) | `<mark>` the matched span; scroll to section/¶ |
| **PPTX** | a pptx renderer (`js-pptx` / `pptxjs`) or **slide-image fallback** (rasterize → image) | slide jump (`page`) + `<mark>` text or bbox overlay on slide image |
| **IMAGE + bbox** | **image `<canvas>` + bbox overlay** (no parser) | draw the `bbox`/`region` rect; **no text-match** (v3 — needs producer detection) |
| plain-text | (none) | line-range highlight in `pre`/`code` |
| CSV | (none) | scroll-to-row, highlight cell |

Common to all: hover-card, link highlight↔card, navigate-by-entity, next/prev citation (aclp-am review
workflow). **The architect scopes these render libs into the shared lib;** the producer-side extractors
(mammoth/pptx-text/pdf text-layer, and the M5 detector) are graphify dataprep, mirroring `pdf-ocr.ts`.
**Image-bbox (M5) is the only modality whose grounding needs a detection step — its render path ships
v1-ready (canvas + overlay) but its producer is gated to v3.**

### S.5 Sign-off — **ARCHITECT.** Confirm: (a) lib lives in `@sentropic/pdf-*` under DS governance;
(b) it stays **pure** (no graphify runtime dep); (c) the consumed `CitedSource` type === graphify's
post-Lot-0 `OntologyCitation`, **expressing all five principal modalities incl. quote-less image-bbox**;
(d) seed = lift radar (`SignalPdfOverlay.svelte` + `pdf-citation-match.ts`); (e) **scope the render
libs** the shared lib must vendor: `pdf.js` (PDF), `markdown-it`/`marked` (MD), `mammoth`/`docx-preview`
(DOCX), a pptx renderer `js-pptx`/`pptxjs` or slide-image fallback (PPTX), an image `<canvas>`+bbox
overlay (image); (f) acknowledge **image-bbox grounding needs a producer-side detection step (v3)** —
its render path ships earlier, its data does not, until a YOLO-style/layout detector (or figure-caption
heuristic) exists.

---

## Per-modality lots — the v1 / v2 / v3 sequence  *(principal's full-modality requirement)*

The principal requires the shared viewer to support **MD · PDF · DOCX · PPTX · image-bbox**. These cross
the §"Lot dependency" lots as a **modality dimension**, tiered by what grounding each needs. Producer and
viewer advance modality-by-modality:

| Modality lot | Modality | Tier | Render lib | Producer grounding | New parsing dep |
|---|---|---|---|---|---|
| **LM-1a** | **MD (markdown)** | **v1** | `markdown-it`/`marked` | text-match (`ground.py` core), no key; page from markers | markdown render only |
| **LM-1b** | **PDF (text-layer)** | **v1** | **`pdf.js`** | text-layer text-match, `page` jump; `bbox?`/`region?` if present | `pdf.js` |
| **LM-2a** | **DOCX** | **v2** | `mammoth`/`docx-preview` | mammoth-extracted text-match (DOCX→text prep step) | **`mammoth`** |
| **LM-2b** | **PPTX** | **v2** | `js-pptx`/`pptxjs` or slide-image | per-slide text-match, `page`=slide# (PPTX→text prep step) | **pptx text/render lib** |
| **LM-2c** | PDF geometric bbox | v2 | `pdf.js` | text-layer rects → normalized `region` (enhancement on LM-1b) | — |
| **LM-3** | **IMAGE + bbox** | **v3 — needs detection** | image `<canvas>` + bbox overlay | **YOLO-style / layout detection OR figure-caption heuristic** (seed from existing `*.ocr.json` figure bboxes) — **NOT in Lot 1** | **detection model** |

- **v1 = MD + PDF text-layer**: pure text-match, no key, ships with `graphify cite` heuristic (Lot 1) +
  the Lot 2/3 viewer (mystery plain-text testbed → MD → PDF). Render deps: `markdown-it`, `pdf.js`.
- **v2 = DOCX + PPTX**: *still* text-match (no detection) but needs new prep-time extractors
  (`mammoth`, a pptx text lib) and viewer render libs. Additive, no key.
- **v3 = image-bbox**: the **only** modality needing a **detection** step. Its contract fields
  (`bbox`/`region`/`modality:"image"`) ship in **Lot 0** so the viewer's image render path is ready, but
  its **producer is gated** on a YOLO-style/layout detector or a figure-caption heuristic. **Explicitly
  excluded from Lot 1.**

### Per-modality acceptance criteria

- ACM-1 — **MD (v1):** `graphify cite` over OCR-markdown grounds text-match citations with `page`
  resolved from markers (no `"unknown"`); viewer `<mark>`s the quote. (Subsumes AC1.1, AC1.7.)
- ACM-2 — **PDF (v1):** a PDF text-layer fixture grounds by text-match with correct `page`; viewer
  highlights the text-layer span; `region` fast-path used when present.
- ACM-3 — **DOCX (v2):** a DOCX fixture extracted via mammoth grounds `{quote, section?, paragraph_id}`
  (no `page`); viewer `<mark>`s the span. Backward-compat: graphs without DOCX citations unchanged.
- ACM-4 — **PPTX (v2):** a PPTX fixture grounds `{quote, page=slide#}` per slide; text-only slides
  degrade to image overlay; viewer jumps to the slide.
- ACM-5 — **IMAGE-bbox (v3):** an `modality:"image"` citation with `bbox`/`region` and **no `quote`**
  is representable (Lot 0), loads/aggregates/re-projects unchanged, and the viewer draws the overlay rect
  on the image canvas. **Producer grounding is NOT asserted in Lot 1** — it depends on a detection step
  (or a figure-caption heuristic seeded from `*.ocr.json`); a v3 AC will assert detection→bbox once that
  capability lands.

---

## Per-consumer adapter — contract sketch  *(each consumer owns)*

Each consumer provides exactly: (1) a `ResolveSource` resolver, (2) the wiring from its entity/signal
UI to the viewer, (3) any auth/layout. No graphify coupling required for the viewer itself.

| Consumer | Resolver | Entry-point wiring | Notes |
|---|---|---|---|
| **mystery** | bundled `text.txt` (file://) | EntityPanel `<blockquote>` → "open source" | **Lot 2 testbed** — plain-text, no pdf.js |
| **radar/immo** | `/api/documents/raw` (CORS proxy) | signal card → "view source" | drops bespoke `SignalPdfOverlay` → thin consumer (proves the lib) |
| **ia-aero** | bundled `converted/pdf/*.md` | concept/person/`[N]`/image node → viewer | OCR-markdown |
| **aclp-am** | CSV-row + OCR-page resolver | `assertion_basis` badge → CSV row / OCR page | needs `cite` page-resolution first; next/prev review nav; edge-evidence = v2 driver |
| **nc-fullstack** | bundled tech-doc PDF | source chip → viewer (standalone) | zero graphify coupling; opt-in only |

---

## Lot dependency + sign-off summary

| Lot | Owner | Sign-off | Depends on | Golden oracle |
|---|---|---|---|---|
| **Lot 0** contract (incl. `modality?`/`region?`) | graphify | **unilateral** | — | reproject byte-stability (AC0.4); image-bbox representable (AC0.1) |
| **Lot 1** `graphify cite` (text modalities, **no image-bbox**) | graphify | **unilateral** | Lot 0 | ia-aero 876/876 + mystery sidecar |
| **Lot 2** viewer (mystery plain-text testbed) | architect + graphify | **architect** | Lot 0 (seam); Lot 1 for live data | mystery open-the-book, offline file:// |
| **Lot 3** viewer (PDF / OCR-md) | architect + graphify | **architect** | Lot 2 | radar drops bespoke → thin consumer |
| **Lot 4** adapters | each consumer | per-consumer | Lot 2/3 | aclp-am page-resolved evidence review |
| **LM-1a/1b** MD + PDF (**v1**) | graphify + architect | as Lots 1–3 | Lot 0/1/3 | ACM-1, ACM-2 |
| **LM-2a/2b/2c** DOCX + PPTX (**v2**) | graphify + architect | as v1 | LM-1; mammoth + pptx prep | ACM-3, ACM-4 |
| **LM-3** IMAGE + bbox (**v3 — needs detection**) | graphify + architect | architect | Lot 0 contract; **a detection capability** | ACM-5 (render now; detection-grounding deferred) |

> Lots 0 + 1 are in active parallel build and ship without external sign-off. Lots 2–4 require the
> architect to ratify the viewer governance (S.5) before the shared lib is created.
> **Modality tiering:** v1 (MD + PDF text-layer) and v2 (DOCX + PPTX) are pure text-match (no key, no
> detection); **v3 (image-bbox) needs a YOLO-style/layout detection step and is excluded from Lot 1** —
> only its contract (`bbox`/`region`/`modality`) lands early so the viewer can render image citations.

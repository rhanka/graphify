# SPEC_UAT_TRACK_STATUS


## Refresh — 2026-06-26 after PR #219

- Baseline: `origin/main` `8e1a25c` (`feat(llm): honor direct provider base URL envs (#219)`).
- `track_validate`: h2a Track peer reported **OK, 190 events**; no `.track` corruption.
- `track_report` at this baseline shows the current `graphify-conductor` top-level board: WP0/WP2/WP3/WP6 plus mystery QA in DONE without `--require-accepted`, WP8 in AWAITED, and WP1/WP4/WP5/WP7 plus UAT follow-ups in TO-DO/in-progress.
- `track_status level=wp` is **not the same projection** as `track_report`: it rolls up only items explicitly tagged `role=workpackage`. The older agent-stats / GraphCanvas UAT / descriptions / codex-headless items are role=workpackage; WP0-WP8 are mostly top-level items titled “WPn” but not role=workpackage.
- Therefore the apparent mismatch where agent-stats appears as `DROPPED 0/0` in `status(level=wp)` is a rollup/presentation artifact for leaf workpackages with no active child leaves, not evidence that the shipped agent-stats product was dropped.

### Current focused status

| Area | Current status | Track hygiene / next action |
| --- | --- | --- |
| Agent-stats | Product is shipped and documented (`graphify agent-stats`, `report`, `sync`, `sessions`, `wp`, `project-graph`; PRs #142/#151/#154/#203; README/CHANGELOG current). Track peer notes item `01KTSBMC1HJ1N8XMQYK17CGDAP` has pass evidence at older commit `5b3b1b...` but acceptance is stale at `8e1a25c`. | Re-run/re-stamp acceptance against current main if it remains delivered; avoid interpreting the `status(level=wp)` DROPPED rollup as product state. |
| ACLP-AM | WP4 `01KTKVB57HBGPP7HA9Q25F5FMV` remains `in-progress` / `unknown` in Track. Canevas peer confirms substantial G1/G2/G4 substrate is shipped: Track-G contracts, hierarchy specs, workspace shell/state, ACLP-AM studio routing, sidecar emitters (`hierarchies.json`, `hierarchy-index.json`, `scene-hierarchies.json`, `workspace-manifest.json`) and targeted workspace/hierarchy/studio tests passed (79 + 40 tests). | Do not call DONE until ACLP-AM representative UAT + reviewer/conductor acceptance is attached. Candidate next PR/UAT: wire/verify `scene-hierarchies.json` + `workspace-manifest.json` through studio export/loader with regression tests, run ACLP-AM fixture covering lifecycle statuses (`guessed/candidate/validated/rejected/superseded`) in workspace/reconciliation/evidence routes, then add Track evidence/pass. |
| PDF immo / cited-source visualization | Not currently visible as an active Track WP in `graphify-conductor`; there is an untracked local draft `spec/SPEC_WP_CITED_SOURCE_VIZ.md`. Radar-immo peer reports its source-viewer side is already shipped for raw PDF display and fallback highlight: `GET /api/documents/raw`, safe `rawRef` normalization, evidence/docRefs DTO fields, `SignalPdfOverlay` using internal raw bytes, page opening, bbox highlight or excerpt text-match fallback. Remaining gap is Graphify-side structured cited-source emission. | Import/create a Track item/WP before implementation. Acceptance should require Graphify refs like `[{docSha?, rawRef, sourceUrl?, page, bbox?, excerpt|citation, quoteSpan?}]`, `page` 1-based, `bbox` normalized page fractions compatible with Radar, and Mistral OCR page/block coordinate normalization. Minimum shippable fallback is `rawRef + page + excerpt`; bbox completeness should be tracked when absent. |
| WebGL2 / GraphCanvas | Current active item is WP1 Renderer GraphCanvas rich parity (`01KTKVAF...`) in-progress/unknown. There is also a later role=workpackage GraphCanvas UAT v2 item (`01KTSBMG...`) in-progress/unknown. WebGL2 canary PRs #211/#212/#214/#216/#217 are merged and CI golden-webgl is green; default remains canvas2d. | Choose one canonical Track parent: either make WP1 the role=workpackage parent and nest GraphCanvas UAT v2/WebGL2 leaves below it, or stop using `status(level=wp)` for this board. |

### Delegation wave — 2026-06-26

The conductor deposited h2a inbox mandates to live peers for subagent-style inspection:

- `claude:graphify:f9fbe548d3a5`: agent-stats + WebGL2 status/next PRs/tests.
- `claude:radar-immobilier:218b777ad77d`: PDF immo source-viewer / citation adapter mapping; response received, confirming radar viewer/API is shipped and Graphify structured refs/OCR coordinate normalization are the remaining gap.
- `claude:track:f55247525383`: Track report/status/canevas sanity; response received and summarized above.
- `claude:canevas:b8d847ee443f`: ACLP-AM G1/G2/G4 / hierarchy/workspace alignment; response received, confirming substantial implementation/tests but no Track strict-DONE until representative ACLP-AM UAT + reviewer/conductor acceptance.

### Recommended Track cleanup

1. Decide the canonical hierarchy: either convert WP0-WP8 into actual `role=workpackage` items / parents, or document that `track_report` is the conductor board and `status(level=wp)` is the older workpackage forest.
2. Re-stamp stale delivered items at current baseline (`8e1a25c`): agent-stats, WP0, mystery QA, and any other `done/stale` rows still considered accepted.
3. For ACLP-AM and WebGL/GraphCanvas, attach concrete evidence links and acceptance runs before marking done.
4. For PDF immo/cited-source visualization, first create/import a Track item from the draft spec before code work so the scope appears in report/status.
5. File a Track-side UX issue: `status(level=wp)` should not show a realized leaf workpackage with no children as `DROPPED 0/0`; it should reflect the item bucket or display `n/a/leaf-empty`.

---

## Snapshot

- Role: Graphify WP-UAT-TRACK background status report.
- Source of truth: `track`, workspace `graphify-conductor`.
- Local HEAD after conductor fast-forward: `1a11b68` (`Merge pull request #114 from rhanka/feat/track-f-0819m-dotnet`).
- Strict conductor result: no WP is accepted-DONE at this HEAD under `track report --commit HEAD --decisions --require-accepted`.
- Track changed during this audit from `92` to `107` events; this report reflects the final rerun after those concurrent conductor/subagent events landed.
- Graph freshness: `.graphify/branch.json` reports `stale:false`; no `.graphify/needs_update` was present during this check. Final local code changes were followed by `npx graphify hook-rebuild`: `5639` nodes, `10882` edges, `245` communities.
- Public UAT direction: the public demo route is `/graphify/studio/`; `.graphify/graph.html` is legacy/local, not the public route.

## Track Board

Final `track report --commit HEAD --decisions --require-accepted` returned:

- `AWAITED`: WP8 (`realization=done`, `acceptance=unknown`).
- `DONE`: none under the require-accepted gate.
- `TO-DO`: WP0..WP7. WP0 is `done/stale`; WP2 and WP3 are `done/unknown`; all three are therefore excluded from strict DONE.

Without `--require-accepted`, track places WP0, WP2 and WP3 in `DONE`; WP1, WP4, WP5, WP6 and WP7 in `TO-DO`; WP8 remains `AWAITED`.

| WP | Declared % | Track state | Strict done? | Done / evidence | To do / expected |
| --- | ---: | --- | --- | --- | --- |
| WP0 Conductor integration baseline | 100 | `done` / `stale` | No | Local branch is now fast-forwarded to remote `main` `1a11b68`; latest observed remote CI and Pages were green at that SHA. | Attach final local gate evidence after this conductor commit, then decide whether WP0 can be accepted or remains a baseline row only. |
| WP1 Renderer GraphCanvas rich parity | 90 | `in-progress` / `unknown` | No | `claude:graphify_subagent` reported SG1 merged as PR #113: zoom/pan/reset, connected-dim selection+hover, node tooltip, tests green. Local duplicate renderer edits were intentionally not reapplied. | Final visual UAT and remaining P2/P3 items: keyboard a11y and deeper WebGL GPU parity beyond Canvas2D. |
| WP2 Design-system header compliance | 80 | `done` / `unknown` | No | Header patch restored on top of `1a11b68`; evidence links `studio/src/tests/appHeader.test.js`. Local targeted and full Studio tests pass after fast-forward. | Final desktop/mobile visual UAT and DS audit findings outside the header if they become acceptance criteria. |
| WP3 Graph storage backends | 85 | `done` / `unknown` | No | `claude:graphify_subagent` reported PR #112 merged: `graphify export spanner` DDL/DML artifacts. Dirac added `SPEC_GRAPH_STORAGE_BACKENDS.md` as decision matrix/risk register, not replacement for `SPEC_STORAGE_BACKENDS.md`. | Open decisions remain: PR5 `graphify store` CLI surface, Neo4j replace strategy, Spanner live-adapter scope, SQLite priority. |
| WP4 ACLP-AM ontology hierarchy lifecycle | 45 | `in-progress` / `unknown` | No | ACLP-AM G1+G2 first iteration confirmed; G4 layout pins continue in parallel. | Finish product spec, output schemas, implementation, ACLP-AM UAT and double review before merge. |
| WP5 Track F upstream parity residuals | 80 | `in-progress` / `unknown` | No | `claude:graphify_subagent` reported PR #114 merged: F-0819-M .NET project-file extractor plus paired XML billion-laughs guard. | Next delegated lot: F-0820-0827 outside #996; keep #996 blocked/tracked separately. |
| WP6 Public UAT and mysterypack publication | 60 | `in-progress` / `unknown` | No | Public `/graphify/studio/` returns HTTP 200 and uses relative `./assets/...`; public `/graphify/graph.html` returns 404. | Confirm final domain/mysterypack state and run a real visual smoke on the final URL. |
| WP7 Agent coordination h2a and subagents | 65 | `in-progress` / `unknown` | No | `claude:graphify_subagent` replied on `claude:graphify:17bddf135979`; conductor acknowledged: graphify_subagent owns ontology logic/artefacts/reconciliation, ACLP-AM is reviewer/interface partner, Codex conductor owns shell/UI and gates. | Keep owners, blockers, expected deliverables and liveness current in track; avoid duplicate ACLP-AM workers. |
| WP8 Harness migration out of superpowers rituals | 10 | `done` / `unknown`, `AWAITED` | No | Realization transitioned to done during this audit. Evidence now links `spec/SPEC_CONDUCTOR_HARNESS.md`, with a local pass run recorded as `manual runbook review + track --help validation`. | Resolve the still-awaited/deferred harness direction and set conductor acceptance only after confirming the runbook fully maps track/h2a/verification gates and resume without status loss. |

## Delegation Status

Delegation is effective in track, but not accepted:

- Decision `Delegate graphify WPs by default and keep conductor on integration gates` is `go`.
- Wave 1: WP1 to `codex:codex-graph-lib:84a7f37d306b`; WP2/WP3/WP5 to `claude:graphify:17bddf135979`; WP4 ACLP-AM coordination to `claude:graphify:17bddf135979`; recipients were recorded as not live at deposit time.
- Wave 2: Codex subagents spawned for WP2 Header DS, WP6 Public UAT/mysterypack, WP8 Harness runbook, and WP1 parity tests. A graphify_subagent mandate was also deposited for SG1 renderer P0, SG2 ACLP-AM G1/G2/G4, SG3 storage backends, and SG4 Track F/release residuals.
- Correction recorded during this audit: one `claude:graphify_subagent` workstream only; ACLP-AM is reviewer/interface partner rather than concurrent worker. A mistakenly spawned local ACLP-AM Codex subagent was shut down before deliverable.
- `claude:graphify_subagent` wave2 report received: SG1 renderer PR #113, SG3 storage PR #112, SG4 Track F PR #114 merged; SG2 ontology is read-only so far and awaits incremental ownership confirmation. Conductor sent confirmation for graphify_subagent to own ontology logic/artefacts/reconciliation and take F-0820-0827 outside #996 next.
- Current liveness check: repo `.h2a` returned `[]`; shared h2a returned live `codex:graphify:f64a071db3a8` and `codex:graphify:a30c53dd2294`; `h2a subagents` is not a supported command in this CLI; tmux required elevated read access and confirmed `remote-graphify:0.0 /home/antoinefa/src/graphify node`.

## Blockers And Risks

- WP8 is the only `AWAITED` row. It now has a `done` realization, but remains `acceptance=unknown` and awaited because the harness direction/acceptance has not been closed.
- WP0 is stale, not accepted. Local HEAD is now `1a11b68`, but do not mark WP0 accepted until final conductor commit/CI/pages/graph freshness evidence is recorded.
- WP2 and WP3 have `done` realization with evidence/runs, but no conductor `acceptance=pass`; they should be treated as claimed-done pending review.
- Dirty worktree after fast-forward contains conductor docs/header/track changes only; local renderer duplicates were left in the stash and not reapplied. Source integration gates were rerun locally; CI/pages evidence still has to be attached after the conductor commit if strict track acceptance is required.
- Public `/studio/` is reachable, but the remaining WP6 acceptance is a visual smoke on the final URL plus mysterypack/page synchronization. HTTP 200 alone is not enough.

## Harness Requirements To Keep

- Start every conductor resume with `git status`, current HEAD, `track report --commit HEAD --decisions --require-accepted`, graph freshness, h2a/tmux inventory and CI state.
- Treat `track` as authority; specs, h2a messages, tmux panes, CI and chat are evidence until linked or reflected in track.
- Count DONE only when `realization=done` and `acceptance=pass`, unless the user explicitly waives acceptance.
- For product changes, conductor acceptance must include scope review, diff review, local verification, CI, track acceptance and graph freshness after code changes.
- Public UAT should keep targeting `https://rhanka.github.io/graphify/studio/`; `graph.html` remains a local standalone legacy export.

## Validations Run

- `graphify summary --graph .graphify/graph.json`: ok after rebuild, graph loaded (`5639` nodes, `10882` edges, `245` communities).
- `npx graphify hook-rebuild`: ok after sandbox escalation; known optional grammar warnings for Kotlin, Swift, and Zig fixtures.
- `graphify query "WP0 WP8 conductor UAT track status delegation studio legacy graph.html harness"`: ok, returned graph orientation.
- `track report --commit HEAD --decisions --require-accepted`: ok, strict report described above.
- `track report --commit HEAD --decisions`: ok, non-strict report described above.
- `track validate --commit HEAD`: final rerun `OK: 107 events, integrity + desync clean`.
- `git diff --check`: ok.
- `npm --prefix studio test -- src/tests/appHeader.test.js src/tests/graphCanvasRenderer.test.js src/tests/graphRendererPayload.test.js`: ok, `3` files / `20` tests passed.
- `npm --prefix studio test`: ok, `7` files / `67` tests passed.
- `npm --prefix studio run build`: ok.
- `npm run lint`: ok (`tsc --noEmit`).
- `npm test`: first sandbox run failed on local listen permission (`EPERM 127.0.0.1`); escalated rerun ok, `152` files passed / `1281` tests passed / `9` skipped.
- `npm run build`: ok; `tsup` emitted existing CJS `import.meta` warnings, then `build-studio-app` copied `studio/dist` to `dist/studio-app`.
- `h2a sessions --root .h2a`: ok, empty.
- `h2a sessions --root /home/antoinefa/h2a-workspace/.h2a`: ok, shared live sessions found.
- `h2a subagents --root .h2a`: not available (`Unknown command: subagents`).
- `tmux ls` and `tmux list-panes -t remote-graphify ...`: ok with elevated read access.
- `gh run list --branch main --limit 5` and `gh run view 27177499237 ...`: ok; latest observed remote `main` TypeScript CI and Pages were green at `1a11b68`.
- `curl -I -L https://rhanka.github.io/graphify/studio/`: HTTP 200.
- `curl -I -L https://rhanka.github.io/graphify/graph.html`: HTTP 404.
- No Python server was started.

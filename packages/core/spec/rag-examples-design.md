<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 RAG anchor set — design

_Status: DESIGN (authoring of the golden pairs is a follow-up). Revised 2026-06-30._

## Why this exists

The reported failure: asked for **c1-t9, Task Model 3 (two-part EBSR)**, the generator drifts to
TM4 (hot-text) / TM5 (short-text). The instruction-side fixes (the served collision warning, the
generated per-target task-model table, and the compiler's `task-model` guard) make the rule
explicit and enforceable. RAG adds the third leg: a **positive worked example** of the exact shape
the request wants, so retrieval biases generation toward it instead of toward the more salient
T4/T11 numbering.

The drift is between **siblings within one target** (t9 EBSR vs hot-text vs short-text). An abstract
per-target renumbering rule is exactly what an LLM under-weights; a retrieved exemplar of
"c1-t9, TM3, two-part EBSR" is the strongest available anchor. The embedding infra already supports
this — `src/embedding.ts` emits `target:c1-t9`, `item:ebsr`, `shape:two-part`, and now
`task-model:3`; `extractQueryFacets` pulls target + item type + an explicit/derived task-model
number from the query. The corpus just lacks positive output-side exemplars.

## What the set should be

1. **Paired golden examples (prompt → canonical L0175 program), not prompt-only.** `examples.md` is
   prompt-only; disambiguating siblings needs the *output* shape. Store paired examples the console
   RAG can index via `buildEmbeddingArtifacts({ prompt, code })` — e.g. a `spec/examples/` directory
   of `<id>.gc` programs each with a sibling `<id>.prompt.md`, or an L0175 `training_examples.json`
   array of `{ prompt, code }`.

2. **Contrastive siblings — same passage, vary only the task model — for every target** (parity, not
   t9-only). Holding the passage + dimension fixed and changing only the task model makes the
   vectors/facets separate cleanly on item type / shape, so retrieval discriminates instead of
   blurring:

   | Target | Task models to anchor (item type) |
   |--------|-----------------------------------|
   | `c1-t9` (validate first — the observed failure) | tm3 ebsr · tm4 hot-text · tm5 short-text · tm1 multiple-choice · tm2 multi-select |
   | `c1-t8`, `c1-t10` | tm1 multiple-choice · tm2 multi-select · tm3 hot-text |
   | `c1-t4`, `c1-t11` | tm1 ebsr · tm2 hot-text · tm3 short-text |

   Every target × task-model cell gets ≥1 anchor. No target ships without anchors. (Source of truth
   for which cells exist: `spec/targets.json` → `targets.<id>.taskModels`.)

3. **Tagged with the design signature `embedding.ts` emits** — `target:<t>`, `item:<type>`,
   `shape:two-part|single-part`, `dimension:<d>`, `standard:<s>`, `dok:<d>`, and **`task-model:<n>`**
   (derived from target + item type via `targets.json`). The console filters/boosts on these facets;
   `target:c1-t9` + `task-model:3` together select the EBSR exemplar over its siblings.

4. **Each prompt phrased both ways** — by number ("task model 3", "TM3") **and** by item type
   ("two-part EBSR") — so the query embedding and `extractQueryFacets` match however the client
   phrases it. `extractQueryFacets` already extracts an explicit number and derives one from
   target + item type; the paired prompts should exercise both spellings.

## Build / validation hooks (when authoring lands)

- Generate each anchor's signature with `buildEmbeddingArtifacts({ prompt, code })` and assert it
  carries the expected `target:` / `item:` / `shape:` / `task-model:` tags (mirror the worked
  "Mara" assertions in `test/embedding.spec.ts`).
- Every anchor program must compile clean through the core compiler (reuse the `compile` harness in
  `test/task-model.spec.ts`), and should author `task-model tmN` so the compiler's per-target guard
  double-checks the intended item type.
- A coverage check: every `targets.<id>.taskModels` cell has at least one anchor.

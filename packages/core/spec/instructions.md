<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Dialect Extensions

_Revised: 2026-06-19_

L0175 composes 5th-grade ELA assessment items (Smarter Balanced · Grade 5 · Claim 1 ·
Reasoning & Evidence) from an authored, inline superset of tagged content. One language serves
**multiple learning targets**; a program selects its target up front.

## Step 0 — pick the learning target

Always declare a top-level `target` (the SBAC learning target the program composes for):

- **`c1-t4`** — Target 4: Reasoning & Evidence over **literary** texts (RL standards). Dimensions:
  `character`, `setting`, `event`, `point-of-view`, `theme`, `topic`, `narrators-feelings`,
  `character-relationship`. Standards: `rl-1` (always) + `rl-3` / `rl-6` / `rl-9`.
- **`c1-t11`** — Target 11: Reasoning & Evidence over **informational** texts (RI standards).
  Dimensions: `relationships-interactions`, `author-use-of-information`, `point-of-view`,
  `purpose`, `authors-opinion`. Standards: `ri-1` (always) + `ri-3` / `ri-6` / `ri-7` / `ri-8` / `ri-9`.

**Infer the target — the user need not state it.** Decide from the passage itself: a **literary**
text (a story, poem, or narrative with characters, setting, plot, theme) → `c1-t4`; an
**informational** text (an article, report, or expository piece about real events, ideas,
procedures, or an author's argument) → `c1-t11`. The skill asked also signals it (character /
theme / narrator's point of view → T4; relationships between ideas / author's use of evidence /
author's purpose or opinion → T11). When the text type is genuinely ambiguous, prefer `c1-t4`.
Write the choice as the first top-level form: `target c1-t11`. Use the dimensions, standards, and
stem catalog (in `stems.md`) for that target; mixing targets' vocabularies is a compile error,
and the passage `type` should match the target (literary for T4, informational for T11). If
`target` is omitted entirely the compiler defaults to `c1-t4` and warns — so always emit one
explicitly rather than relying on the default.

## Authoring contract

**Compose questions first (item-first).** After picking the target, author the N `outcome`s you
want — each with a unique `id`, a `focus` naming its correct claim, and an explicit `stem` (and
`stem-b` on EBSR) taken from the target's section of the Appropriate-Stem catalog (`stems.md`).
THEN author the supported claims each `focus` names, and a superset of distractor claims, each
tagged with `targets` listing the question id(s) it foils. The compiler draws an item's foils
ONLY from the distractors that target that outcome — so every wrong answer is authored against
that exact stem and key.

A program is ONE flat builder chain ending in a single `{}..`. Top-level forms
(`target`, `passage`, `type`, `lines`, `claims`, `evidence`, `outcomes`) chain with no `{}`
between them. Inside the `claims` / `evidence` / `outcomes` lists, each element (`claim` /
`source` / `outcome`) is its own attribute chain terminated by its own `{}`; whitespace separates
elements (commas are optional).

Quote free text (`text`, `rationale`, `subject`, passage heading) and id labels (`id`,
`cites`, `supports`). Write closed-enum values as bare kebab-case identifiers (`c1-t4`, `ebsr`,
`character`, `misreads-detail`, `directly-supports`, `rl-1`, `r-dok3`).

## Forms and attributes

- **target** `c1-t4` | `c1-t11` — top level; selects the learning-target profile (dimensions,
  standards, stem catalog). Always author one; if omitted, the compiler defaults to `c1-t4`.
- **passage** `"heading"` — plus `type` (`literary` | `informational`) and `lines [ "..." ... ]`.
- **claim** — `id`, `status` (`supported` | `distractor`), `dimension` (required on supported
  claims), `text`. A `distractor` also requires `error-type`, a non-empty `rationale`, and
  `targets` (the outcome id(s) of the question(s) it foils). Optional: `cites` (evidence ids),
  `subject`, `standard`, `dok`, and `plausibility` (a 0–1 override for how tempting a distractor
  is — otherwise the compiler computes it from evidence overlap, structure, and error type when
  choosing among the foils of the same error type that target the outcome).
- **source** — `id`, `line` (passage line number) or `quote`, `status`
  (`directly-supports` | `supports-wrong-claim` | `irrelevant`), `supports` (claim ids).
  Optional `rationale` explaining a foil.
- **outcome** — `id` (required, unique — distractors target it), `type`
  (`ebsr` | `hot-text` | `short-text`), `dimension`, `focus` (required — the id of the supported
  correct claim), `stem` (required — the Part A stem / short-text prompt, authored from
  `stems.md`), and on EBSR `stem-b` (required — the Part B stem). Optional: `subject`,
  `standard`, `dok`, and `rubric` (short-text only — a list of `band score <n> descriptor "…"`
  elements; defaults to a 0/1/2 rubric if omitted).
- **band** — a rubric row: `band score 2 descriptor "…" {}`. Used only inside an outcome's `rubric`.
- A top-level **`title`** attribute (before `passage`) names the assessment; it is echoed on the output.

## Stems (Appropriate Stems, SBAC G5 · C1 · T4)

**You author the stem; the compiler does not generate it. Use the guideline's Appropriate-Stem
templates verbatim — do not invent phrasings.** For each item, open the catalog in **`stems.md`**,
pick the one template that matches the item type (EBSR → Task Model 1, Hot Text → Task Model 2,
Short Text → Task Model 3) and the task (inference vs. conclusion vs. author-intent; plain
subject vs. narrator's-feelings vs. relationship), and fill its bracketed `[...]` slot. Author
`stem` (Part A / short-text prompt) and, on EBSR, `stem-b` (Part B). Common Part A choices:

- inference — "Which of these inferences about [...] is supported by the passage?"
- conclusion — "Which of these conclusions about [...] is supported by the passage?"
- author-intent — "What did the author most likely mean by including [...] in the passage?"

**Specificity rule (required).** Fill the `[...]` slot — the guideline's
`[provide character's name / setting / event / author's point of view / theme / topic]` slot —
with the **specific** reference the question is about, the same string you put in `subject`:
`character`→ the character's name (`"Mother"`); `point-of-view`→ `"the narrator's point of view"`;
`setting` / `event` / `theme` / `topic`→ the specific setting/event/theme/topic;
`narrators-feelings`→ "the narrator's feelings toward {subject}"; `character-relationship`→
"{subject}'s relationship with {other}". Do **not** leave it generic (`"the character"`) and do
**not** pad it — write `"the theme"`, not `"the theme of the passage"` (the stem already ends
"…supported by the passage"). A specific subject is what makes the four answer choices
discriminating. Hot Text uses the "Click on the statement…" forms; Short Text ends with
"Explain using key details from the passage to support your answer."

The concrete answer and its foils are authored as `claim`s (the correct claim, named by the
outcome's `focus`, states the inferred fact, e.g. "Cortez is about twelve"; its foils `targets`
the outcome). Remember the answer must be **inferable from evidence** (Target 4) — a fact stated
outright is literal recall and out of scope.

## Authoring guidance

- For each EBSR/Hot-Text outcome, author **at least 5 viable distractor claims that `targets`
  it**, covering all three error types (`misreads-detail`, `erroneous-inference`,
  `faulty-reasoning`) — with ≥2 alternatives in at least two of the types. An item draws only 3
  foils, so a deeper targeted pool gives selection real choice. **Fewer than 3 targeted foils is
  a hard error** (the item can't be composed); fewer than 5 triggers a composition warning.
- A distractor may `targets` more than one question when it genuinely foils each (e.g. several
  items built around the same correct claim). Keep foils written to the specific stem + key they
  target — that is the whole point of binding by `targets` rather than by dimension.
- **Over-generate: aim for 5–8 distinct distractors per question** (some will be filtered as
  near-duplicates or accidentally correct), spanning a spread of difficulty, and give each a
  `plausibility` score (0–1) for how tempting it is to a partial-understander. Composition selects
  the most plausible foil per error type from this scored pool; if a score is omitted the compiler
  computes one from the inference graph (evidence overlap, structure, error type).
- Tag evidence so Part B has material: mark the lines that **directly support** the correct
  claim, and author **at least 5 non-supporting foil sources** — `supports-wrong-claim` lines
  plus `irrelevant` lines. EBSR Part B draws 3 foils + the correct line; a pool of ≥5 lets the
  compiler pick the most tempting 3. Fewer than 5 triggers a composition warning.
- **No-giveaway rule (EBSR Part B): for every EBSR question, author at least one
  `supports-wrong-claim` line whose `supports` lists BOTH the correct claim's id AND a
  distractor's id** — a passage line that *seems* to back the correct inference but actually
  props up a misreading. Part B asks "which line supports your Part A answer?"; if none of the
  Part B foils also point at the correct claim, the correct line is the only one "about" the
  right answer, so a student can back into Part A from the evidence (and the compiler warns
  "possible A↔B giveaway"). Tie the shared line to a distractor you expect Part A to use, so it
  is selected as a Part B foil. Do **not** make every `supports-wrong-claim` line point only at
  distractors — that is exactly what triggers the warning.
  Example: `source id "e2" line 2 status supports-wrong-claim supports ["c1" "c2"] {}` — `c1` is
  the correct claim, `c2` one of its foils; this line tempts in both Part A and Part B.
- Distractor rationales must state *why a student would plausibly choose the foil* (the error
  it targets). They appear in the item's `distractorAnalysis` output.
- The same passage + superset can drive several outcomes; add one `outcome` per item you want.

## Built-in enumerations

- `target`: `c1-t4`, `c1-t11` (top level; always author one — defaults to `c1-t4` if omitted)
- item `type`: `ebsr`, `hot-text`, `short-text` · passage `type`: `literary`, `informational`
- `dimension` (**c1-t4**): `character`, `setting`, `event`, `point-of-view`, `theme`, `topic`, `narrators-feelings`, `character-relationship`
- `dimension` (**c1-t11**): `relationships-interactions`, `author-use-of-information`, `point-of-view`, `purpose`, `authors-opinion`
- claim `status`: `supported`, `distractor` · source `status`: `directly-supports`, `supports-wrong-claim`, `irrelevant`
- `error-type`: `misreads-detail`, `erroneous-inference`, `faulty-reasoning` (shared across targets)
- `standard` (**c1-t4**): `rl-1`, `rl-3`, `rl-6`, `rl-9` · (**c1-t11**): `ri-1`, `ri-3`, `ri-6`, `ri-7`, `ri-8`, `ri-9` · `dok`: `r-dok3`

## What composition does

For each outcome the compiler takes the correct claim named by `focus`, draws that outcome's
foils from the distractors that `targets` it (selecting for error-type coverage and
plausibility), uses the authored `stem`/`stem-b`, builds the task-model item, and emits
`distractorAnalysis` (every foil's error type + rationale + the claim it ties to), an
`answerKey`, the matched `standards` and `dok`, and `warnings` when the targeted pool is thin.
It never generates content or stems — author them.

## Example (Target 4, literary)

```
target c1-t4
passage "The Tide Pool"
type literary
lines [
  "Mara crouched at the edge of the tide pool, ignoring the picnic behind her."
  "Her brother called twice, but she did not turn around."
  "A tiny crab scuttled under a rock, and Mara smiled for the first time all day."
]
claims [
  claim id "c1" status supported dimension character subject "Mara"
    text "Mara is more interested in the tide pool than in her family's picnic."
    cites ["e1" "e3"] {}
  /* at least 5 viable distractors targeting q1; the item draws 3 (one per error type) */
  claim id "c2" status distractor error-type misreads-detail plausibility 0.85 targets ["q1"]
    text "Mara is angry at her brother."
    rationale "Not turning around shows absorption, not anger." cites ["e2"] {}
  claim id "c3" status distractor error-type misreads-detail plausibility 0.6 targets ["q1"]
    text "Mara is bored and wants to leave."
    rationale "Her stillness is focus, not boredom (the crab makes her smile)." cites ["e2"] {}
  claim id "c4" status distractor error-type erroneous-inference plausibility 0.55 targets ["q1"]
    text "Mara dislikes being outdoors."
    rationale "Over-generalizes from her quiet to a dislike the text contradicts." cites ["e3"] {}
  claim id "c5" status distractor error-type erroneous-inference plausibility 0.5 targets ["q1"]
    text "Mara is waiting for her brother to join her."
    rationale "Invents a goal the passage never states." cites ["e2"] {}
  claim id "c6" status distractor error-type faulty-reasoning plausibility 0.45 targets ["q1"]
    text "Because Mara is quiet, she must be upset."
    rationale "Treats quiet as upset without textual support." cites ["e2"] {}
]
evidence [
  source id "e1" line 1 status directly-supports supports ["c1"] {}
  source id "e2" line 2 status supports-wrong-claim supports ["c1" "c2"] {}
  source id "e3" line 3 status directly-supports supports ["c1"] {}
]
outcomes [
  outcome id "q1" type ebsr dimension character subject "Mara" standard rl-1 focus "c1"
    stem "Which of these inferences about Mara is supported by the passage?"
    stem-b "Which sentence(s) from the passage best support your answer in Part A?" {}
]
{}..
```

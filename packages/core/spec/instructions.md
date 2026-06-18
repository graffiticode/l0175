<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Dialect Extensions

_Revised: 2026-06-18_

L0175 composes 5th-grade ELA assessment items (Smarter Balanced · Grade 5 · Claim 1 ·
Target 4: Reasoning & Evidence) from an authored, inline superset of tagged content.

## Authoring contract

A program is ONE flat builder chain ending in a single `{}..`. Top-level forms
(`passage`, `type`, `lines`, `claims`, `evidence`, `outcomes`) chain with no `{}` between
them. Inside the `claims` / `evidence` / `outcomes` lists, each element (`claim` / `source`
/ `outcome`) is its own attribute chain terminated by its own `{}`, and elements are
separated by commas.

Quote free text (`text`, `rationale`, `subject`, passage heading) and id labels (`id`,
`cites`, `supports`). Write closed-enum values as bare kebab-case identifiers (`ebsr`,
`character`, `misreads-detail`, `directly-supports`, `rl-1`, `r-dok3`).

## Forms and attributes

- **passage** `"heading"` — plus `type` (`literary` | `informational`) and `lines [ "..." ... ]`.
- **claim** — `id`, `status` (`supported` | `distractor`), `dimension` (required on supported
  claims), `text`. A `distractor` also requires `error-type` and a non-empty `rationale`.
  Optional: `cites` (evidence ids), `subject`, `standard`, `dok` (used to rank the correct claim),
  and `plausibility` (a 0–1 override for how tempting a distractor is — otherwise the compiler
  computes it from evidence overlap, dimension match, structure, and error type when choosing
  among foils of the same error type).
- **source** — `id`, `line` (passage line number) or `quote`, `status`
  (`directly-supports` | `supports-wrong-claim` | `irrelevant`), `supports` (claim ids).
  Optional `rationale` explaining a foil.
- **outcome** — `type` (`ebsr` | `hot-text` | `short-text`), `dimension`, optional `subject`,
  `standard`, `dok`, `focus` (force a correct-claim id), `mode`
  (`inference` (default) | `conclusion` | `author-intent`), `other` (second subject, for
  `character-relationship` stems), `stem` (override the auto-generated Part A stem / prompt),
  `stem-b` (override Part B), and `rubric` (short-text only — a list of
  `band score <n> descriptor "…"` elements; defaults to a 0/1/2 rubric if omitted).
- **band** — a rubric row: `band score 2 descriptor "…" {}`. Used only inside an outcome's `rubric`.
- A top-level **`title`** attribute (before `passage`) names the assessment; it is echoed on the output.

## Stems (Appropriate Stems, SBAC G5 · C1 · T4)

The compiler **auto-generates the guideline's Appropriate Stem** for each item from
`type` + `mode` + `dimension` (+ `subject`/`other`) — you do not normally write a stem. Pick
`mode` to match the task:

- `inference` (default) — "Which of these inferences about {about} is supported by the passage?"
- `conclusion` — "Which of these conclusions about {about} is supported by the passage?"
- `author-intent` — "What did the author most likely mean by including {about} in the passage?"

`{about}` is resolved from the dimension: `character`→ the subject; `narrators-feelings`→
"the narrator's feelings toward {subject}"; `character-relationship`→ "{subject}'s
relationship with {other}"; `point-of-view`→ "the author's point of view"; `setting` /
`event` / `theme` / `topic`→ the matching phrase. Hot Text uses the "Click on the statement…"
forms; Short Text uses "…? Explain using key details from the passage to support your answer."
Set `stem` only to pin an exact phrasing the auto-stem doesn't produce.

**`subject` is the guideline's "[provide character's name / setting / event / other reference]"
slot, and it takes any noun phrase — not just a name.** To point the item at a specific aspect
of the text, put that phrase in `subject`: e.g. `subject "Cortez's age"` →
"Which of these inferences about Cortez's age is supported by the passage?"; likewise
`"the letter Cortez burned"`, `"the journey across the mountains"`, `"Cortez's motive"`. The
concrete answer and its foils are authored as `claim`s (the correct claim states the inferred
fact, e.g. "Cortez is about twelve"); the `subject` phrase only frames the stem. Remember the
focus must be **inferable from evidence** (Target 4) — a fact stated outright is literal recall
and out of scope.

## Authoring guidance

- Provide **at least one supported claim per dimension** you target, and for EBSR/Hot-Text
  author **at least 5 viable distractor claims** covering all three error types
  (`misreads-detail`, `erroneous-inference`, `faulty-reasoning`) — with ≥2 alternatives in at
  least two of the types. An item draws only 3 foils, so a deeper pool gives selection real
  choice; fewer than 5 viable distractors triggers a composition warning.
- **Over-generate: aim for 5–8 distinct distractors** (some will be filtered as near-duplicates
  or accidentally correct), spanning a spread of difficulty, and give each a `plausibility`
  score (0–1) for how tempting it is to a partial-understander. Composition selects the most
  plausible foil per error type from this scored pool; if a score is omitted the compiler
  computes one from the inference graph (evidence overlap, dimension match, structure, error type).
- Tag evidence so Part B has material: mark the lines that **directly support** the correct
  claim, give a few **supports-wrong-claim** foils (ideally also tied to the correct claim so
  they plausibly support more than one Part A option), and a couple of **irrelevant** lines.
- Distractor rationales must state *why a student would plausibly choose the foil* (the error
  it targets). They appear in the item's `distractorAnalysis` output.
- The same passage + superset can drive several outcomes; add one `outcome` per item you want.

## Built-in enumerations

- item `type`: `ebsr`, `hot-text`, `short-text`
- `dimension`: `character`, `setting`, `event`, `point-of-view`, `theme`, `topic`, `narrators-feelings`, `character-relationship`
- claim `status`: `supported`, `distractor` · source `status`: `directly-supports`, `supports-wrong-claim`, `irrelevant`
- `error-type`: `misreads-detail`, `erroneous-inference`, `faulty-reasoning`
- `standard`: `rl-1`, `rl-3`, `rl-6`, `rl-9` · `dok`: `r-dok3`

## What composition does

The compiler selects the best-fitting supported claim per outcome, builds the task-model
item, and emits `distractorAnalysis` (every foil's error type + rationale + the claim it
ties to), an `answerKey`, the matched `standards` and `dok`, and `warnings` when the pool is
thin or an outcome cannot be satisfied. It never generates content — author it.

## Example

```
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
    cites ["e1" "e3"] {},
  /* at least 5 viable distractors; the item draws 3 (one per error type, most plausible first) */
  claim id "c2" status distractor error-type misreads-detail plausibility 0.85
    text "Mara is angry at her brother."
    rationale "Not turning around shows absorption, not anger." cites ["e2"] {},
  claim id "c3" status distractor error-type misreads-detail plausibility 0.6
    text "Mara is bored and wants to leave."
    rationale "Her stillness is focus, not boredom (the crab makes her smile)." cites ["e2"] {},
  claim id "c4" status distractor error-type erroneous-inference plausibility 0.55
    text "Mara dislikes being outdoors."
    rationale "Over-generalizes from her quiet to a dislike the text contradicts." cites ["e3"] {},
  claim id "c5" status distractor error-type erroneous-inference plausibility 0.5
    text "Mara is waiting for her brother to join her."
    rationale "Invents a goal the passage never states." cites ["e2"] {},
  claim id "c6" status distractor error-type faulty-reasoning plausibility 0.45
    text "Because Mara is quiet, she must be upset."
    rationale "Treats quiet as upset without textual support." cites ["e2"] {}
]
evidence [
  source id "e1" line 1 status directly-supports supports ["c1"] {},
  source id "e2" line 2 status supports-wrong-claim supports ["c1" "c2"] {},
  source id "e3" line 3 status directly-supports supports ["c1"] {}
]
outcomes [ outcome type ebsr dimension character subject "Mara" standard rl-1 {} ]
{}..
```

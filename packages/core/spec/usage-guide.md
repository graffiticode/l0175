<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Usage Guide

_Revised: 2026-06-18_

Agent-facing guide for authoring L0175 programs. Read this before composing a `create_item` prompt or an `update_item` modification.

## Overview

L0175 is a content-composition language for 5th-grade English Language Arts assessment items, conforming to the Smarter Balanced spec ELA · Grade 5 · Claim 1 (Reading) · Target 4: Reasoning & Evidence. It is **item-first**: you compose the questions (`outcome`s) first — each with a unique `id`, a `focus` naming its correct claim, and an explicit `stem` (and `stem-b` on EBSR) instantiated from the guideline's Appropriate-Stem catalog (`stems.md`) — then author the supported `claim`s and a *superset* of distractor `claim`s, each tagging the question(s) it foils via `targets`, plus evidence `source`s. The compiler then *composes* each outcome deterministically: it takes the correct claim from `focus`, draws that question's foils ONLY from the distractors that `targets` it, uses the authored stem, and assembles a finished item in one of three task models: `ebsr` (two-part evidence-based selected response), `hot-text` (select-text), or `short-text` (constructed response). One passage + superset can yield several items, each with its own bound foil set. The compiler performs no generation and no stem synthesis — it selects, validates against the guideline, and warns when a question's pool falls short. Distractors are tagged by the SBAC error taxonomy (Part A: `misreads-detail`, `erroneous-inference`, `faulty-reasoning`; Part B: `supports-wrong-claim`, `irrelevant`), each carrying a rationale; composition picks foils for error-type coverage and couples Part B evidence to the claims it plausibly supports. **For each EBSR/Hot-Text question author at least 5 viable distractors that `targets` it (aim for 5–8, over-generating since some are filtered as near-duplicates or accidentally correct) — covering all three error types with ≥2 alternatives in at least two of them, and giving each a `plausibility` score (0–1). An item draws only 3 foils, so a richer targeted pool yields stronger items; fewer than 3 targeting a question is a hard error, fewer than 5 a warning. Likewise, for EBSR Part B author at least 5 non-supporting evidence lines (`supports-wrong-claim` + `irrelevant`) so the compiler can choose the most tempting 3 foil options. No-giveaway rule: at least one of those `supports-wrong-claim` lines must list BOTH the correct claim's id AND a distractor's id in its `supports` (a line that seems to support the right answer but actually backs a misreading) — otherwise the correct evidence line stands alone, Part B telegraphs Part A, and the compiler warns "possible A↔B giveaway." Do not make every wrong-claim line point only at distractors.**

When composing a request, author the passage and outcomes (with their stems) first, then the inference graph (supported claims, then the targeted distractors), then the evidence. The program is one flat builder chain: top-level forms (`passage`, `type`, `lines`, `claims`, `evidence`, `outcomes`) thread a single continuation and the whole program ends with one `{}..`. Inside the `claims`/`evidence`/`outcomes` lists, each element (`claim`/`source`/`outcome`) is its own attribute chain terminated by its own `{}`. Attribute values that are free text (`text`, `rationale`, `subject`, `stem`, the passage heading) or id labels (`id`, `focus`, `cites`, `supports`, `targets`) are quoted strings; closed-enum values (`type`, `status`, `dimension`, `error-type`, `standard`, `dok`) are bare kebab-case identifiers (e.g. `ebsr`, `directly-supports`, `rl-1`).

In scope: a single literary passage; an inference graph of supported and distractor claims plus evidence sources tagged by role; the eight inference dimensions; the three task models; standards rl-1/rl-3/rl-6/rl-9 and DOK r-dok3. Out of scope: targets, claims, or grades beyond G5·C1·T4; dual-text stimuli; compile-time LLM generation; auto-scoring of short text; cross-language composition.

## Vocabulary Cues

Say this to get that:

- **Passage** — `passage "Title"` sets the heading; `type literary` (or `informational`); `lines [ "..." "..." ]` are the passage sentences, auto-numbered from 1.
- **Outcome** — the question, composed first. `outcome id "q1" type ebsr dimension character subject "Mara" focus "c1" stem "Which of these inferences about Mara is supported by the passage?" stem-b "Which sentence(s) from the passage best support your answer in Part A?" {}`. `id` is the handle distractors target; `focus` names the correct claim; `stem` (and `stem-b` on EBSR) come from `stems.md`. Vary `type` (`ebsr` / `hot-text` / `short-text`) for different task models.
- **Claim** — a candidate inference statement. Supported: `claim id "c1" status supported dimension character subject "Mara" text "..." cites ["e1" "e2"] {}`. A distractor adds `error-type`, a required `rationale`, and `targets` (the question id(s) it foils): `claim id "c2" status distractor error-type misreads-detail targets ["q1"] text "..." rationale "..." cites ["e2"] {}`.
- **Evidence source** — a passage line tagged by its support role. `source id "e1" line 1 status directly-supports supports ["c1"] {}`. Statuses: `directly-supports`, `supports-wrong-claim`, `irrelevant`. An optional `rationale` explains a foil.
- **Dimensions** — `character`, `setting`, `event`, `point-of-view`, `theme`, `topic`, `narrators-feelings`, `character-relationship`.
- **Program terminator** — top-level forms chain with no `{}` between them; the program ends with a single `{}..`.

## Example Prompts

- *"Write an EBSR item about the main character's motivation in a short story about a girl at a tide pool."* → `ebsr`
- *"From the same passage, also produce a short-text constructed-response item and a hot-text item."* → `short-text`, `hot-text`
- *"Add a faulty-reasoning distractor that mistakes the character's quiet focus for fear."* → distractor `claim`
- *"Make an item about the narrator's point of view, standard rl-6."* → `outcome` with `dimension point-of-view`

## Out of Scope

- **Other targets / grades / claims** — L0175 covers only G5 · Claim 1 · Target 4. Other targets belong in their own dialects.
- **Dual-text stimuli** — a single literary passage only in this version.
- **Compile-time generation** — the compiler selects and validates authored content; it does not invent claims, distractors, or evidence.
- **Auto-scoring** — short-text responses are hand-scored against the rubric; the compiler emits the rubric only.
- **Cross-language composition** — each item runs in exactly one dialect.

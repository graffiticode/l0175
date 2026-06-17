<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Usage Guide

Agent-facing guide for authoring L0175 programs. Read this before composing a `create_item` prompt or an `update_item` modification.

## Overview

L0175 is a content-composition language for 5th-grade English Language Arts assessment items, conforming to the Smarter Balanced spec ELA · Grade 5 · Claim 1 (Reading) · Target 4: Reasoning & Evidence. The language is about content, not question types: a program authors, inline, a *superset* of tagged content for one literary passage — candidate inference/conclusion `claim`s and evidence `source`s, each tagged with its role and metadata — plus one or more intended `outcome`s. The compiler then *composes* each outcome deterministically, selecting from the superset the subset that best fits and assembling a finished item in one of three task models: `ebsr` (two-part evidence-based selected response), `hot-text` (select-text), or `short-text` (constructed response). One superset can yield several items by varying the outcome, so author rich content once and let composition project it per task model. The compiler performs no generation — it selects, validates against the guideline, and warns when the pool falls short. Distractors are authored and tagged by the SBAC error taxonomy (Part A: `misreads-detail`, `erroneous-inference`, `faulty-reasoning`; Part B: `supports-wrong-claim`, `irrelevant`), each carrying a rationale; composition picks distractors for error-type coverage and couples Part B evidence to the claims it plausibly supports. **Generate a *range* of distractors — more than the three option slots — spanning all three error types and a spread of difficulty, and give each a `plausibility` score (0–1) for how tempting it is to a partial-understander. The compiler selects the most plausible foil per error type, so a richer, scored pool yields stronger items; when a score is omitted it is computed from the inference graph.**

When composing a request, author the passage first, then the inference graph, then the outcomes. The program is one flat builder chain: top-level forms (`passage`, `type`, `lines`, `claims`, `evidence`, `outcomes`) thread a single continuation and the whole program ends with one `{}..`. Inside the `claims`/`evidence`/`outcomes` lists, each element (`claim`/`source`/`outcome`) is its own attribute chain terminated by its own `{}`. Attribute values that are free text (`text`, `rationale`, `subject`, the passage heading) or id labels (`id`, `cites`, `supports`) are quoted strings; closed-enum values (`type`, `status`, `dimension`, `error-type`, `standard`, `dok`) are bare kebab-case identifiers (e.g. `ebsr`, `directly-supports`, `rl-1`).

In scope: a single literary passage; an inference graph of supported and distractor claims plus evidence sources tagged by role; the eight inference dimensions; the three task models; standards rl-1/rl-3/rl-6/rl-9 and DOK r-dok3. Out of scope: targets, claims, or grades beyond G5·C1·T4; dual-text stimuli; compile-time LLM generation; auto-scoring of short text; cross-language composition.

## Vocabulary Cues

Say this to get that:

- **Passage** — `passage "Title"` sets the heading; `type literary` (or `informational`); `lines [ "..." "..." ]` are the passage sentences, auto-numbered from 1.
- **Claim** — a candidate inference statement. `claim id "c1" status supported dimension character subject "Mara" text "..." cites ["e1" "e2"] {}`. A distractor adds `error-type` and a required `rationale`: `claim id "c2" status distractor error-type misreads-detail text "..." rationale "..." cites ["e2"] {}`.
- **Evidence source** — a passage line tagged by its support role. `source id "e1" line 1 status directly-supports supports ["c1"] {}`. Statuses: `directly-supports`, `supports-wrong-claim`, `irrelevant`. An optional `rationale` explains a foil.
- **Outcome** — the intended item. `outcome type ebsr dimension character subject "Mara" standard rl-1 {}`. Vary `type` (`ebsr` / `hot-text` / `short-text`) to get different items from the same pool. `focus "c1"` forces a particular correct claim.
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

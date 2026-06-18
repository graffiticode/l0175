<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 User Manual

_Revised: 2026-06-18_

**Introduction**

*Graffiticode* is a collection of domain languages for creating task-specific web apps.
**L0175** composes 5th-grade English Language Arts assessment items conforming to the
Smarter Balanced specification ELA · Grade 5 · Claim 1 (Reading) · Target 4: Reasoning &
Evidence.

A program authors, inline, a *superset* of tagged content for one literary passage —
candidate inference `claim`s and evidence `source`s — plus one or more intended `outcome`s.
The compiler *composes* each outcome by selecting the content that best fits and assembling
a finished item (EBSR, Hot Text, or Short Text).

### Overview

The program

```
passage "The Tide Pool"
type literary
lines [ "Mara crouched at the edge of the tide pool, ignoring the picnic behind her." ]
claims [ claim id "c1" status supported dimension character subject "Mara"
  text "Mara is more interested in the tide pool than in the picnic." cites ["e1"] {} ]
evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {} ]
outcomes [ outcome type ebsr dimension character subject "Mara" standard rl-1 {} ]
{}..
```

composes a two-part EBSR item and renders it as an answerable form with a Student / Review
toggle.

### Vocabulary

| Form | Arity | Example | Description |
| ---- | :---: | ------- | ----------- |
| **passage** | 2 | `passage "Title"` | Sets the passage heading; chains with `type` and `lines` |
| **type** | 2 | `type literary` | Passage type (`literary` / `informational`) or, on an outcome, the item type |
| **lines** | 2 | `lines [ "..." "..." ]` | Passage sentences, auto-numbered from 1 |
| **claims** | 2 | `claims [ claim ... {} ]` | The candidate inference statements |
| **claim** | 1 | `claim id "c1" status supported ... {}` | One inference candidate (supported or distractor) |
| **evidence** | 2 | `evidence [ source ... {} ]` | The evidence sources |
| **source** | 1 | `source id "e1" line 1 status directly-supports ... {}` | One passage line tagged by support role |
| **outcomes** | 2 | `outcomes [ outcome ... {} ]` | The intended items |
| **outcome** | 1 | `outcome type ebsr dimension character ... {}` | One item to compose |
| **rubric** | 2 | `rubric [ band ... {} ]` | Short-text scoring bands (on an outcome) |
| **band** | 1 | `band score 2 descriptor "..." {}` | One rubric row |
| **title** | 2 | `title "..."` | Optional assessment title (top level) |

Attribute functions (arity-2, merge one key into the element's record):

- **identity / refs** — `id`, `cites` (claim→evidence ids), `supports` (evidence→claim ids), `focus` (force the correct claim)
- **claim** — `status`, `dimension`, `text`, `error-type`*, `rationale`*, `plausibility` (0–1 distractor temptingness override), `subject`, `standard`, `dok`
- **evidence** — `status`, `line` (or `quote`), `supports`, `rationale`
- **outcome / stem** — `type`, `dimension`, `subject`, `standard`, `dok`, `mode` (inference/conclusion/author-intent), `other` (second subject), `stem` (Part A override), `stem-b` (Part B override)
- **rubric band** — `score`, `descriptor`

\* required on distractor claims. See `spec.md` for the full per-function reference.

### Enumerations

- item `type`: `ebsr`, `hot-text`, `short-text`
- `dimension`: `character`, `setting`, `event`, `point-of-view`, `theme`, `topic`, `narrators-feelings`, `character-relationship`
- claim `status`: `supported`, `distractor` · source `status`: `directly-supports`, `supports-wrong-claim`, `irrelevant`
- `error-type`: `misreads-detail`, `erroneous-inference`, `faulty-reasoning`
- `mode`: `inference`, `conclusion`, `author-intent`
- `standard`: `rl-1`, `rl-3`, `rl-6`, `rl-9` · `dok`: `r-dok3`

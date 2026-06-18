<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Vocabulary

_Revised: 2026-06-18_

**L0175** is a Graffiticode dialect for composing 5th-grade English Language Arts assessment
items (Smarter Balanced · Grade 5 · Claim 1 · Target 4: Reasoning & Evidence). A program
authors an inline *superset* of tagged content for one literary passage — candidate
inference/conclusion `claim`s and evidence `source`s — plus one or more intended `outcome`s.
The compiler **composes** each outcome by selecting the best-fitting content and assembling a
finished item (`ebsr`, `hot-text`, or `short-text`). It selects and validates authored
content; it does not generate it.

The core language specification (syntax, semantics, base library) is here:
[Graffiticode Language Specification](./graffiticode-language-spec.html)

## Authoring shape

A program is **one flat builder chain** ending in a single `{}..`:

```
title "Optional assessment title"
passage "Heading"
type literary
lines [ "Sentence one." "Sentence two." ]
claims [ claim ... {}, claim ... {} ]
evidence [ source ... {}, source ... {} ]
outcomes [ outcome ... {}, outcome ... {} ]
{}..
```

Three function roles make up the idiom:

- **Attribute functions** are arity-2 `(value, continuation)` and merge one key into the
  record: `text "…" cont` → `{ ...cont, text: "…" }`. They are generic — the same `id`,
  `status`, `text`, `type` appear on several forms — and the element wrapper validates them in
  context.
- **Collection builders** (`claims`, `evidence`, `outcomes`, `rubric`) and the passage forms
  (`passage`, `type`, `lines`, `title`) are arity-2 and thread **one shared continuation**, so
  the whole top level is a single chain closed by **one** trailing `{}`.
- **Element wrappers** (`claim`, `source`, `outcome`, `band`) are arity-1; each element's own
  attribute chain is terminated by its **own** `{}` inside the list.

Free text (`text`, `rationale`, `subject`, the passage heading) and id labels
(`id`, `cites`, `supports`) are **quoted strings**; closed-enum values (`ebsr`, `character`,
`misreads-detail`, `rl-1`, …) are **bare kebab-case identifiers**; `line`, `score`, and
`plausibility` are **numbers**.

---

# Function reference

## Structural forms

| Form | Arity | Takes | Description |
| :--- | :---: | :--- | :--- |
| `title` | 2 | string | Optional assessment title; echoed on the composed output. |
| `passage` | 2 | string | Opens the stimulus; the value is the passage **heading**. Chains with `type` and `lines`. |
| `type` | 2 | tag | On the passage: `literary` \| `informational`. On an `outcome`: the item type `ebsr` \| `hot-text` \| `short-text`. |
| `lines` | 2 | string list | The passage sentences, **auto-numbered from 1** (the numbers `source.line` refers to). |
| `claims` | 2 | list | The collection of candidate `claim`s (the inference graph's nodes). |
| `claim` | 1 | chain | One candidate inference/conclusion statement — either the correct answer or a foil. |
| `evidence` | 2 | list | The collection of evidence `source`s. |
| `source` | 1 | chain | One passage line tagged by its support role. |
| `outcomes` | 2 | list | The collection of intended items. |
| `outcome` | 1 | chain | One item to compose; varying it projects the same pool into a different item. |
| `rubric` | 2 | band list | On a `short-text` outcome: the scoring `band`s (defaults to 0/1/2 if omitted). |
| `band` | 1 | chain | One rubric row (a `score` + a `descriptor`). |

## Identity & references

| Attribute | On | Value | Description |
| :--- | :--- | :--- | :--- |
| `id` | claim, source | string | Stable identifier, referenced by `cites` / `supports` / `focus`. **Must be unique** within claims and within sources (duplicates are a hard error). |
| `cites` | claim | id list | The evidence `source` ids this claim draws on. For the correct claim, the `directly-supports` members become Part B's correct option(s). |
| `supports` | source | id list | The claim ids this evidence backs — *truly* for the correct claim, or *temptingly* for a distractor claim. A source tied to both the correct claim and a foil is what makes a Part B option plausibly support more than one Part A option (the no-giveaway rule). |
| `focus` | outcome | id | Force a specific supported claim to be the correct answer, overriding fit-ranking. |

References that don't resolve (`cites`/`supports` to a missing id) produce a **warning**; the
item still composes.

## Claim content

| Attribute | Value | Req. | Description |
| :--- | :--- | :---: | :--- |
| `status` | tag | ✓ | `supported` (a valid inference — a candidate correct answer) or `distractor` (a foil). |
| `dimension` | tag | ✓ on supported | The inference target (`character`, `theme`, `point-of-view`, …). Required on supported claims (it must match the outcome); optional on distractors. |
| `text` | string | ✓ | The statement a student reads as an option. |
| `error-type` | tag | ✓ on distractor | Which student misconception the foil targets: `misreads-detail`, `erroneous-inference`, or `faulty-reasoning`. |
| `rationale` | string | ✓ on distractor | Why a student would plausibly choose this foil (the error it targets). Surfaced in the item's `distractorAnalysis`. |
| `plausibility` | number 0–1 | | Optional author override for how tempting the foil is. If omitted, the compiler computes a score from evidence overlap, dimension match, structural parallelism, and error type, and uses it to pick the strongest foil per error type. |
| `subject` | string | | Who/what the claim is about (e.g. `"Mara"`, or a specific reference like `"Cortez's age"`). Boosts fit-ranking when it matches the outcome's `subject`, and fills the stem's reference slot. |
| `standard` | tag | | The companion RL standard the claim addresses; boosts fit-ranking and is emitted on the item. |
| `dok` | tag | | The claim's cognitive demand (`r-dok3`); boosts fit-ranking when it matches the outcome. |

## Evidence content

| Attribute | Value | Description |
| :--- | :--- | :--- |
| `status` | tag | The support role: `directly-supports` (real backing for its claim), `supports-wrong-claim` (real text that *seems* to back a foil), or `irrelevant` (off-point — a Part B distractor). |
| `line` | number | The passage line (1-based) this source quotes. Must be within the passage (out-of-range → warning). |
| `quote` | string | Alternative to `line` — a verbatim excerpt to show instead of looking up a line. |
| `supports` | id list | See *Identity & references* — the claim(s) this evidence backs. |
| `rationale` | string | Optional: why this line is a tempting-but-wrong Part B foil. If omitted, composition synthesizes one from the source's status. |

## Outcome & stem control

| Attribute | Value | Description |
| :--- | :--- | :--- |
| `type` | tag | The task model: `ebsr`, `hot-text`, or `short-text`. |
| `dimension` | tag | The inference target the item assesses; selects which supported claim is the correct answer. |
| `subject` | string | The reference the stem is about; also a fit-ranking signal. Accepts any noun phrase, e.g. `"Mara"` or `"the letter Cortez burned"`. |
| `standard` | tag | The primary RL standard; `rl-1` (cite evidence) is added automatically, and the dimension's companion standard is inferred. |
| `dok` | tag | Target cognitive demand (default `r-dok3`). |
| `focus` | id | Force the correct claim (see *Identity & references*). |
| `mode` | tag | The stem phrasing: `inference` (default), `conclusion`, or `author-intent` ("What did the author most likely mean by including …?"). |
| `other` | string | The second subject for `character-relationship` stems ("{subject}'s relationship with {other}"). |
| `stem` | string | Override the auto-generated Part A stem (or, for `short-text`, the prompt) with an exact phrasing. |
| `stem-b` | string | Override the auto-generated Part B stem. |
| `rubric` | band list | `short-text` only — replace the default 0/1/2 rubric with authored `band`s. |

## Rubric band

| Attribute | Value | Description |
| :--- | :--- | :--- |
| `score` | number | The points this band awards (e.g. `2`, `1`, `0`). |
| `descriptor` | string | What a response at this score looks like. |

---

## Enumerations

- **item `type`**: `ebsr`, `hot-text`, `short-text` · **passage `type`**: `literary`, `informational`
- **`dimension`**: `character`, `setting`, `event`, `point-of-view`, `theme`, `topic`, `narrators-feelings`, `character-relationship`
- **claim `status`**: `supported`, `distractor` · **source `status`**: `directly-supports`, `supports-wrong-claim`, `irrelevant`
- **`error-type`**: `misreads-detail`, `erroneous-inference`, `faulty-reasoning`
- **`mode`**: `inference`, `conclusion`, `author-intent`
- **`standard`**: `rl-1`, `rl-3`, `rl-6`, `rl-9` · **`dok`**: `r-dok3`

## How composition uses the vocabulary

For each outcome, the compiler selects the best-fitting **supported** claim for the
dimension (ranked by `standard`/`dok`/`subject` fit and evidence richness/spread), then:

- **ebsr** — Part A: the correct claim + 3 distractor claims (most plausible per error type);
  Part B: a `directly-supports` line + 3 foils drawn from `supports-wrong-claim` and
  `irrelevant` sources.
- **hot-text** — Part A as above; Part B exposes every passage line as selectable, with the
  correct claim's `directly-supports` lines marked correct.
- **short-text** — a prompt plus a 0/1/2 `rubric`; no distractors.

It emits `distractorAnalysis` (every foil's error type/status + rationale + the claim it ties
to + plausibility), an `answerKey`, the matched `standards` and `dok`, and `warnings`.
**Hard errors** (invalid enum, distractor missing its `rationale`, duplicate `id`) fail the
compile and carry source coordinates. **Warnings** (thin distractor pool, unsatisfiable
dimension, dangling reference, hot-text ambiguity) are non-fatal and ride on the item.

## Example

An EBSR item about a character's motivation, plus a short-text item with an authored rubric:

```
title "The Tide Pool"
passage "The Tide Pool"
type literary
lines [
  "Mara crouched at the edge of the tide pool, ignoring the picnic behind her."
  "Her brother called twice, but she did not turn around."
  "A tiny crab scuttled under a rock, and Mara smiled for the first time all day."
]
claims [
  claim id "c1" status supported dimension character subject "Mara" standard rl-1
    text "Mara is more interested in the tide pool than in her family's picnic."
    cites ["e1" "e3"] {},
  claim id "c2" status distractor error-type misreads-detail plausibility 0.8
    text "Mara is angry at her brother."
    rationale "Not turning around shows absorption, not anger." cites ["e2"] {},
  claim id "c3" status distractor error-type erroneous-inference
    text "Mara dislikes the outdoors."
    rationale "Contradicted by her smile in line 3." cites ["e2"] {},
  claim id "c4" status distractor error-type faulty-reasoning
    text "Because Mara is quiet, she must be upset."
    rationale "Treats quiet as upset without support." cites ["e2"] {}
]
evidence [
  source id "e1" line 1 status directly-supports supports ["c1"] {},
  source id "e2" line 2 status supports-wrong-claim supports ["c1" "c2"] {},
  source id "e3" line 3 status directly-supports supports ["c1"] {}
]
outcomes [
  outcome type ebsr dimension character subject "Mara" standard rl-1 {},
  outcome type short-text dimension character subject "Mara" standard rl-1
    rubric [ band score 2 descriptor "Valid inference with specific evidence." {},
             band score 1 descriptor "Partial inference or weak evidence." {},
             band score 0 descriptor "No valid inference or no evidence." {} ] {}
]
{}..
```

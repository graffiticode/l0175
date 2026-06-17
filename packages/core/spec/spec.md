<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Vocabulary

**L0175** is a Graffiticode dialect for composing 5th-grade English Language Arts assessment
items (Smarter Balanced · Grade 5 · Claim 1 · Target 4: Reasoning & Evidence). A program
authors an inline superset of tagged content for one literary passage and one or more
intended outcomes; the compiler composes each outcome into a finished item.

The core language specification (syntax, semantics, base library) is here:
[Graffiticode Language Specification](./graffiticode-language-spec.html)

## Authoring shape

A program is one flat builder chain ending in a single `{}..`:

```
passage "Title"
type literary
lines [ "Sentence one." "Sentence two." ]
claims [ claim ... {}, claim ... {} ]
evidence [ source ... {}, source ... {} ]
outcomes [ outcome ... {}, outcome ... {} ]
{}..
```

- **Attribute functions** are arity-2 `(value, continuation)` and merge one key into the
  record: `text "..." cont` → `{ ...cont, text: "..." }`.
- **Collection builders** (`claims`, `evidence`, `outcomes`) and the passage forms
  (`passage`, `type`, `lines`) are arity-2 and thread one shared continuation — so the whole
  top level is a single chain with one trailing `{}`.
- **Element wrappers** (`claim`, `source`, `outcome`) are arity-1; each element's own
  attribute chain is terminated by its own `{}` inside the list.

Free text and id labels are quoted strings; closed-enum values are bare kebab-case
identifiers.

## Forms

| Form | Kind | Key attributes |
| :--- | :--- | :--- |
| `passage` | passage heading | `type`, `lines` |
| `claim` | inference candidate | `id`, `status`, `dimension`, `text`, `error-type`*, `rationale`*, `cites`, `subject`, `standard`, `dok` |
| `source` | evidence line | `id`, `line` (or `quote`), `status`, `supports`, `rationale` |
| `outcome` | intended item | `type`, `dimension`, `subject`, `standard`, `dok`, `focus` |

\* `error-type` and `rationale` are required on distractor claims.

## Enumerations

- **item `type`**: `ebsr`, `hot-text`, `short-text`
- **passage `type`**: `literary`, `informational`
- **`dimension`**: `character`, `setting`, `event`, `point-of-view`, `theme`, `topic`, `narrators-feelings`, `character-relationship`
- **claim `status`**: `supported`, `distractor`
- **source `status`**: `directly-supports`, `supports-wrong-claim`, `irrelevant`
- **`error-type`**: `misreads-detail`, `erroneous-inference`, `faulty-reasoning`
- **`standard`**: `rl-1`, `rl-3`, `rl-6`, `rl-9` · **`dok`**: `r-dok3`

## How composition uses the tags

For each outcome, the compiler selects the best-fitting **supported** claim for the
dimension (ranked by standard/dok/subject fit and evidence richness), then:

- **ebsr** — Part A: the correct claim + 3 distractor claims (one per error type); Part B: a
  directly-supporting line + 3 foils drawn from `supports-wrong-claim` and `irrelevant` sources.
- **hot-text** — Part A as above; Part B exposes every passage line as selectable, with the
  correct claim's directly-supporting lines marked correct.
- **short-text** — a prompt plus a 0/1/2 rubric; no distractors.

Selection compromises (thin distractor pool, unsatisfiable dimension, hot-text ambiguity)
surface as non-fatal warnings; invalid enums or a distractor missing its rationale are
hard errors.

## Example

Render an EBSR item about a character's motivation:

```
passage "The Tide Pool"
type literary
lines [
  "Mara crouched at the edge of the tide pool, ignoring the picnic behind her."
  "A tiny crab scuttled under a rock, and Mara smiled for the first time all day."
]
claims [
  claim id "c1" status supported dimension character subject "Mara"
    text "Mara is more interested in the tide pool than in her family's picnic."
    cites ["e1" "e2"] {},
  claim id "c2" status distractor error-type misreads-detail
    text "Mara is bored by the tide pool."
    rationale "Contradicted by her smile in line 2." cites ["e2"] {}
]
evidence [
  source id "e1" line 1 status directly-supports supports ["c1"] {},
  source id "e2" line 2 status directly-supports supports ["c1"] {}
]
outcomes [ outcome type ebsr dimension character subject "Mara" standard rl-1 {} ]
{}..
```

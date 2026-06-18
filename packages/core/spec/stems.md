<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Appropriate-Stem Catalog (SBAC · Grade 5 · Claim 1 · Target 4)

_Revised: 2026-06-18_

The **code generator authors the stem** for every question from this catalog and emits it on the
outcome (`stem`, and `stem-b` on EBSR). The compiler no longer synthesizes stems — it uses the
authored text verbatim. These are the guideline's "Appropriate Stems" for Reasoning & Evidence;
source: `packages/core/data/E.G5.C1.T4 Reasoning & Evidence.pdf`.

Compose questions **first**: pick the `dimension`, resolve the `{about}` phrase, choose the
`mode`, instantiate the matching Part A stem (and Part B stem for EBSR), then author the correct
claim and its foils against that exact stem.

## The `{about}` phrase

`{about}` fills the guideline's "[provide character's name / setting / other reference]" slot.
Resolve it from the dimension (`subject`/`other` are the noun phrases you supply):

| dimension | `{about}` |
|---|---|
| `character` | the `subject` (e.g. "Mara", "Cortez's motive") |
| `narrators-feelings` | the narrator's feelings toward `{subject}` |
| `character-relationship` | `{subject}`'s relationship with `{other}` |
| `point-of-view` | the author's point of view |
| `setting` | the setting |
| `event` | the events |
| `theme` | the theme |
| `topic` | the topic |

`{about}` must be **inferable from evidence** (Target 4) — a fact stated outright is literal
recall and out of scope.

## Part A stems (EBSR & Short Text) — by `mode`

- `inference` (default) — `Which of these inferences about {about} is supported by the passage?`
- `conclusion` — `Which of these conclusions about {about} is supported by the passage?`
- `author-intent` — `What did the author most likely mean by including {about} in the passage?`

## Part A stems (Hot Text) — "click the statement" forms, by `mode`

- `inference` — `Click on the statement that best provides an inference about {about} that is supported by the passage.`
- `conclusion` — `Click on the statement that best provides a conclusion that can be drawn about {about}.`
- `author-intent` — `Click on the statement that best describes what the author most likely meant by including {about} in the passage.`

## Part B stems

- **EBSR** (author as `stem-b`) — `Which sentence(s) from the passage best support your answer in Part A?`
- **Hot Text** — fixed by the compiler (no authored Part B stem); students click supporting sentences.

## Short Text prompt (author as `stem`)

`{lead} Explain using key details from the passage to support your answer.` where `{lead}` is:

- `inference` — `What inference can be made about {about}?`
- `conclusion` — `What conclusion can be drawn about {about}?`
- `author-intent` — `What did the author most likely mean by including {about} in the passage?`

## Worked examples

- character / inference / EBSR →
  `stem "Which of these inferences about Mara is supported by the passage?"`
  `stem-b "Which sentence(s) from the passage best support your answer in Part A?"`
- point-of-view / inference / Hot Text →
  `stem "Click on the statement that best provides an inference about the author's point of view that is supported by the passage."`
- theme / inference / Short Text →
  `stem "What inference can be made about the theme? Explain using key details from the passage to support your answer."`

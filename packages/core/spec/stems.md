<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Appropriate-Stem Catalog (SBAC · Grade 5 · Claim 1 · Reasoning & Evidence)

_Revised: 2026-06-19_

The **code generator authors each question's stem from this catalog** and emits it on the
outcome (`stem`, and `stem-b` on EBSR). The compiler uses the authored text verbatim — it does
not synthesize stems. These stems are transcribed **verbatim** from the guidelines' "Appropriate
Stems" (Task Models 1–3, single-passage only; dual-text-stimuli stems are out of scope).

**First match your program's `target`, then use that target's catalog below:**
- **`c1-t4`** (literary) → source `packages/core/data/E.G5.C1.T4 Reasoning & Evidence.pdf`
- **`c1-t11`** (informational) → source `packages/core/data/E.G5.C1.T11 Reasoning & Evidence.pdf`

## How to use this catalog

1. Use the section for your `target` (T4 or T11).
2. Pick the **task model** by item type: EBSR → Task Model 1, Hot Text → Task Model 2,
   Short Text → Task Model 3.
3. Pick the **one stem template** that matches the task (inference vs. conclusion vs.
   author-intent, and the dimension), and fill its bracketed `[...]` slot.

**Specificity rule (required, both targets).** The `[...]` slot must name the concrete thing the
question is about — a character's name (`Mother`), a specific event (`the turkey-feeding`), a
specific idea (`the relationship between the bridge designs`), the author's point of view, etc.
It is the same string you put in the outcome's `subject`. Do **not** leave it generic
(`the character`) and do **not** pad it (`the theme of the passage` → use `the theme`; the stem
already ends "…supported by the passage"). A specific subject makes the four choices discriminating.

---

# Target 4 (`c1-t4`) — literary

## Task Model 1 — EBSR (two-part selected response)

**Lead-in:** This question has two parts. First, answer part A. Then, answer part B.

**Part A (`stem`) — pick one:**
- Which of these inferences about [...] is supported by the passage?
- What inference can be made about [...]?
- What inference can be made about the narrator's feelings toward [...]?
- What inference can be made about [character's name]'s relationship with [character's name]?
- Which of these conclusions about [...] is supported by the passage?
- What conclusion can be drawn about [...]?
- What conclusion can be drawn about the narrator's feelings toward [...]?
- What conclusion can be drawn about [character's name]'s relationship with [character's name]?
- What did the author most likely mean by including [...] in the passage?

(The `[...]` slot is `[provide character's name / setting / event / author's point of view /
theme / topic / etc.]`.)

**Part B (`stem-b`) — pick one:**
- Which sentence(s) from the passage best support your answer in part A?
- Which sentence(s) from the passage best support the [inference made / conclusion drawn] in part A?

## Task Model 2 — Hot Text (select text)

**Lead-in:** This question has two parts. First, answer part A. Then, answer part B.

**Part A (`stem`) — pick one:**
- Click on the statement that best provides an inference about [...] that is supported by the passage.
- Click on the statement that best provides an inference that can be made about the narrator's feelings toward [...].
- Click on the statement that best provides an inference that can be made about [character's name]'s relationship with [character's name].
- Click on the statement that best provides a conclusion that can be drawn about [...].
- Click on the statement that best provides a conclusion that can be drawn about the narrator's feelings toward [...].
- Click on the statement that best provides a conclusion that can be drawn about [character's name]'s relationship with [character's name].
- Click on the statement that best describes what the author most likely meant by including [...] in the passage.

**Part B:** fixed by the compiler (you do not author it) — "Click the sentence(s) from the
passage that best support your answer in Part A. Choose one option." **Author only the Part A
*statement* stem above; never author a "click/select the sentences…" instruction as the Part A
`stem`** (that is Part B's job). If a request says "select the sentences that show [X]", that
describes the Part B selection — author Part A as a statement prompt about [X] and mark the
sentences that show [X] as `directly-supports` evidence (with exact `quote`s).

## Task Model 3 — Short Text (constructed response)

Author as `stem` (the prompt); every Short Text stem ends with the explain clause:

- What inference can be made about [...]? Explain using key details from the passage to support your answer.
- What inference can be made about the narrator's feelings toward [...]? Explain using key details from the passage to support your answer.
- What inference can be made about [character's name]'s relationship with [character's name]? Explain using key details from the passage to support your answer.
- What conclusion can be drawn about [...]? Explain using key details from the passage to support your answer.
- What conclusion can be drawn about the narrator's feelings toward [...]? Explain using key details from the passage to support your answer.
- What conclusion can be drawn about [character's name]'s relationship with [character's name]? Explain using key details from the passage to support your answer.

(`[...]` slot here is `[provide character's name / setting / event / theme / topic]`.)

## Worked examples (specific slot fills)

- character / inference / EBSR →
  `stem "Which of these inferences about Mother is supported by the passage?"`
  `stem-b "Which sentence(s) from the passage best support your answer in part A?"`
- point-of-view / inference / EBSR →
  `stem "What inference can be made about the narrator's point of view?"`
- theme / inference / EBSR →
  `stem "Which of these inferences about the theme is supported by the passage?"`  ✓
  (not "…about the theme of the passage is supported by the passage?" — redundant)
- author-intent / EBSR (specific event) →
  `stem "What did the author most likely mean by including the scarecrow in the passage?"`
- theme / inference / Short Text →
  `stem "What inference can be made about the theme? Explain using key details from the passage to support your answer."`

---

# Target 11 (`c1-t11`) — informational

Informational dimensions: `relationships-interactions`, `author-use-of-information`,
`point-of-view`, `purpose`, `authors-opinion`. The `[...]` slot is the guideline's
`[provide example of relationships or interactions between individuals, events, ideas, or
concepts / author's use of information / point of view / purpose]` (or, for an opinion question,
`the author's opinion of [idea/concept]`; for author-intent, `[target detail]`). Note T11 says
"key **evidence**" (T4 said "key details"), and Part B units are
`sentence(s) / paragraph(s) / section(s)`.

## Task Model 1 — EBSR (two-part selected response)

**Lead-in:** This question has two parts. First, answer part A. Then, answer part B.

**Part A (`stem`) — pick one:**
- Which of these inferences about the [...] is supported by the passage?
- What inference can be made about the [...]?
- What inference can be made about the author's opinion of [idea/concept in the text]?
- Which of these conclusions about the [...] is supported by the passage?
- What conclusion can be drawn about the [...]?
- What conclusion can be drawn about the author's opinion of [idea/concept in the text]?
- What did the author most likely mean by using [target detail] in the text?

**Part B (`stem-b`) — pick one:**
- Which sentence(s) from the passage best support your answer in part A?
- Which sentence(s) from the passage best show the [inference made / conclusion drawn] in part A?

## Task Model 2 — Hot Text (select text)

**Lead-in:** This question has two parts. First, answer part A. Then, answer part B.

**Part A (`stem`) — pick one:**
- Click on the statement that best provides an inference about the [...] that is supported by the passage.
- Click on the statement that best provides an inference that can be made about the author's opinion of [idea/concept in the text].
- Click on the statement that best provides a conclusion that can be drawn about the [...].
- Click on the statement that best provides a conclusion that can be drawn about the author's opinion of [idea/concept in the text].
- Click on the statement that best describes what the author most likely meant by using [target detail] in the text.

**Part B:** fixed by the compiler (you do not author it) — "Click the sentence(s) from the
passage that best support your answer in Part A. Choose one option." **Author only the Part A
*statement* stem above; never author a "click/select the sentences…" instruction as the Part A
`stem`** (that is Part B's job). If a request says "select the sentences that show [X]", that
describes the Part B selection — author Part A as a statement prompt about [X] and mark the
sentences that show [X] as `directly-supports` evidence (with exact `quote`s).

## Task Model 3 — Short Text (constructed response)

Author as `stem`; every Short Text stem ends with the explain clause ("key **evidence**"):

- What inference can be made about the [...]? Explain using key evidence from the passage to support your answer.
- What inference can be made about the author's opinion about [idea/concept in the text]? Explain using key evidence from the passage to support your answer.
- What conclusion can be drawn about the [...]? Explain using key evidence from the passage to support your answer.
- What conclusion can be drawn about the author's opinion about [idea/concept in the text]? Explain using key evidence from the passage to support your answer.
- What did the author most likely mean by using [target detail] in the text? Explain using key evidence from the passage to support your answer.

## Worked examples (T11, specific slot fills)

- relationships-interactions / inference / EBSR →
  `stem "Which of these inferences about the relationship between the bridge designs is supported by the passage?"`
  `stem-b "Which sentence(s) from the passage best support your answer in part A?"`
- author-use-of-information / inference / EBSR →
  `stem "What inference can be made about the author's use of statistics in the report?"`
- point-of-view / EBSR →
  `stem "Which of these conclusions about the author's point of view is supported by the passage?"`
- authors-opinion / Short Text →
  `stem "What conclusion can be drawn about the author's opinion about renewable energy? Explain using key evidence from the passage to support your answer."`

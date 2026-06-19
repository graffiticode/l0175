<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 Appropriate-Stem Catalog (SBAC · Grade 5 · Claim 1 · Target 4)

_Revised: 2026-06-19_

The **code generator authors each question's stem from this catalog** and emits it on the
outcome (`stem`, and `stem-b` on EBSR). The compiler uses the authored text verbatim — it does
not synthesize stems. These stems are transcribed **verbatim** from the guideline's "Appropriate
Stems" (source: `packages/core/data/E.G5.C1.T4 Reasoning & Evidence.pdf`, Task Models 1–3). Only
the single-passage stems are listed; the dual-text-stimuli stems are out of scope for L0175.

## How to use this catalog

1. Pick the **task model** by item type: EBSR → Task Model 1, Hot Text → Task Model 2,
   Short Text → Task Model 3.
2. Pick the **one stem template** that matches the task — inference vs. conclusion vs.
   author-intent, and the dimension (plain subject vs. narrator's-feelings vs.
   character-relationship).
3. **Fill the bracketed `[...]` slot with the SPECIFIC reference from the passage** — a
   character's name (`Mother`), the specific event (`the turkey-feeding`), the specific phrase
   (`the phrase "for the birds"`), the author's point of view, the theme, etc. This is the
   guideline's `[provide character's name / setting / event / …]` slot and is the same string you
   put in the outcome's `subject`.

**Specificity rule (required).** The slot must name the concrete thing the question is about.
Do **not** leave it generic (`the character`, `the narrator and Josh`) and do **not** pad it
(`the theme of the passage` → use `the theme`; the trailing "supported by the passage" already
references the passage). A specific subject is what makes the four answer choices discriminating.

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
passage that best support your answer in Part A. Choose one option."

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

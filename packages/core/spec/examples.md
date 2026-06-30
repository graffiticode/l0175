<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 RAG Training Examples

_Revised: 2026-06-30_

Natural-language prompts for training a RAG model on L0175 — composing 5th-grade ELA
assessment items (Smarter Balanced · Grade 5 · Claim 1) for learning targets **T4**
(`target c1-t4`, Reasoning & Evidence, literary), **T11** (`target c1-t11`, Reasoning & Evidence,
informational), **T9** (`target c1-t9`, Central Ideas, informational), **T8** (`target c1-t8`,
Key Details, informational), and **T10** (`target c1-t10`, Word Meanings, informational). Each
program declares its `target` first. Categories 1–6 below are literary (T4); Category 7 is
informational R&E (T11); Category 8 is Central Ideas (T9); Category 9 is Key Details (T8);
Category 10 is Word Meanings (T10).

## Category 1: EBSR items (two-part selected response)

1. Write an EBSR item about the main character's motivation in a story about a girl at a tide pool.
2. Compose a two-part item: Part A asks what can be inferred about the narrator's feelings; Part B asks for the supporting line.
3. Make an EBSR item about the setting and how it shapes the mood of the scene.
4. Build an EBSR item about an event and why the character reacts the way she does.
5. Write an EBSR item about the relationship between two characters, standard rl-3.
6. Compose an EBSR item about the author's point of view, standard rl-6.
7. Make an EBSR item about the theme of the passage.

## Category 2: Hot Text items (select text)

8. Make a hot-text item where students click the statement that best describes the character, then click the supporting sentences.
9. Compose a hot-text item where Part B asks students to highlight every sentence that shows the character's focus.
10. Write a hot-text item about the narrator's feelings toward another character.

## Category 3: Short Text items (constructed response)

11. Write a short-text item asking what inference can be made about the character, with evidence.
12. Compose a short-text constructed-response item about the theme, hand-scored 0–2.
13. Make a short-text item about how the setting affects the character, with a custom rubric.

## Category 4: Authoring the inference graph

Each prompt composes a complete item; the focus is how the claim/evidence graph is built.

14. Compose an EBSR item about a girl named Mara at a tide pool: author a supported claim that she cares more about the tide pool than her family's picnic, and make that claim the question's focus.
15. Compose a literary item with two questions about the tide-pool story — one built on a supported claim that Mara is absorbed by the pool, and a separate question built on a supported claim that her brother wants her attention.
16. Compose an EBSR item whose focus inference is directly supported by two of the passage's lines — tag both sources directly-supports and cite them from the correct claim.
17. Compose an EBSR item that includes a supports-wrong-claim source: real evidence that props up an 'anger' misreading rather than the correct inference, linked to both the correct claim and the anger distractor.
18. Compose an EBSR item whose last two passage lines are tagged irrelevant so they can serve as Part B foils.

## Category 5: Distractors by error type

Each prompt composes a complete item; the focus is the error-typed distractor it features.

19. Compose an EBSR item about Mara at the tide pool with a misreads-detail distractor that takes her silence as anger, with a rationale that names the error and targets the question.
20. Compose an EBSR item about Mara at the tide pool with an erroneous-inference distractor that she dislikes being outdoors.
21. Compose an EBSR item about Mara at the tide pool with a faulty-reasoning distractor that mistakes her whisper for fear.
22. Compose an EBSR item whose distractors each carry a rationale explaining the student error they target and are tagged with the question id(s) they foil.

## Category 6: Item-first composition

23. Compose the questions first: write an EBSR question, a short-text question, and a hot-text question, each with its stem from the guideline catalog, then author foils targeting each.
24. Compose one question per inference dimension the passage supports, then author a targeted foil set for each.
25. Set a question's focus to a specific correct claim and write its stem, then author the distractors that target it.

## Category 7: Informational items (target c1-t11)

26. From an informational article about the history of bridge design, write an EBSR item about the relationships between the successive designs (dimension relationships-interactions, standard ri-3).
27. Make an item about how the author uses evidence to support a point in a science article (dimension author-use-of-information, standard ri-8).
28. Compose an EBSR item about the author's point of view in an informational passage about city planning (dimension point-of-view, standard ri-6).
29. Write a short-text item asking what conclusion can be drawn about the author's opinion of renewable energy, with key evidence (dimension authors-opinion).
30. Make a hot-text item about the author's purpose in an informational passage (dimension purpose).

## Category 8: Central Ideas items (target c1-t9)

A DIFFERENT skill from Reasoning & Evidence — the main idea, the key details that build it, and summary (DOK 2; standards ri-1+ri-2). Distractors are usually TRUE statements that just aren't central: too-narrow (a supporting detail), too-broad (an overgeneralization), insignificant (a minor detail), or misreads-detail.

31. From an informational article about honeybees, write a multiple-choice item asking which sentence best states the main idea (dimension central-idea). Make the distractors a true supporting detail (too-narrow), an overgeneralization (too-broad), and a misread (misreads-detail).
32. Make a multi-select item: choose the two sentences that should be included in a summary of the passage (dimension summary); `focus` lists the two correct claims, distractors are insignificant or too-broad statements.
33. Compose an EBSR item where Part A asks for the main idea and Part B asks which detail best supports it (dimension central-idea, standard ri-2).
34. Write a short-text item: "Determine the main idea of the passage. Explain using key details…" (dimension central-idea, DOK r-dok3).
35. Write a multiple-choice "missing key detail" item: present a short summary in the stem and ask which key detail is missing; the focus claim is the missing detail.

## Category 9: Key Details items (target c1-t8)

A DIFFERENT model — the inference/conclusion is GIVEN in the stem and the student selects the supporting EVIDENCE (DOK 1–2; standards ri-1+ri-7; dimension supporting-evidence). Author ONE supported claim = the given inference (its `focus`), state it in the stem, and author `source`s as the options: directly-supports = correct evidence (with a `quote`), supports-wrong-claim/irrelevant = distractor evidence. No distractor claims.

36. From an informational article about Roman aqueducts, write a multiple-choice item that states the conclusion "aqueducts brought water to distant cities" and asks which detail from the passage best supports it (dimension supporting-evidence).
37. Make a multi-select item: which two details best support the stated conclusion? Select two answers (two directly-supports sources are the correct set).
38. Make a single-part hot-text item: state the inference, then have students click the sentence(s) in the passage that support it (dimension supporting-evidence).

## Category 10: Word Meanings items (target c1-t10)

A DIFFERENT model — the question asks for the MEANING of a targeted word/phrase in context, so the options are meanings (DOK 1–2; standard ri-4 + the L-4 family). Author a top-level `words` list: a `word` (the targeted word, with line/quote for context) holding `meanings` — `status correct` (the answer) + `status distractor` (error-type other-meaning/misinterprets/wrong-context + rationale). The outcome's `focus` names the word; state the word + its sentence in the stem.

39. From an informational article, write a multiple-choice item asking what the word "aqueduct" most likely means as used in the passage (dimension word-meaning, standard l-4a — context). Distractors: another meaning that ignores context (other-meaning), a misread (misinterprets), and a wrong-context meaning.
40. Make a multi-select item: "What does the word 'channel' most likely mean? Choose two answers." (two correct meanings, dimension word-meaning).
41. Write a roots/affixes item: ask what the root in a word means, standard l-4b (dimension word-meaning).
42. Make a click-the-word item (hot-text): "Read the dictionary entry … Click the word in the paragraph that matches this definition." Author the candidate `word`s — the correct one is the outcome's `focus` with the `line` of its paragraph, plus a few distractor candidate words from that same paragraph (`text` only, no `meanings`). The compiler shows the paragraph and makes those authored candidates clickable; the focus word is correct. (Author only the correct word and every content word in the paragraph becomes a choice.) Keep the passage out of the stem.

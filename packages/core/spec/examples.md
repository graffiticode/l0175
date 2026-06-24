<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 RAG Training Examples

_Revised: 2026-06-24_

Natural-language prompts for training a RAG model on L0175 — composing 5th-grade ELA
assessment items (Smarter Balanced · Grade 5 · Claim 1) for learning targets **T4**
(`target c1-t4`, Reasoning & Evidence, literary), **T11** (`target c1-t11`, Reasoning & Evidence,
informational), **T9** (`target c1-t9`, Central Ideas, informational), and **T8** (`target c1-t8`,
Key Details, informational). Each program declares its `target` first. Categories 1–6 below are
literary (T4); Category 7 is informational R&E (T11); Category 8 is Central Ideas (T9); Category 9
is Key Details (T8).

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

14. Add a supported claim, that the character cares more about the tide pool than the picnic, and point question q1's focus at it.
15. Add a second supported claim about the brother and build a separate question q2 around it.
16. Tag line 1 and line 3 as directly supporting the main inference.
17. Mark line 2 as evidence that supports a wrong claim, tied to both the correct claim and the 'anger' distractor.
18. Mark the last two lines as irrelevant so they can serve as Part B foils.

## Category 5: Distractors by error type

19. Add a misreads-detail distractor for question q1 that takes the character's silence as anger.
20. Add an erroneous-inference distractor for q1 that the character dislikes being outdoors.
21. Add a faulty-reasoning distractor for q1 that mistakes the character's whisper for fear.
22. Give each distractor a rationale explaining the student error it targets, and tag it with the question id(s) it foils.

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

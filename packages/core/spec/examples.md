<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 RAG Training Examples

_Revised: 2026-06-18_

Natural-language prompts for training a RAG model on L0175 — composing 5th-grade ELA
assessment items (Smarter Balanced · Grade 5 · Claim 1 · Reasoning & Evidence) for learning
targets **T4** (`target c1-t4`, literary) and **T11** (`target c1-t11`, informational). Each
program declares its `target` first. Categories 1–6 below are literary (T4); Category 7 is
informational (T11).

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

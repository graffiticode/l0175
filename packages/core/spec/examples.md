<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0175 RAG Training Examples

_Revised: 2026-07-01_

Natural-language prompts for training a RAG model on L0175 — composing 5th-grade ELA
assessment items (Smarter Balanced · Grade 5 · Claim 1). They are written the way a fifth-grade
teacher would ask for an item, and they stay away from specific passage content so the model
learns the task shape, not a topic. Each program declares its `target` first.

There is a prompt for every task model of every target (17 task models across the 5 targets). Each
appears three ways so the model matches however the request is phrased: a full teacher-voice
description, a compact token form ("Create a c1-t4 tm1 question"), and a spelled-out form
("Create a claim 1 target 4 task model 1 question"). Item type maps to a task-model number within
each target, and the numbers collide across targets — a short-text item is tm3 in T4/T11 but tm5
in T9; a hot-text item is tm2 in T4/T11, tm4 in T9, and tm3 in T8/T10 — so each prompt names its
target and task model.

## Target 4 (`c1-t4`) — Reasoning & Evidence, literary

Students read a story and reason about it — how a character or the narrator thinks, feels, or
acts, the setting, an event, point of view, or the theme — and back it up with evidence from the
text.

1. c1-t4 tm1 — Make a two-part item for a story: in Part A students figure out what the main character is feeling or why they act the way they do, and in Part B they pick the line from the story that best backs up their answer.
2. Create a c1-t4 tm1 question.
3. Create a claim 1 target 4 task model 1 question.
4. c1-t4 tm2 — Make an item for a story where students first click the sentence that best describes the narrator's point of view, then click the sentence or two that support it.
5. Create a c1-t4 tm2 question.
6. Create a claim 1 target 4 task model 2 question.
7. c1-t4 tm3 — Make a written-response item for a story: ask students what the theme is and have them explain it using details from the text.
8. Create a c1-t4 tm3 question.
9. Create a claim 1 target 4 task model 3 question.

## Target 11 (`c1-t11`) — Reasoning & Evidence, informational

The same kind of reasoning as Target 4, but for an informational passage — the author's point of
view or purpose, how ideas connect, or what the author's opinion is — always supported with
evidence.

10. c1-t11 tm1 — Make a two-part item for an informational passage: in Part A students figure out the author's point or how two ideas are connected, and in Part B they choose the detail that best supports it.
11. Create a c1-t11 tm1 question.
12. Create a claim 1 target 11 task model 1 question.
13. c1-t11 tm2 — Make an item for an informational passage where students click the sentence that best states the author's purpose, then click the sentences that support it.
14. Create a c1-t11 tm2 question.
15. Create a claim 1 target 11 task model 2 question.
16. c1-t11 tm3 — Make a written-response item for an informational passage: ask students what conclusion they can draw about the author's opinion and have them back it up with evidence from the text.
17. Create a c1-t11 tm3 question.
18. Create a claim 1 target 11 task model 3 question.

## Target 9 (`c1-t9`) — Central Ideas, informational

Students find the main idea of an informational passage, the key details that build it, or a
summary. Wrong answers are usually true but not central — a small supporting detail, an
overgeneralization, or a misread. This is the only target that uses all five task models.

19. c1-t9 tm1 — Make an item for an informational passage that asks which sentence best states the main idea.
20. Create a c1-t9 tm1 question.
21. Create a claim 1 target 9 task model 1 question.
22. c1-t9 tm2 — Make an item for an informational passage where students choose the two sentences that belong in a summary.
23. Create a c1-t9 tm2 question.
24. Create a claim 1 target 9 task model 2 question.
25. c1-t9 tm3 — Make a two-part item for an informational passage: in Part A students pick the main idea, and in Part B they choose the detail that best supports it.
26. Create a c1-t9 tm3 question.
27. Create a claim 1 target 9 task model 3 question.
28. c1-t9 tm4 — Make an item for an informational passage where students click the sentence or two that best show the main idea.
29. Create a c1-t9 tm4 question.
30. Create a claim 1 target 9 task model 4 question.
31. c1-t9 tm5 — Make a written-response item for an informational passage: ask students to figure out the main idea and explain it using key details from the text.
32. Create a c1-t9 tm5 question.
33. Create a claim 1 target 9 task model 5 question.

## Target 8 (`c1-t8`) — Key Details, informational

The conclusion is handed to the students; their job is to find the evidence. Give them an
inference about an informational passage and have them pick the detail(s) that support it. The
wrong answers are other details that don't actually support it.

34. c1-t8 tm1 — Give students a conclusion about an informational passage and make an item asking which detail from the passage best supports it.
35. Create a c1-t8 tm1 question.
36. Create a claim 1 target 8 task model 1 question.
37. c1-t8 tm2 — Give students a conclusion about an informational passage and make an item asking which two details best support it.
38. Create a c1-t8 tm2 question.
39. Create a claim 1 target 8 task model 2 question.
40. c1-t8 tm3 — Give students a conclusion about an informational passage and make an item where they click the sentence or two that support it.
41. Create a c1-t8 tm3 question.
42. Create a claim 1 target 8 task model 3 question.

## Target 10 (`c1-t10`) — Word Meanings, informational

Students figure out what a word or phrase means the way it is used in an informational passage.
The answer choices are meanings; wrong ones come from another meaning of the word, a misread, or
the wrong context.

43. c1-t10 tm1 — Make an item that asks what a key word most likely means the way it is used in an informational passage.
44. Create a c1-t10 tm1 question.
45. Create a claim 1 target 10 task model 1 question.
46. c1-t10 tm2 — Make an item that asks students to choose the two answers that best give the meaning of a key word as it is used in an informational passage.
47. Create a c1-t10 tm2 question.
48. Create a claim 1 target 10 task model 2 question.
49. c1-t10 tm3 — Give students a short definition and make an item where they click the word in the paragraph that matches it.
50. Create a c1-t10 tm3 question.
51. Create a claim 1 target 10 task model 3 question.

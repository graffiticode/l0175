// SPDX-License-Identifier: MIT
// Compose-engine regression tests. Parses .gc fixtures with @graffiticode/parser (a sibling
// repo in this workspace) and runs the built compiler. Run: `npm test` (builds core first).
//
// L0175 is item-first: each outcome carries a unique `id`, a `focus` (the correct claim), and an
// explicit `stem` (+ `stem-b` on EBSR); each distractor `targets` the question(s) it foils, and
// composition draws an item's foils ONLY from the distractors that target it.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error — sibling repo, plain JS, no types
import { parser } from "../../../../graffiticode/packages/parser/src/index.js";
import { lexicon, compiler } from "../dist/index.js";

async function compile(src: string): Promise<{ errors: any[]; data: any }> {
  const ast = await parser.parse("0175", src, lexicon);
  return new Promise((resolve) =>
    compiler.compile(ast, {}, {}, (err: any, data: any) =>
      resolve({ errors: Array.isArray(err) ? err.filter(Boolean) : err ? [err] : [], data })),
  );
}

const PASSAGE = `target c1-t4 passage "The Tide Pool" type literary lines [
  "Mara crouched at the edge of the tide pool, ignoring the picnic behind her."
  "Her brother called twice, but she did not turn around."
  "A tiny crab scuttled under a rock, and Mara smiled for the first time all day."
  "She traced the cold water as if the pool were the only thing that mattered."
  "Five more minutes, she whispered, though no one was listening."
  "Behind her, paper plates rustled and her mother laughed."
]`;

// Five distinct distractors targeting q1/q3; c2 (misreads, plausibility 0.9) beats c2b/c5.
const POOL = `claims [
  claim id "c1" status supported dimension character subject "Mara" standard rl-1 text "Mara cares more about the tide pool than the picnic." cites ["e1" "e2" "e3"] {},
  claim id "cb" status supported dimension character subject "the brother" text "The brother wants Mara's attention." cites ["e2"] {},
  claim id "c2" status distractor error-type misreads-detail plausibility 0.9 targets ["q1" "q3"] text "Mara is angry at her brother." rationale "Silence is absorption, not anger." cites ["e2"] {},
  claim id "c2b" status distractor error-type misreads-detail plausibility 0.3 targets ["q1" "q3"] text "Mara is upset with her family." rationale "Weak duplicate-ish foil." cites ["e2"] {},
  claim id "c3" status distractor error-type erroneous-inference targets ["q1" "q3"] text "Mara dislikes the outdoors." rationale "Contradicted by her smile." cites ["e4"] {},
  claim id "c4" status distractor error-type faulty-reasoning targets ["q1" "q3"] text "Mara fears her family." rationale "Whisper treated as fear." cites ["e4"] {},
  claim id "c5" status distractor error-type misreads-detail targets ["q1" "q3"] text "Mara is bored." rationale "Stillness is focus." cites ["e4"] {}
]
evidence [
  source id "e1" line 1 status directly-supports supports ["c1"] {},
  source id "e2" line 2 status supports-wrong-claim supports ["c1" "c2"] {},
  source id "e3" line 4 status directly-supports supports ["c1"] {},
  source id "e4" line 6 status irrelevant supports [] {}
]`;

// Reusable, guideline-authored stems (the compiler no longer synthesizes these).
const STEM_A = `stem "Which of these inferences about Mara is supported by the passage?"`;
const STEM_B = `stem-b "Which sentence(s) from the passage best support your answer in Part A?"`;
const Q1 = `outcome id "q1" type ebsr dimension character subject "Mara" standard rl-1 focus "c1" ${STEM_A} ${STEM_B} {}`;
const Q2 = `outcome id "q2" type short-text dimension character subject "Mara" standard rl-1 focus "c1" stem "What inference can be made about Mara? Explain using key details from the passage to support your answer." {}`;
const Q3 = `outcome id "q3" type hot-text dimension character subject "Mara" standard rl-1 focus "c1" stem "Click on the statement that best provides an inference about Mara that is supported by the passage." {}`;

const prog = (outcomes: string) => `${PASSAGE}\n${POOL}\noutcomes [ ${outcomes} ]\n{}..`;
const one = async (outcome: string) => {
  const { errors, data } = await compile(prog(outcome));
  return { errors, item: data?.kind === "items" ? data.items[0] : data };
};

describe("compose — task models", () => {
  it("composes all three task models from one pool", async () => {
    const { errors, data } = await compile(prog(`${Q1}, ${Q2}, ${Q3}`));
    expect(errors).toHaveLength(0);
    expect(data.items.map((i: any) => i.type)).toEqual(["ebsr", "short-text", "hot-text"]);
  });

  it("EBSR Part A has 4 options with exactly one correct", async () => {
    const { item } = await one(Q1);
    expect(item.partA.options).toHaveLength(4);
    expect(item.partA.options.filter((o: any) => o.correct)).toHaveLength(1);
    expect(item.partB.options.filter((o: any) => o.correct)).toHaveLength(1);
  });

  it("Hot Text exposes one selectable sentence per paragraph and marks the directly-supporting ones", async () => {
    const { item } = await one(Q3);
    // PASSAGE lines are single sentences, so each paragraph yields one selectable unit "<lineId>.1".
    expect(item.selectable.map((s: any) => s.id)).toEqual(["1.1", "2.1", "3.1", "4.1", "5.1", "6.1"]);
    expect(item.selectable.filter((s: any) => s.correct).map((s: any) => s.id)).toEqual(["1.1", "4.1"]);
    expect(item.answerKey.partB).toBe("1.1, 4.1");
    // 2 valid sentences → cap is a proper subset: min(3, 2-1) = 1.
    expect(item.selectMax).toBe(1);
    expect(item.stem.partB).toBe("Click 1 sentence from the passage that supports your answer in Part A.");
  });

  it("Hot Text caps Part B selection at a proper subset of the valid supporting sentences", async () => {
    // One paragraph of 4 sentences; a no-quote directly-supports source marks all 4 valid.
    const FOUR = `target c1-t4 passage "P" type literary lines [
      "Mara watched the pool. She ignored the picnic. She traced the water. She smiled at a crab."
    ]
    claims [
      claim id "c1" status supported dimension character subject "Mara" text "Mara is focused on the pool." cites ["e1"] {},
      claim id "d1" status distractor error-type misreads-detail targets ["q1"] text "Mara is angry." rationale "r" cites ["e1"] {},
      claim id "d2" status distractor error-type erroneous-inference targets ["q1"] text "Mara dislikes the outdoors." rationale "r" cites ["e1"] {},
      claim id "d3" status distractor error-type faulty-reasoning targets ["q1"] text "Mara fears her brother." rationale "r" cites ["e1"] {}
    ]
    evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {} ]
    outcomes [ outcome id "q1" type hot-text dimension character subject "Mara" standard rl-1 focus "c1" stem "Click on the statement that best provides an inference about Mara that is supported by the passage." {} ] {}..`;
    const { data } = await compile(FOUR);
    const item = data.kind === "items" ? data.items[0] : data;
    expect(item.selectable.filter((s: any) => s.correct)).toHaveLength(4); // V = 4
    expect(item.selectMax).toBe(3); // min(3, 4-1) = 3
    expect(item.stem.partB).toBe("Click 1 to 3 sentences from the passage that support your answer in Part A.");
  });

  it("Hot Text segments a multi-sentence paragraph and marks the quoted sentence, keeping paragraph grouping", async () => {
    const MULTI = `target c1-t4 passage "P" type literary lines [
      "Mara watched the tide pool. Her brother called twice, but she did not turn around."
      "She smiled at a small crab."
    ]
    claims [
      claim id "c1" status supported dimension character subject "Mara" text "Mara is focused on the pool." cites ["e1"] {},
      claim id "d1" status distractor error-type misreads-detail targets ["q1"] text "Mara is angry." rationale "r" cites ["e2"] {},
      claim id "d2" status distractor error-type erroneous-inference targets ["q1"] text "Mara dislikes the outdoors." rationale "r" cites ["e2"] {},
      claim id "d3" status distractor error-type faulty-reasoning targets ["q1"] text "Mara fears her brother." rationale "r" cites ["e2"] {}
    ]
    evidence [
      source id "e1" line 1 quote "Mara watched the tide pool." status directly-supports supports ["c1"] {},
      source id "e2" line 1 quote "Her brother called twice, but she did not turn around." status supports-wrong-claim supports ["c1" "d1"] {}
    ]
    outcomes [ outcome id "q1" type hot-text dimension character subject "Mara" standard rl-1 focus "c1" stem "Click on the statement that best provides an inference about Mara that is supported by the passage." {} ] {}..`;
    const { errors, data } = await compile(MULTI);
    expect(errors).toHaveLength(0);
    const item = data.kind === "items" ? data.items[0] : data;
    // Paragraph 1 splits into 2 sentences; paragraph 2 stays one — grouped by lineId.
    expect(item.selectable.map((s: any) => s.id)).toEqual(["1.1", "1.2", "2.1"]);
    expect(item.selectable.filter((s: any) => s.lineId === 1)).toHaveLength(2);
    // Only the sentence matching the directly-supporting quote is correct.
    expect(item.selectable.filter((s: any) => s.correct).map((s: any) => s.id)).toEqual(["1.1"]);
  });

  it("Short Text emits the authored prompt and a default 0/1/2 rubric, no distractors", async () => {
    const { item } = await one(Q2);
    expect(item.prompt).toMatch(/What inference can be made about Mara/);
    expect(item.rubric.map((r: any) => r.score)).toEqual([2, 1, 0]);
    expect(item.distractorAnalysis).toHaveLength(0);
  });

  it("Short Text carries no two-part lead-in (single answer box, not Part A/B)", async () => {
    const { item } = await one(Q2);
    expect(item.stem.leadIn).toBeUndefined();
    // EBSR and Hot Text, which do have two parts, still carry it.
    expect((await one(Q1)).item.stem.leadIn).toMatch(/two parts/);
    expect((await one(Q3)).item.stem.leadIn).toMatch(/two parts/);
  });
});

describe("compose — selection binds foils by `targets`", () => {
  it("draws an item's foils ONLY from distractors that target it (no dimension bleed)", async () => {
    // Two same-dimension questions with DISJOINT foil sets — the case the old dimension join broke.
    const src = `${PASSAGE}
      claims [
        claim id "c1" status supported dimension character subject "Mara" text "Mara prefers the tide pool to the picnic." cites ["e1" "e3"] {},
        claim id "cb" status supported dimension character subject "the brother" text "The brother wants Mara's attention." cites ["e2"] {},
        claim id "a1" status distractor error-type misreads-detail targets ["qA"] text "Mara is angry at her brother." rationale "r" cites ["e2"] {},
        claim id "a2" status distractor error-type erroneous-inference targets ["qA"] text "Mara dislikes the outdoors." rationale "r" cites ["e4"] {},
        claim id "a3" status distractor error-type faulty-reasoning targets ["qA"] text "Because Mara is quiet she must be upset." rationale "r" cites ["e2"] {},
        claim id "b1" status distractor error-type misreads-detail targets ["qB"] text "The brother is angry at Mara." rationale "r" cites ["e2"] {},
        claim id "b2" status distractor error-type erroneous-inference targets ["qB"] text "The brother wants to go home." rationale "r" cites ["e4"] {},
        claim id "b3" status distractor error-type faulty-reasoning targets ["qB"] text "Because the brother calls, he is in charge." rationale "r" cites ["e2"] {}
      ]
      evidence [
        source id "e1" line 1 status directly-supports supports ["c1"] {},
        source id "e2" line 2 status supports-wrong-claim supports ["c1" "a1"] {},
        source id "e3" line 4 status directly-supports supports ["c1"] {},
        source id "e4" line 6 status irrelevant supports [] {}
      ]
      outcomes [
        outcome id "qA" type ebsr dimension character subject "Mara" focus "c1" ${STEM_A} ${STEM_B} {},
        outcome id "qB" type ebsr dimension character subject "the brother" focus "cb" stem "Which of these inferences about the brother is supported by the passage?" ${STEM_B} {}
      ] {}..`;
    const { errors, data } = await compile(src);
    expect(errors).toHaveLength(0);
    const foils = (item: any) => item.distractorAnalysis.filter((d: any) => d.part === "A").map((d: any) => d.claimId).sort();
    const qA = data.items.find((i: any) => i.id.endsWith("qA"));
    const qB = data.items.find((i: any) => i.id.endsWith("qB"));
    expect(foils(qA)).toEqual(["a1", "a2", "a3"]);
    expect(foils(qB)).toEqual(["b1", "b2", "b3"]);
  });

  it("ranks the targeted distractors by plausibility (c2 0.9 wins the misreads slot)", async () => {
    const { item } = await one(Q1);
    const misreads = item.distractorAnalysis.find((d: any) => d.errorType === "misreads-detail");
    expect(misreads.claimId).toBe("c2");
    expect(misreads.plausibility).toBeGreaterThan(0.5);
  });

  it("uses the focus claim as the correct answer", async () => {
    const { item } = await one(Q1);
    expect(item.review.correctClaim.id).toBe("c1");
  });
});

describe("compose — hard errors (the item-first contract)", () => {
  const errs = async (mut: (s: string) => string) => (await compile(mut(prog(Q1)))).errors.map((e: any) => e.message);

  it("errors when a distractor has no targets", async () => {
    const m = await errs((s) => s.replace(`targets ["q1" "q3"] text "Mara is angry`, `text "Mara is angry`));
    expect(m.some((x) => /needs targets/.test(x))).toBe(true);
  });

  it("errors when an outcome is missing focus", async () => {
    const m = await errs((s) => s.replace(`focus "c1" ${STEM_A}`, STEM_A));
    expect(m.some((x) => /missing focus/.test(x))).toBe(true);
  });

  it("errors when an outcome is missing its stem", async () => {
    const m = await errs((s) => s.replace(` ${STEM_A}`, ``));
    expect(m.some((x) => /missing stem/.test(x))).toBe(true);
  });

  it("errors when an EBSR outcome is missing stem-b", async () => {
    const m = await errs((s) => s.replace(` ${STEM_B}`, ``));
    expect(m.some((x) => /Part B stem/.test(x))).toBe(true);
  });

  it("errors when focus points at a distractor, not a supported claim", async () => {
    const m = await errs((s) => s.replace(`focus "c1"`, `focus "c2"`));
    expect(m.some((x) => /must be a supported claim/.test(x))).toBe(true);
  });

  it("errors when targets names an unknown outcome", async () => {
    const m = await errs((s) => s.replace(`targets ["q1" "q3"]`, `targets ["qZ"]`));
    expect(m.some((x) => /targets unknown outcome/.test(x))).toBe(true);
  });

  it("errors when fewer than 3 distractors target an EBSR/Hot-Text outcome", async () => {
    // Strip every distractor's q1 binding except c2's → only 1 targets q1.
    const m = await errs((s) =>
      s.replaceAll(`targets ["q1" "q3"]`, `targets ["q3"]`).replace(`targets ["q3"] text "Mara is angry`, `targets ["q1"] text "Mara is angry`));
    expect(m.some((x) => /at least 3/.test(x))).toBe(true);
  });

  it("errors on a duplicate id", async () => {
    const m = await errs((s) => s.replace(`id "c2b"`, `id "c2"`));
    expect(m.some((x) => /Duplicate claim id/.test(x))).toBe(true);
  });

  it("errors (with coords) when a distractor lacks a rationale", async () => {
    const { errors } = await compile(prog(Q1).replace(`rationale "Silence is absorption, not anger." `, ``));
    const e = errors.find((x: any) => /needs a rationale/.test(x.message));
    expect(e).toBeTruthy();
    expect(typeof e.from).toBe("number");
  });
});

describe("compose — warnings (non-fatal)", () => {
  it("warns when fewer than 5 viable distractors target an outcome", async () => {
    const src = `${PASSAGE}
      claims [ claim id "c1" status supported dimension character text "correct inference here ok" cites ["e1"] {},
        claim id "d1" status distractor error-type misreads-detail targets ["q1"] text "foil a here ok" rationale "r" cites ["e2"] {},
        claim id "d2" status distractor error-type erroneous-inference targets ["q1"] text "foil b here ok" rationale "r" cites ["e2"] {},
        claim id "d3" status distractor error-type faulty-reasoning targets ["q1"] text "foil c here ok" rationale "r" cites ["e2"] {} ]
      evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {},
        source id "e2" line 2 status irrelevant supports [] {} ]
      outcomes [ outcome id "q1" type ebsr dimension character subject "x" focus "c1" ${STEM_A} ${STEM_B} {} ] {}..`;
    const { errors, data } = await compile(src);
    expect(errors).toHaveLength(0); // 3 targeted foils → no hard error
    expect((data.warnings || []).some((w: string) => /viable distractor/.test(w))).toBe(true);
  });

  it("warns on a dangling cites reference", async () => {
    const src = prog(Q1).replace(`cites ["e1" "e2" "e3"]`, `cites ["e1" "e99"]`);
    const { data } = await compile(src);
    expect((data.warnings || []).some((w: string) => /e99/.test(w))).toBe(true);
  });

  // The correct claim is far longer/more detailed than its foils — the length giveaway.
  const lengthProg = (correctText: string, foilTexts: [string, string, string]) => `${PASSAGE}
    claims [ claim id "c1" status supported dimension character text "${correctText}" cites ["e1"] {},
      claim id "d1" status distractor error-type misreads-detail targets ["q1"] text "${foilTexts[0]}" rationale "r" cites ["e2"] {},
      claim id "d2" status distractor error-type erroneous-inference targets ["q1"] text "${foilTexts[1]}" rationale "r" cites ["e2"] {},
      claim id "d3" status distractor error-type faulty-reasoning targets ["q1"] text "${foilTexts[2]}" rationale "r" cites ["e2"] {} ]
    evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {},
      source id "e2" line 2 status irrelevant supports [] {} ]
    outcomes [ outcome id "q1" type ebsr dimension character subject "x" focus "c1" ${STEM_A} ${STEM_B} {} ] {}..`;

  it("warns when the correct option is the longest and far longer than its foils", async () => {
    const src = lengthProg(
      "Mara values the quiet time she spends watching the tide pool far more than she values joining her family's picnic.",
      ["Mara is angry.", "Mara is bored.", "Mara is scared."],
    );
    const { errors, data } = await compile(src);
    expect(errors).toHaveLength(0);
    expect((data.warnings || []).some((w: string) => /length giveaway/.test(w))).toBe(true);
  });

  it("does not warn when Part A and Part B options are parallel in length", async () => {
    // Part A claim texts are comparable; Part B draws the correct line + foil lines of similar
    // length (passage lines 1/3/4/6), so neither part is a length outlier.
    const src = `${PASSAGE}
      claims [ claim id "c1" status supported dimension character text "Mara cares more about the tide pool than the family picnic." cites ["e1"] {},
        claim id "d1" status distractor error-type misreads-detail targets ["q1"] text "Mara is angry at her brother for calling her twice." rationale "r" cites ["e2"] {},
        claim id "d2" status distractor error-type erroneous-inference targets ["q1"] text "Mara feels bored by the long afternoon at the beach." rationale "r" cites ["e4"] {},
        claim id "d3" status distractor error-type faulty-reasoning targets ["q1"] text "Mara is scared of the crab she saw beneath the rock." rationale "r" cites ["e5"] {} ]
      evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {},
        source id "e2" line 3 status supports-wrong-claim supports ["c1" "d1"] {},
        source id "e4" line 4 status irrelevant supports [] {},
        source id "e5" line 6 status irrelevant supports [] {} ]
      outcomes [ outcome id "q1" type ebsr dimension character subject "x" focus "c1" ${STEM_A} ${STEM_B} {} ] {}..`;
    const { errors, data } = await compile(src);
    expect(errors).toHaveLength(0);
    expect((data.warnings || []).some((w: string) => /length giveaway/.test(w))).toBe(false);
  });

  // A Hot Text stem that restates the correct claim's wording telegraphs the answer.
  const Q3_GIVEAWAY = `outcome id "q3" type hot-text dimension character subject "Mara" standard rl-1 focus "c1" stem "Click the sentence that shows Mara cares more about the tide pool than the picnic." {}`;

  it("warns when the Part A stem reuses the correct option's wording", async () => {
    const { item } = await one(Q3_GIVEAWAY);
    expect((item.warnings || []).some((w: string) => /stem reuses much of the correct option's wording/.test(w))).toBe(true);
  });

  it("does not warn when the stem is a neutral question (the catalog stems)", async () => {
    const { item } = await one(Q3); // "Click on the statement that best provides an inference about Mara…"
    expect((item.warnings || []).some((w: string) => /stem reuses/.test(w))).toBe(false);
  });

  // A Hot Text Part A stem that asks for passage sentences (Part B's job) instead of a statement.
  const Q3_SENTENCE_STEM = `outcome id "q3" type hot-text dimension character subject "Mara" standard rl-1 focus "c1" stem "Click on the two sentences from the passage that best show what Mara cares about." {}`;

  it("warns when a Hot Text Part A stem asks for sentences instead of the best statement", async () => {
    const { item } = await one(Q3_SENTENCE_STEM);
    expect((item.warnings || []).some((w: string) => /Part A must ask for the best STATEMENT/.test(w))).toBe(true);
  });

  it("does not warn when the Hot Text Part A stem is a 'statement' prompt", async () => {
    const { item } = await one(Q3); // "Click on the statement that best provides an inference…"
    expect((item.warnings || []).some((w: string) => /must ask for the best STATEMENT/.test(w))).toBe(false);
  });
});

describe("compose — stems are authored verbatim", () => {
  it("passes the authored Part A / Part B stems through unchanged", async () => {
    const { item } = await one(Q1);
    expect(item.stem.partA).toBe("Which of these inferences about Mara is supported by the passage?");
    expect(item.stem.partB).toBe("Which sentence(s) from the passage best support your answer in Part A?");
  });

  it("synthesizes the Hot-Text Part B instruction from the selection cap (no authored Part B stem)", async () => {
    const { item } = await one(Q3);
    expect(item.stem.partA).toMatch(/Click on the statement that best provides an inference about Mara/);
    expect(item.stem.partB).toMatch(/Click 1 sentence from the passage/); // Q3 has 2 valid → cap 1
  });
});

describe("compose — vocabulary", () => {
  it("authors a rubric via band and echoes a top-level title", async () => {
    const src = `title "My Assessment"
      ${PASSAGE}
      claims [ claim id "c1" status supported dimension character text "correct inference here ok" cites ["e1"] {} ]
      evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {} ]
      outcomes [ outcome id "q1" type short-text dimension character subject "x" focus "c1"
        stem "What inference can be made about the character? Explain using key details."
        rubric [ band score 2 descriptor "Full." {}, band score 0 descriptor "None." {} ] {} ] {}..`;
    const { data } = await compile(src);
    expect(data.title).toBe("My Assessment");
    expect(data.rubric).toEqual([
      { score: 2, descriptor: "Full." },
      { score: 0, descriptor: "None." },
    ]);
  });
});

describe("compose — learning targets (parameterization)", () => {
  // An informational passage under Target 11 (RI standards, informational dimensions).
  const T11 = `target c1-t11 passage "Bridges" type informational lines [
      "Early bridges were simple logs laid across streams.",
      "As towns grew, builders needed stronger spans, so they turned to stone arches.",
      "The Romans perfected the arch, distributing weight outward to supports called piers.",
      "Centuries later, iron and then steel let engineers build far longer bridges.",
      "Suspension bridges hang the roadway from cables strung between tall towers.",
      "Each advance solved a problem the previous design could not."
    ]
    claims [
      claim id "c1" status supported dimension relationships-interactions subject "the bridge designs" text "Each new bridge design arose to solve a limitation of the earlier one." cites ["e1" "e3"] {},
      claim id "d1" status distractor error-type misreads-detail targets ["q1"] text "Stone arches replaced steel bridges over time." rationale "Reverses the order of developments." cites ["e2"] {},
      claim id "d2" status distractor error-type erroneous-inference targets ["q1"] text "The Romans invented the suspension bridge." rationale "Conflates two different advances." cites ["e3"] {},
      claim id "d3" status distractor error-type faulty-reasoning targets ["q1"] text "Because logs were used first, they were the strongest material." rationale "Treats earliest as strongest without support." cites ["e1"] {}
    ]
    evidence [
      source id "e1" line 1 status directly-supports supports ["c1"] {},
      source id "e2" line 2 status supports-wrong-claim supports ["c1" "d1"] {},
      source id "e3" line 3 status directly-supports supports ["c1"] {},
      source id "e4" line 6 status irrelevant supports [] {}
    ]
    outcomes [ outcome id "q1" type ebsr dimension relationships-interactions subject "the bridge designs" focus "c1"
      stem "Which of these inferences about the relationship between the bridge designs is supported by the passage?"
      stem-b "Which sentence(s) from the passage best support your answer in part A?" {} ] {}..`;

  it("composes a T11 item with RI standards and stamps the target", async () => {
    const r = await compile(T11);
    expect(r.errors).toHaveLength(0);
    const it0 = r.data.kind === "items" ? r.data.items[0] : r.data;
    expect(it0.target).toBe("c1-t11");
    expect(it0.standards).toContain("ri-1");
    expect(it0.standards).toContain("ri-3"); // relationships-interactions → ri-3
    expect(it0.standards).not.toContain("rl-1");
  });

  it("defaults to c1-t4 with a warning when `target` is omitted (keeps generation/back-compat working)", async () => {
    // Drop both the target and the now-mismatched T11 dimensions so the default-T4 profile validates.
    const noTarget = T11.replace("target c1-t11 ", "").replaceAll("relationships-interactions", "character");
    const { errors, data } = await compile(noTarget);
    expect(errors).toHaveLength(0);
    const it0 = data.kind === "items" ? data.items[0] : data;
    expect(it0.target).toBe("c1-t4");
    expect((it0.warnings || []).some((w: string) => /No target declared; defaulting to c1-t4/.test(w))).toBe(true);
  });

  it("errors on a non-target tag used as the target", async () => {
    // A truly-unknown tag is rejected by the parser; a registered-but-non-target tag (here the
    // dimension `theme`) reaches the compiler's target check.
    const { errors } = await compile(T11.replace("target c1-t11", "target theme"));
    expect(errors.some((e: any) => /unknown target 'theme'/.test(e.message))).toBe(true);
  });

  it("rejects a T4 dimension under T11", async () => {
    const { errors } = await compile(T11.replaceAll("relationships-interactions", "character"));
    expect(errors.some((e: any) => /invalid dimension 'character' for target c1-t11/.test(e.message))).toBe(true);
  });

  it("rejects an RL standard under T11", async () => {
    const { errors } = await compile(T11.replace(`focus "c1"`, `focus "c1" standard rl-3`));
    expect(errors.some((e: any) => /invalid standard 'rl-3' for target c1-t11/.test(e.message))).toBe(true);
  });

  it("warns (not errors) when the passage type mismatches the target", async () => {
    const { errors, data } = await compile(T11.replace("type informational", "type literary"));
    expect(errors).toHaveLength(0);
    const it0 = data.kind === "items" ? data.items[0] : data;
    expect((it0.warnings || []).some((w: string) => /expects an informational passage/.test(w))).toBe(true);
  });
});

describe("compose — grade level & readability", () => {
  // A deliberately above-grade passage: long sentences, abstract/academic vocabulary. Self-
  // contained (claims/evidence reference only line 1) so the only warning under test is readability.
  const DENSE = `target c1-t4 passage "The Tide Pool" type literary lines [
      "Crouched at the littoral margin, Mara remained ostensibly impervious to the convivial picnic whose paraphernalia her relations had meticulously arranged behind her, an indifference that bordered on the deliberate and a preoccupation she could neither articulate nor entirely comprehend, the juxtaposition of her contemplative absorption against the gregarious festivity epitomizing a profound estrangement."
    ]
    claims [
      claim id "c1" status supported dimension character subject "Mara" text "Mara cares about the tide pool." cites ["e1"] {},
      claim id "c2" status distractor error-type misreads-detail targets ["q1"] text "Mara is angry." rationale "r" cites ["e1"] {},
      claim id "c3" status distractor error-type erroneous-inference targets ["q1"] text "Mara dislikes the outdoors." rationale "r" cites ["e1"] {},
      claim id "c4" status distractor error-type faulty-reasoning targets ["q1"] text "Mara fears her family." rationale "r" cites ["e1"] {}
    ]
    evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {} ]
    outcomes [ ${Q1} ] {}..`;

  it("echoes the target's grade (5) on the output by default", async () => {
    const { item } = await one(Q1);
    expect(item.grade).toBe(5);
  });

  it("does not warn on a grade-appropriate passage (the Tide Pool fixture)", async () => {
    const { item } = await one(Q1);
    expect((item.warnings || []).some((w: string) => /reads above grade/.test(w))).toBe(false);
  });

  it("warns when the passage reads well above the target grade", async () => {
    const { errors, data } = await compile(DENSE);
    expect(errors).toHaveLength(0); // advisory only — never blocks composition
    const it0 = data.kind === "items" ? data.items[0] : data;
    expect((it0.warnings || []).some((w: string) => /reads above grade 5/.test(w))).toBe(true);
  });

  it("an explicit top-level `grade` overrides the target's grade and shifts the threshold", async () => {
    const { data } = await compile(DENSE.replace("target c1-t4", "target c1-t4 grade 8"));
    const it0 = data.kind === "items" ? data.items[0] : data;
    expect(it0.grade).toBe(8);
    expect((it0.warnings || []).some((w: string) => /reads above grade 8/.test(w))).toBe(true);
  });
});

describe("output shape", () => {
  it("a composed item carries the schema's required top-level keys", async () => {
    const required = JSON.parse(
      readFileSync(new URL("../spec/schema.json", import.meta.url), "utf8"),
    ).$defs.item.required;
    const { item } = await one(Q1);
    for (const key of required) expect(item, `missing ${key}`).toHaveProperty(key);
  });
});

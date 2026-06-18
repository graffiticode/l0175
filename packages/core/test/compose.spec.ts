// SPDX-License-Identifier: MIT
// Compose-engine regression tests. Parses .gc fixtures with @graffiticode/parser (a sibling
// repo in this workspace) and runs the built compiler. Run: `npm test` (builds core first).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
// @ts-ignore — sibling repo, plain JS, no types
import { parser } from "../../../../graffiticode/packages/parser/src/index.js";
import { lexicon, compiler } from "../dist/index.js";

async function compile(src: string): Promise<{ errors: any[]; data: any }> {
  const ast = await parser.parse("0175", src, lexicon);
  return new Promise((resolve) =>
    compiler.compile(ast, {}, {}, (err: any, data: any) =>
      resolve({ errors: Array.isArray(err) ? err.filter(Boolean) : err ? [err] : [], data })),
  );
}

const PASSAGE = `passage "The Tide Pool" type literary lines [
  "Mara crouched at the edge of the tide pool, ignoring the picnic behind her."
  "Her brother called twice, but she did not turn around."
  "A tiny crab scuttled under a rock, and Mara smiled for the first time all day."
  "She traced the cold water as if the pool were the only thing that mattered."
  "Five more minutes, she whispered, though no one was listening."
  "Behind her, paper plates rustled and her mother laughed."
]`;

// Five distinct distractors (>=5 viable); c2 (misreads, plausibility 0.9) beats c2b/c5.
const POOL = `claims [
  claim id "c1" status supported dimension character subject "Mara" standard rl-1 text "Mara cares more about the tide pool than the picnic." cites ["e1" "e2" "e3"] {},
  claim id "cb" status supported dimension character subject "the brother" text "The brother wants Mara's attention." cites ["e2"] {},
  claim id "c2" status distractor error-type misreads-detail plausibility 0.9 text "Mara is angry at her brother." rationale "Silence is absorption, not anger." cites ["e2"] {},
  claim id "c2b" status distractor error-type misreads-detail plausibility 0.3 text "Mara is upset with her family." rationale "Weak duplicate-ish foil." cites ["e2"] {},
  claim id "c3" status distractor error-type erroneous-inference text "Mara dislikes the outdoors." rationale "Contradicted by her smile." cites ["e4"] {},
  claim id "c4" status distractor error-type faulty-reasoning text "Mara fears her family." rationale "Whisper treated as fear." cites ["e4"] {},
  claim id "c5" status distractor error-type misreads-detail text "Mara is bored." rationale "Stillness is focus." cites ["e4"] {}
]
evidence [
  source id "e1" line 1 status directly-supports supports ["c1"] {},
  source id "e2" line 2 status supports-wrong-claim supports ["c1" "c2"] {},
  source id "e3" line 4 status directly-supports supports ["c1"] {},
  source id "e4" line 6 status irrelevant supports [] {}
]`;

const prog = (outcomes: string) => `${PASSAGE}\n${POOL}\noutcomes [ ${outcomes} ]\n{}..`;
const one = async (outcome: string) => {
  const { errors, data } = await compile(prog(outcome));
  return { errors, item: data?.kind === "items" ? data.items[0] : data };
};

describe("compose — task models", () => {
  it("composes all three task models from one pool", async () => {
    const { errors, data } = await compile(prog(`
      outcome type ebsr dimension character subject "Mara" standard rl-1 {},
      outcome type short-text dimension character subject "Mara" standard rl-1 {},
      outcome type hot-text dimension character subject "Mara" standard rl-1 {}`));
    expect(errors).toHaveLength(0);
    expect(data.items.map((i: any) => i.type)).toEqual(["ebsr", "short-text", "hot-text"]);
  });

  it("EBSR Part A has 4 options with exactly one correct", async () => {
    const { item } = await one(`outcome type ebsr dimension character subject "Mara" standard rl-1 {}`);
    expect(item.partA.options).toHaveLength(4);
    expect(item.partA.options.filter((o: any) => o.correct)).toHaveLength(1);
    expect(item.partB.options.filter((o: any) => o.correct)).toHaveLength(1);
  });

  it("Hot Text marks the directly-supporting lines as the correct selection", async () => {
    const { item } = await one(`outcome type hot-text dimension character subject "Mara" standard rl-1 {}`);
    expect(item.selectable.filter((s: any) => s.correct).map((s: any) => s.lineId)).toEqual([1, 4]);
  });

  it("Short Text emits a prompt and a default 0/1/2 rubric, no distractors", async () => {
    const { item } = await one(`outcome type short-text dimension character subject "Mara" standard rl-1 {}`);
    expect(item.prompt).toMatch(/inference|conclusion/i);
    expect(item.rubric.map((r: any) => r.score)).toEqual([2, 1, 0]);
    expect(item.distractorAnalysis).toHaveLength(0);
  });
});

describe("compose — selection", () => {
  it("picks the best supported claim by fit (subject) and records alternatives", async () => {
    const { item } = await one(`outcome type ebsr dimension character subject "Mara" standard rl-1 {}`);
    expect(item.review.correctClaim.id).toBe("c1");
    expect(item.review.alternativeClaims).toBeGreaterThanOrEqual(1);
  });

  it("ranks distractors by plausibility (c2 0.9 wins the misreads slot)", async () => {
    const { item } = await one(`outcome type ebsr dimension character subject "Mara" standard rl-1 {}`);
    const misreads = item.distractorAnalysis.find((d: any) => d.errorType === "misreads-detail");
    expect(misreads.claimId).toBe("c2");
    expect(misreads.plausibility).toBeGreaterThan(0.5);
  });

  it("honors the focus override", async () => {
    const { item } = await one(`outcome type ebsr dimension character subject "x" focus "cb" standard rl-1 {}`);
    expect(item.review.correctClaim.id).toBe("cb");
  });
});

describe("compose — warnings & validation", () => {
  it("warns when fewer than 5 viable distractors", async () => {
    const src = `${PASSAGE}
      claims [ claim id "c1" status supported dimension character text "correct inference here ok" cites ["e1"] {},
        claim id "d1" status distractor error-type misreads-detail text "foil a here ok" rationale "r" cites ["e2"] {},
        claim id "d2" status distractor error-type erroneous-inference text "foil b here ok" rationale "r" cites ["e2"] {} ]
      evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {},
        source id "e2" line 2 status irrelevant supports [] {} ]
      outcomes [ outcome type ebsr dimension character subject "x" standard rl-1 {} ] {}..`;
    const { data } = await compile(src);
    expect((data.warnings || []).some((w: string) => /viable distractor/.test(w))).toBe(true);
  });

  it("warns on a dangling cites reference", async () => {
    const { item } = await one(`outcome type ebsr dimension character subject "Mara" standard rl-1 {}`);
    void item; // baseline has none
    const src = prog(`outcome type ebsr dimension character subject "Mara" standard rl-1 {}`)
      .replace(`cites ["e1" "e2" "e3"]`, `cites ["e1" "e99"]`);
    const { data } = await compile(src);
    expect((data.warnings || []).some((w: string) => /e99/.test(w))).toBe(true);
  });

  it("errors on a duplicate id", async () => {
    const src = prog(`outcome type ebsr dimension character subject "Mara" standard rl-1 {}`)
      .replace(`id "c2b"`, `id "c2"`);
    const { errors } = await compile(src);
    expect(errors.some((e: any) => /Duplicate claim id/.test(e.message))).toBe(true);
  });

  it("errors (with coords) when a distractor lacks a rationale", async () => {
    const src = prog(`outcome type ebsr dimension character subject "Mara" standard rl-1 {}`)
      .replace(`rationale "Silence is absorption, not anger." `, ``);
    const { errors } = await compile(src);
    const e = errors.find((x: any) => /needs a rationale/.test(x.message));
    expect(e).toBeTruthy();
    expect(typeof e.from).toBe("number");
  });

  it("warns (not errors) on an unsatisfiable dimension", async () => {
    const { errors, item } = await one(`outcome type ebsr dimension theme subject "x" standard rl-9 {}`);
    expect(errors).toHaveLength(0);
    expect(item.warnings.some((w: string) => /cannot be satisfied/.test(w))).toBe(true);
  });
});

describe("compose — stems", () => {
  const stem = async (extra: string) =>
    (await one(`outcome type ebsr dimension character subject "Mara" standard rl-1 ${extra} {}`)).item.stem;

  it("renders inference / conclusion / author-intent variants", async () => {
    expect((await stem(``)).partA).toMatch(/Which of these inferences about Mara/);
    expect((await stem(`mode conclusion`)).partA).toMatch(/Which of these conclusions about Mara/);
    expect((await stem(`mode author-intent`)).partA).toMatch(/What did the author most likely mean/);
  });

  it("resolves the about-phrase per dimension and supports other/override", async () => {
    const nf = (await one(`outcome type ebsr dimension narrators-feelings subject "Mara" standard rl-6 {}`)).item.stem.partA;
    expect(nf).toMatch(/the narrator's feelings toward Mara/);
    const rel = (await one(`outcome type ebsr dimension character-relationship subject "Mara" other "Tom" standard rl-3 {}`)).item.stem.partA;
    expect(rel).toMatch(/Mara's relationship with Tom/);
    expect((await stem(`stem "Custom A?"`)).partA).toBe("Custom A?");
    expect((await stem(`stem-b "Custom B?"`)).partB).toBe("Custom B?");
  });
});

describe("compose — vocabulary", () => {
  it("authors a rubric via band and echoes a top-level title", async () => {
    const src = `title "My Assessment"
      ${PASSAGE}
      claims [ claim id "c1" status supported dimension character text "correct inference here ok" cites ["e1"] {} ]
      evidence [ source id "e1" line 1 status directly-supports supports ["c1"] {} ]
      outcomes [ outcome type short-text dimension character subject "x" standard rl-1
        rubric [ band score 2 descriptor "Full." {}, band score 0 descriptor "None." {} ] {} ] {}..`;
    const { data } = await compile(src);
    expect(data.title).toBe("My Assessment");
    expect(data.rubric).toEqual([
      { score: 2, descriptor: "Full." },
      { score: 0, descriptor: "None." },
    ]);
  });
});

describe("output shape", () => {
  it("a composed item carries the schema's required top-level keys", async () => {
    const required = JSON.parse(
      readFileSync(new URL("../spec/schema.json", import.meta.url), "utf8"),
    ).$defs.item.required;
    const { item } = await one(`outcome type ebsr dimension character subject "Mara" standard rl-1 {}`);
    for (const key of required) expect(item, `missing ${key}`).toHaveProperty(key);
  });
});

// SPDX-License-Identifier: MIT
// Tests for the RAG embedding helpers (src/embedding.ts): passage-free embeddingText, the design
// signature tags/facets derived from the composed item, and query-side facet extraction.
import { describe, it, expect } from "vitest";
// @ts-expect-error — sibling repo, plain JS, no types
import { parser } from "../../../../graffiticode/packages/parser/src/index.js";
import {
  lexicon,
  compiler,
  buildEmbeddingArtifacts,
  buildSignatureTags,
  buildSignatureFromSource,
  stripReadingPassage,
  extractQueryFacets,
} from "../dist/index.js";

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

const POOL = `claims [
  claim id "c1" status supported dimension character subject "Mara" standard rl-1 text "Mara cares more about the tide pool than the picnic." cites ["e1" "e2" "e3"] {},
  claim id "c2" status distractor error-type misreads-detail plausibility 0.9 targets ["q1"] text "Mara is angry at her brother." rationale "Silence is absorption, not anger." cites ["e2"] {},
  claim id "c3" status distractor error-type erroneous-inference targets ["q1"] text "Mara dislikes the outdoors." rationale "Contradicted by her smile." cites ["e4"] {},
  claim id "c4" status distractor error-type faulty-reasoning targets ["q1"] text "Mara fears her family." rationale "Whisper treated as fear." cites ["e4"] {},
  claim id "c5" status distractor error-type misreads-detail targets ["q1"] text "Mara is bored." rationale "Stillness is focus." cites ["e4"] {}
]
evidence [
  source id "e1" line 1 status directly-supports supports ["c1"] {},
  source id "e2" line 2 status supports-wrong-claim supports ["c1" "c2"] {},
  source id "e3" line 4 status directly-supports supports ["c1"] {},
  source id "e4" line 6 status irrelevant supports [] {}
]`;

const Q1 =
  `outcome id "q1" type ebsr dimension character subject "Mara" standard rl-1 focus "c1" ` +
  `stem "Which of these inferences about Mara is supported by the passage?" ` +
  `stem-b "Which sentence(s) from the passage best support your answer in Part A?" {}`;

const PROG = `${PASSAGE}\n${POOL}\noutcomes [ ${Q1} ]\n{}..`;

// A captured prompt as a user would type it: the passage prose pasted in, then the instruction.
const PROMPT = [
  "Mara crouched at the edge of the tide pool, ignoring the picnic behind her.",
  "Her brother called twice, but she did not turn around.",
  "A tiny crab scuttled under a rock, and Mara smiled for the first time all day.",
  "She traced the cold water as if the pool were the only thing that mattered.",
  "Five more minutes, she whispered, though no one was listening.",
  "Behind her, paper plates rustled and her mother laughed.",
  "",
  "Write an EBSR item about what Mara cares about, standard rl-1, dimension character.",
].join("\n");

describe("buildEmbeddingArtifacts", () => {
  it("strips the passage prose from the embedding text but keeps the instruction", async () => {
    const { errors, data } = await compile(PROG);
    expect(errors).toHaveLength(0);
    const { embeddingText } = buildEmbeddingArtifacts({ prompt: PROMPT, data });

    // Passage-only prose is gone.
    for (const fragment of ["crouched", "scuttled", "paper plates", "tide pool", "whispered"]) {
      expect(embeddingText.toLowerCase()).not.toContain(fragment);
    }
    // The authoring instruction survives.
    expect(embeddingText.toLowerCase()).toContain("ebsr");
    expect(embeddingText.toLowerCase()).toContain("standard rl-1");
    // And it is far shorter than the polluted prompt.
    expect(embeddingText.length).toBeLessThan(PROMPT.length / 2);
  });

  it("derives passage-independent design tags and facets from the composed item", async () => {
    const { data } = await compile(PROG);
    const { tags, facets } = buildEmbeddingArtifacts({ prompt: PROMPT, data });

    expect(tags).toEqual(
      expect.arrayContaining([
        "item:ebsr",
        "target:c1-t4",
        "type:literary",
        "dimension:character",
        "standard:rl-1",
        "shape:two-part",
      ]),
    );
    // The selected distractors' error-types ride along as design signal.
    expect(tags.some((t: string) => t.startsWith("distractor:"))).toBe(true);

    expect(facets.target).toBe("c1-t4");
    expect(facets.passageType).toBe("literary");
    expect(facets.itemTypes).toContain("ebsr");
  });

  it("normalizes the focus subject out of the stem signature", async () => {
    const { data } = await compile(PROG);
    const { normalizedStem } = buildSignatureTags(data);
    expect(normalizedStem).not.toContain("Mara");
    expect(normalizedStem).toContain("the subject");
  });
});

describe("buildEmbeddingArtifacts from source (console doc-side path, no compiler)", () => {
  it("derives the same passage-free embedding text and tags straight from program code", () => {
    const { embeddingText, tags, facets, normalizedStem } = buildEmbeddingArtifacts({ prompt: PROMPT, code: PROG });

    for (const fragment of ["crouched", "scuttled", "paper plates"]) {
      expect(embeddingText.toLowerCase()).not.toContain(fragment);
    }
    expect(embeddingText.toLowerCase()).toContain("ebsr");

    expect(tags).toEqual(
      expect.arrayContaining([
        "item:ebsr",
        "target:c1-t4",
        "type:literary",
        "dimension:character",
        "standard:rl-1",
        "shape:two-part",
        "distractor:misreads-detail",
      ]),
    );
    expect(facets.target).toBe("c1-t4");
    expect(facets.itemTypes).toContain("ebsr");
    expect(normalizedStem).not.toContain("Mara");
    expect(normalizedStem).toContain("the subject");
  });

  it("buildSignatureFromSource captures all authored distractor error-types", () => {
    const { tags } = buildSignatureFromSource(PROG);
    expect(tags).toEqual(
      expect.arrayContaining([
        "distractor:misreads-detail",
        "distractor:erroneous-inference",
        "distractor:faulty-reasoning",
      ]),
    );
  });
});

describe("stripReadingPassage (query side, no code)", () => {
  it("keeps the cue-bearing instruction sentence and drops prose", () => {
    const out = stripReadingPassage(PROMPT);
    expect(out.toLowerCase()).toContain("ebsr");
    expect(out.toLowerCase()).not.toContain("crab");
  });
});

describe("extractQueryFacets", () => {
  it("maps an informational prompt to c1-t11", () => {
    const f = extractQueryFacets(
      "From an informational article about bridge design, write an EBSR item, standard ri-3.",
    );
    expect(f.target).toBe("c1-t11");
    expect(f.passageType).toBe("informational");
    expect(f.itemTypes).toContain("ebsr");
    expect(f.standards).toContain("ri-3");
  });

  it("maps a literary prompt to c1-t4 and detects hot text", () => {
    const f = extractQueryFacets("From a short story about a girl at a tide pool, write a hot text item.");
    expect(f.target).toBe("c1-t4");
    expect(f.passageType).toBe("literary");
    expect(f.itemTypes).toContain("hot-text");
  });

  it("prefers an explicit target token over prose cues", () => {
    const f = extractQueryFacets("Write a c1-t11 item. It is a short story.");
    expect(f.target).toBe("c1-t11");
  });
});

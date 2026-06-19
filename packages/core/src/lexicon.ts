// SPDX-License-Identifier: MIT
// L0175's lexicon = L0000's base vocabulary + L0175's ELA item-composition additions
// (child keys win on merge). The authoring surface is the l0169 "builder" idiom:
//   - attribute functions are arity-2 (value, continuation) and merge one key into the
//     continuation record: `attr value cont` -> { ...cont, key: value };
//   - collection builders are arity-2 (list, continuation);
//   - element wrappers are arity-1 (the assembled attribute-chain record).
// A program is one flat chain terminated by a single `{}` at the end.
//
// Enum VALUES (ebsr, character, misreads-detail, rl-1, ...) are bare kebab-case identifiers
// with NO lexicon entries: an undefined identifier resolves to its own lexeme string via
// L0000's IDENT fallback, and composition validates it against the allowed set.
import { lexicon as base } from "@graffiticode/l0000";

const fn2 = (name: string) => ({ tk: 1, name, cls: "function", length: 2, arity: 2 });
const fn1 = (name: string) => ({ tk: 1, name, cls: "function", length: 1, arity: 1 });

// Enum values are bare kebab-case identifiers registered as nullary tags (tk:22, name:"TAG").
// The parser rejects undefined references, so each must be a lexicon entry; at transform time
// a tag resolves to a `{ tag: <lexeme> }` value, which composition normalizes to its string.
// The flat UNION of valid bare tags across all targets. Each target profile (in compiler.ts)
// restricts which dimensions/standards are valid for that target; the lexicon only needs to
// register every tag so the parser accepts it.
const ENUM_VALUES = [
  "literary", "informational",
  "ebsr", "hot-text", "short-text",
  // learning targets (the top-level `target` selector)
  "c1-t4", "c1-t11",
  // T4 (literary) dimensions
  "character", "setting", "event", "point-of-view",
  "theme", "topic", "narrators-feelings", "character-relationship",
  // T11 (informational) dimensions (point-of-view shared with T4)
  "relationships-interactions", "author-use-of-information", "purpose", "authors-opinion",
  "supported", "distractor",
  "directly-supports", "supports-wrong-claim", "irrelevant",
  "misreads-detail", "erroneous-inference", "faulty-reasoning",
  // standards: RL (T4) + RI (T11)
  "rl-1", "rl-3", "rl-6", "rl-9",
  "ri-1", "ri-3", "ri-6", "ri-7", "ri-8", "ri-9",
  "r-dok3",
  "inference", "conclusion", "author-intent",
];
const enums = Object.fromEntries(
  ENUM_VALUES.map((v) => [v, { tk: 22, name: "TAG", cls: "val", length: 0, arity: 0 }]),
);

const additions = {
  // --- attribute functions (arity-2) ---
  id: fn2("ID"),
  status: fn2("STATUS"),
  dimension: fn2("DIMENSION"),
  "error-type": fn2("ERROR_TYPE"),
  text: fn2("TEXT"),
  rationale: fn2("RATIONALE"),
  cites: fn2("CITES"), // claim -> evidence id list
  targets: fn2("TARGETS"), // distractor claim -> outcome id list (the questions it foils)
  line: fn2("LINE"), // evidence -> passage line number
  quote: fn2("QUOTE"), // optional evidence text override
  supports: fn2("SUPPORTS"), // evidence -> claim id list
  type: fn2("TYPE"), // passage type OR item type (contextual)
  subject: fn2("SUBJECT"),
  standard: fn2("STANDARD"),
  focus: fn2("FOCUS"), // optional forced correct-claim id
  passage: fn2("PASSAGE"), // passage heading
  lines: fn2("LINES"), // passage line strings (auto-indexed)
  title: fn2("TITLE"),
  target: fn2("TARGET"), // top-level SBAC learning target selector (c1-t4 | c1-t11)
  stem: fn2("STEM"),
  rubric: fn2("RUBRIC"),
  dok: fn2("DOK"),
  plausibility: fn2("PLAUSIBILITY"), // optional 0..1 author override for distractor ranking
  mode: fn2("MODE"), // stem mode: inference | conclusion | author-intent
  other: fn2("OTHER"), // second subject, for character-relationship stems
  "stem-b": fn2("STEM_B"), // optional Part B stem override
  score: fn2("SCORE"), // rubric band score
  descriptor: fn2("DESCRIPTOR"), // rubric band descriptor

  // --- collection builders (arity-2) ---
  claims: fn2("CLAIMS"),
  evidence: fn2("EVIDENCE"),
  outcomes: fn2("OUTCOMES"),

  // --- element wrappers (arity-1) ---
  claim: fn1("CLAIM"),
  source: fn1("SOURCE"),
  outcome: fn1("OUTCOME"),
  band: fn1("BAND"), // a rubric band: score + descriptor
};

export const lexicon = { ...base, ...enums, ...additions };

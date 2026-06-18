// SPDX-License-Identifier: MIT
/* Copyright (c) 2026, ARTCOMPILER INC */
//
// L0175 — a content-composition language for 5th-grade ELA assessment items
// (Smarter Balanced · Grade 5 · Claim 1 · Target 4: Reasoning & Evidence).
//
// A program authors an inline SUPERSET of tagged content for a literary passage —
// candidate inference/conclusion `claim`s and evidence `source`s, each tagged — plus one
// or more `outcome`s. The overridden PROG runs a deterministic COMPOSE that selects, per
// outcome, the subset of content that best fits and assembles a finished item.
//
// The authoring surface is the l0169 builder idiom; see lexicon.ts. The Transformer's
// attribute/collection/element handlers reconstruct plain records (L0000's deepConvertRecords
// supports `{ ...record, key: v0 }`), and PROG reads them as plain props and composes.
//
// Validation: enum membership + required fields are HARD errors (pushed into the error array,
// failing the compile, per the Compiler pipeline). Selection compromises (missing id refs,
// thin distractor pools, unsatisfiable outcomes, hot-text ambiguity) are non-fatal WARNINGS
// carried in each item's `warnings`.
import {
  Checker as BaseChecker,
  Transformer as BaseTransformer,
  Compiler,
} from "@graffiticode/l0000";

// ---------------------------------------------------------------------------
// Enumerations (the closed vocabularies; bare kebab identifiers resolve to these strings).
// ---------------------------------------------------------------------------
const ITEM_TYPES = new Set(["ebsr", "hot-text", "short-text"]);
const PASSAGE_TYPES = new Set(["literary", "informational"]);
const DIMENSIONS = new Set([
  "character", "setting", "event", "point-of-view",
  "theme", "topic", "narrators-feelings", "character-relationship",
]);
const CLAIM_STATUS = new Set(["supported", "distractor"]);
const SOURCE_STATUS = new Set(["directly-supports", "supports-wrong-claim", "irrelevant"]);
const ERROR_TYPES = ["misreads-detail", "erroneous-inference", "faulty-reasoning"];
const STANDARDS = new Set(["rl-1", "rl-3", "rl-6", "rl-9"]);

// Small prior on distractor temptingness by error type (DOK3 rewards reasoning errors over
// surface misreads). Used by the computed plausibility score; author `plausibility` overrides it.
const ERROR_TYPE_PRIOR: Record<string, number> = {
  "faulty-reasoning": 0.1, "erroneous-inference": 0.08, "misreads-detail": 0.05,
};

// Hand-tuned thresholds — located here for later calibration (the IRT/response-data track in
// the backlog would replace these and the plausibility/rankClaims weights with learned values).
const TUNING = {
  MIN_VIABLE_DISTRACTORS: 5, // below this, warn — a richer pool gives selection real choice
  DISTRACTOR_SLOTS: 3, // foils chosen per item (Part A)
  PART_OPTIONS: 4, // options per part (EBSR Part A/B)
  HOT_TEXT_DEFENSIBLE_EXTRA: 2, // extra defensible lines before recommending EBSR over Hot Text
  SHORT_TEXT_MIN_LINES: 6, // shorter literary passage → warn
};

// Which standard the dimension implies (rl-1 — cite evidence — is foundational to every item).
const DIM_STANDARD: Record<string, string> = {
  "character": "rl-3", "character-relationship": "rl-3", "setting": "rl-3", "event": "rl-3",
  "point-of-view": "rl-6", "narrators-feelings": "rl-6",
  "theme": "rl-9", "topic": "rl-9",
};

// --- Appropriate Stems (Smarter Balanced · Grade 5 · Claim 1 · Target 4) -------------------
// Encoded directly from the guideline's "Appropriate Stems" lists. Hardcoded to T4 for now; a
// future version would load these from a per-guideline parameter source (there are 100s of
// targets). Stems vary by item type, by `mode` (inference | conclusion | author-intent), and by
// the dimension's "about" phrase. Authors can override the Part A stem / prompt via `stem`.
const MODES = new Set(["inference", "conclusion", "author-intent"]);
const LEAD_IN = "This question has two parts. First, answer Part A. Then, answer Part B.";

// Resolves the guideline's "[provide character's name / setting / ...]" slot.
function aboutPhrase(dim: string, subject: string, other: string): string {
  const subj = subject || "the character";
  switch (dim) {
    case "narrators-feelings": return `the narrator's feelings toward ${subj}`;
    case "character-relationship": return `${subj}'s relationship with ${other || "another character"}`;
    case "point-of-view": return "the author's point of view";
    case "setting": return "the setting";
    case "event": return "the events";
    case "theme": return "the theme";
    case "topic": return "the topic";
    default: return subj; // character
  }
}

function partAStem(itemType: string, mode: string, about: string): string {
  if (itemType === "hot-text") {
    if (mode === "conclusion") return `Click on the statement that best provides a conclusion that can be drawn about ${about}.`;
    if (mode === "author-intent") return `Click on the statement that best describes what the author most likely meant by including ${about} in the passage.`;
    return `Click on the statement that best provides an inference about ${about} that is supported by the passage.`;
  }
  if (mode === "conclusion") return `Which of these conclusions about ${about} is supported by the passage?`;
  if (mode === "author-intent") return `What did the author most likely mean by including ${about} in the passage?`;
  return `Which of these inferences about ${about} is supported by the passage?`;
}

function partBStem(itemType: string): string {
  return itemType === "hot-text"
    ? "Click the sentence(s) from the passage that best support your answer in Part A. Choose one option."
    : "Which sentence(s) from the passage best support your answer in Part A?";
}

const DEFAULT_RUBRIC = [
  { score: 2, descriptor: "Makes a valid inference and supports it with specific, relevant details from the passage." },
  { score: 1, descriptor: "Makes a partially valid inference, or supports it with limited or only partially relevant details." },
  { score: 0, descriptor: "Does not make a valid inference, or provides no relevant textual support." },
];

// ---------------------------------------------------------------------------
// Builder attribute handlers — generated below. Each is arity-2 (value, continuation) and
// merges one key into the continuation record. ERROR_TYPE stores under the JS-friendly key.
// ---------------------------------------------------------------------------
// Per-element source coordinate, stamped onto the element record by the wrappers. A Symbol
// key keeps it out of Object.entries → it never reaches deepConvertRecords / the output.
const COORD = Symbol("coord");
const coordOf = (x: any): any => (x && x[COORD]) || {};

const ATTR_KEYS: Record<string, string> = {
  ID: "id", STATUS: "status", DIMENSION: "dimension", ERROR_TYPE: "errorType",
  TEXT: "text", RATIONALE: "rationale", CITES: "cites", LINE: "line", QUOTE: "quote",
  SUPPORTS: "supports", TYPE: "type", SUBJECT: "subject", STANDARD: "standard",
  FOCUS: "focus", PASSAGE: "passage", LINES: "lines", TITLE: "title", STEM: "stem",
  RUBRIC: "rubric", DOK: "dok", PLAUSIBILITY: "plausibility", MODE: "mode", OTHER: "other",
  STEM_B: "stemB", SCORE: "score", DESCRIPTOR: "descriptor",
  CLAIMS: "claims", EVIDENCE: "evidence", OUTCOMES: "outcomes",
};

export class Checker extends BaseChecker {
  [key: string]: any;
  // Every L0175 tag falls through to L0000's CATCH_ALL (returns the node, no error), so the
  // Checker passes our custom forms cleanly; semantic validation runs in the Transformer
  // where the assembled records are readable as plain props.
}

export class Transformer extends BaseTransformer {
  [key: string]: any;

  constructor(code: any) {
    super(code);
    // Attribute & collection builders: { ...continuation, key: value }.
    for (const [tag, key] of Object.entries(ATTR_KEYS)) {
      this[tag] = (node: any, options: any, resume: any) => {
        this.visit(node.elts[0], options, (e0: any, v0: any) => {
          this.visit(node.elts[1], options, (e1: any, v1: any) => {
            const base = isPlain(v1) ? v1 : {};
            resume([].concat(e0).concat(e1), { ...base, [key]: v0 });
          });
        });
      };
    }
    // Element wrappers: pass the assembled attribute-chain record through, stamping the
    // element's source coord (Symbol key, so it never leaks into output) for error highlighting.
    for (const tag of ["CLAIM", "SOURCE", "OUTCOME", "BAND"]) {
      this[tag] = (node: any, options: any, resume: any) => {
        this.visit(node.elts[0], options, (e0: any, v0: any) => {
          if (v0 && typeof v0 === "object") v0[COORD] = node.coord ?? this.nodePool[node.elts[0]]?.coord;
          resume(e0, v0);
        });
      };
    }
  }

  PROG(node: any, options: any, resume: any) {
    this.visit(node.elts[0], options, (e0: any, v0: any) => {
      const errors: any[] = [].concat(e0 || []);
      const top = Array.isArray(v0) ? v0[v0.length - 1] : v0;
      const out = composeProgram(top || {}, errors);
      resume(errors, out);
    });
  }
}

export const compiler = new Compiler({
  langID: "0175",
  version: "v0.0.1",
  Checker,
  Transformer,
});

// ===========================================================================
// Composition (pure, deterministic — no LLM). A future error-transform pass (swap-referent,
// overgeneralize, ...) would slot in where distractor claims are gathered.
// ===========================================================================

function isPlain(v: any): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function str(v: any): string {
  // Enum values may arrive as a bare lexeme string (IDENT fallback) or, when registered as
  // tags, as a { tag } object — normalize both to the plain string.
  if (v && typeof v === "object" && typeof v.tag === "string") return v.tag;
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function slug(s: string): string {
  return str(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "p";
}

function composeProgram(top: any, errors: any[]): any {
  const heading = str(top.passage);
  const passageType = top.type !== undefined ? str(top.type) : "literary";
  const lineTexts: string[] = Array.isArray(top.lines) ? top.lines.map(str) : [];
  const claims: any[] = Array.isArray(top.claims) ? top.claims : [];
  const sources: any[] = Array.isArray(top.evidence) ? top.evidence : [];
  const outcomes: any[] = Array.isArray(top.outcomes) ? top.outcomes : [];

  // --- hard validation (fails the compile) ---
  if (passageType && !PASSAGE_TYPES.has(passageType)) {
    errors.push({ message: `Unknown passage type '${passageType}'. Expected one of: ${[...PASSAGE_TYPES].join(", ")}.` });
  }
  if (lineTexts.length === 0) {
    errors.push({ message: "Passage has no `lines`." });
  }
  for (const c of claims) validateClaim(c, errors);
  for (const s of sources) validateSource(s, errors);
  for (const o of outcomes) validateOutcome(o, errors);

  const passageId = slug(heading);
  const passage = {
    id: passageId,
    heading,
    type: passageType,
    lines: lineTexts.map((text, i) => ({ id: i + 1, text })),
  };
  const ctx = {
    passage,
    claims,
    sources,
    claimById: index(claims, "id"),
    sourceById: index(sources, "id"),
  };

  const graphWarnings = validateGraph(ctx, errors);
  const title = str(top.title);

  const items = outcomes.map((o) => composeOutcome(o, ctx, graphWarnings));
  if (items.length === 1) {
    if (title) items[0].title = title;
    return items[0];
  }
  const result: any = { kind: "items", items };
  if (title) result.title = title;
  return result;
}

function validateClaim(c: any, errors: any[]) {
  const id = str(c.id);
  const where = id ? `claim '${id}'` : "a claim";
  const at = coordOf(c);
  const push = (message: string) => errors.push({ message, ...at });
  if (!CLAIM_STATUS.has(str(c.status))) {
    push(`${where}: invalid status '${str(c.status)}'. Expected supported or distractor.`);
  }
  // dimension is required on supported claims (it must match the outcome); optional on
  // distractors (foils share the item's dimension by construction), but validated if present.
  if (str(c.dimension)) {
    if (!DIMENSIONS.has(str(c.dimension))) push(`${where}: invalid dimension '${str(c.dimension)}'.`);
  } else if (str(c.status) === "supported") {
    push(`${where}: supported claim needs a dimension.`);
  }
  if (!str(c.text)) push(`${where}: missing text.`);
  if (str(c.status) === "distractor") {
    if (!ERROR_TYPES.includes(str(c.errorType))) {
      push(`${where}: distractor needs a valid error-type (${ERROR_TYPES.join(", ")}).`);
    }
    if (!str(c.rationale)) {
      push(`${where}: distractor needs a rationale (the justification for the foil).`);
    }
  }
  if (c.plausibility !== undefined && (typeof c.plausibility !== "number" || c.plausibility < 0 || c.plausibility > 1)) {
    push(`${where}: plausibility must be a number between 0 and 1.`);
  }
}

function validateSource(s: any, errors: any[]) {
  const id = str(s.id);
  const where = id ? `source '${id}'` : "a source";
  const at = coordOf(s);
  const push = (message: string) => errors.push({ message, ...at });
  if (!id) push(`${where}: missing id.`);
  if (!SOURCE_STATUS.has(str(s.status))) {
    push(`${where}: invalid status '${str(s.status)}'. Expected directly-supports, supports-wrong-claim, or irrelevant.`);
  }
  if (s.line === undefined && !str(s.quote)) {
    push(`${where}: needs a line number or a quote.`);
  }
}

function validateOutcome(o: any, errors: any[]) {
  const at = coordOf(o);
  const push = (message: string) => errors.push({ message, ...at });
  if (!ITEM_TYPES.has(str(o.type))) {
    push(`outcome: invalid type '${str(o.type)}'. Expected ebsr, hot-text, or short-text.`);
  }
  if (!DIMENSIONS.has(str(o.dimension))) push(`outcome: invalid dimension '${str(o.dimension)}'.`);
  if (o.standard !== undefined && !STANDARDS.has(str(o.standard))) push(`outcome: invalid standard '${str(o.standard)}'.`);
  if (o.mode !== undefined && !MODES.has(str(o.mode))) {
    push(`outcome: invalid mode '${str(o.mode)}'. Expected inference, conclusion, or author-intent.`);
  }
}

function index(arr: any[], key: string): Record<string, any> {
  const m: Record<string, any> = {};
  for (const x of arr) if (x && x[key] !== undefined) m[str(x[key])] = x;
  return m;
}

// Program-level referential integrity. Duplicate ids corrupt the indices → hard errors;
// dangling references and out-of-range lines are non-fatal warnings (the plan's deferred
// cross-reference checks). Returns the warnings to seed each item's `warnings`.
function validateGraph(ctx: any, errors: any[]): string[] {
  const warnings: string[] = [];
  const lineCount = ctx.passage.lines.length;
  for (const [label, arr] of [["claim", ctx.claims], ["source", ctx.sources]] as const) {
    const seen = new Set<string>();
    for (const x of arr) {
      const id = str(x.id);
      if (!id) continue;
      if (seen.has(id)) errors.push({ message: `Duplicate ${label} id '${id}'.`, ...coordOf(x) });
      seen.add(id);
    }
  }
  for (const c of ctx.claims) {
    for (const ref of Array.isArray(c.cites) ? c.cites : []) {
      if (!ctx.sourceById[str(ref)]) warnings.push(`claim '${str(c.id)}' cites unknown evidence id '${str(ref)}'.`);
    }
  }
  for (const s of ctx.sources) {
    for (const ref of Array.isArray(s.supports) ? s.supports : []) {
      if (!ctx.claimById[str(ref)]) warnings.push(`source '${str(s.id)}' supports unknown claim id '${str(ref)}'.`);
    }
    if (s.line !== undefined && !str(s.quote)) {
      const ln = Number(s.line);
      if (!Number.isFinite(ln) || ln < 1 || ln > lineCount) {
        warnings.push(`source '${str(s.id)}' line ${str(s.line)} is outside the passage (1..${lineCount}).`);
      }
    }
  }
  return warnings;
}

function standardsFor(outcome: any, correct: any, dim: string): string[] {
  const companion = str(outcome.standard) || str(correct && correct.standard) || DIM_STANDARD[dim];
  const out = ["rl-1"];
  if (companion && companion !== "rl-1") out.push(companion);
  return out;
}

function sourceText(s: any, passage: any): string {
  if (str(s.quote)) return str(s.quote);
  const ln = passage.lines.find((l: any) => l.id === s.line);
  return ln ? ln.text : "";
}

// Deterministic shuffle (seeded) so recompiling the same program yields stable option labels.
function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rnd = mulberry32(strHash(seed));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const LABELS = ["A", "B", "C", "D", "E", "F"];

// Rank supported candidates by fit to the outcome; best first, tie-break by id.
function rankClaims(cands: any[], outcome: any, ctx: any): any[] {
  const scored = cands.map((c) => {
    let s = 0;
    if (str(outcome.standard) && str(c.standard) === str(outcome.standard)) s += 4;
    if (str(outcome.dok) && str(c.dok) === str(outcome.dok)) s += 2;
    if (str(outcome.subject) && str(c.subject).toLowerCase() === str(outcome.subject).toLowerCase()) s += 4;
    const direct = (Array.isArray(c.cites) ? c.cites : [])
      .map((id: any) => ctx.sourceById[str(id)])
      .filter((src: any) => src && str(src.status) === "directly-supports");
    s += Math.min(direct.length, 3); // richness
    const ls = direct.map((d: any) => d.line).filter((n: any) => typeof n === "number");
    if (ls.length > 1) s += Math.max(...ls) - Math.min(...ls) > 1 ? 2 : 1; // spread (DOK3)
    return { c, s };
  });
  scored.sort((a, b) => b.s - a.s || str(a.c.id).localeCompare(str(b.c.id)));
  return scored.map((x) => x.c);
}

// Distinct = not a normalized-text duplicate of an already-chosen option.
function norm(t: string): string {
  return str(t).toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// How tempting a distractor is to a partial-understander, in [0,1]. An author-supplied
// `plausibility` overrides (pins) the score; otherwise it is computed from graph signals:
// evidence that also backs the correct claim (a confused student would cite it), same
// dimension as the correct answer, structural parallelism, and an error-type prior.
export function plausibility(d: any, correct: any, ctx: any): number {
  if (typeof d.plausibility === "number") return clamp01(d.plausibility); // author override
  let s = 0.4; // base
  const cited = (Array.isArray(d.cites) ? d.cites : [])
    .map((id: any) => ctx.sourceById[str(id)])
    .filter(Boolean);
  const overlaps = cited.some((src: any) =>
    str(src.status) === "supports-wrong-claim" &&
    (Array.isArray(src.supports) ? src.supports.map(str) : []).includes(str(correct.id)));
  if (overlaps) s += 0.3; // strongest tell: real text seems to back the foil
  if (str(d.dimension) && str(d.dimension) === str(correct.dimension)) s += 0.15;
  const la = str(d.text).length, lb = str(correct.text).length;
  if (la && lb) s += 0.1 * (1 - Math.abs(la - lb) / Math.max(la, lb)); // structural parallelism
  s += ERROR_TYPE_PRIOR[str(d.errorType)] ?? 0;
  return clamp01(s);
}

function selectDistractorClaims(correct: any, ctx: any, warnings: string[]): any[] {
  const all = ctx.claims.filter((c: any) => str(c.status) === "distractor");
  const sameDim = all.filter((c: any) => str(c.dimension) === str(correct.dimension));
  const pool = sameDim.length >= 3 ? sameDim : all;
  const seen = new Set([norm(correct.text)]);
  // Rank candidates by plausibility (desc), tie-break by id for determinism.
  const byScore = (a: any, b: any) =>
    plausibility(b, correct, ctx) - plausibility(a, correct, ctx) || str(a.id).localeCompare(str(b.id));
  const byType: Record<string, any[]> = {};
  for (const c of pool) (byType[str(c.errorType)] = byType[str(c.errorType)] || []).push(c);
  for (const t of ERROR_TYPES) byType[t]?.sort(byScore);
  const chosen: any[] = [];
  const take = (c: any) => {
    if (!c) return;
    const n = norm(c.text);
    if (seen.has(n)) { warnings.push(`Dropped near-duplicate distractor '${str(c.id)}'.`); return; }
    seen.add(n); chosen.push(c);
  };
  // Coverage: take the most plausible foil of each error type.
  for (const t of ERROR_TYPES) if (byType[t] && byType[t].length) take(byType[t].shift());
  // Fill remaining slots with the most plausible leftovers.
  const rest = pool.filter((c: any) => !chosen.includes(c)).sort(byScore);
  while (chosen.length < TUNING.DISTRACTOR_SLOTS && rest.length) take(rest.shift());
  if (chosen.length < TUNING.DISTRACTOR_SLOTS) warnings.push(`Only ${chosen.length} distractor claim(s) available; an EBSR/Hot-Text item wants 3.`);
  const missing = ERROR_TYPES.filter((t) => !chosen.some((c) => str(c.errorType) === t));
  if (missing.length) warnings.push(`Distractor error types not represented: ${missing.join(", ")}.`);
  return chosen.slice(0, TUNING.DISTRACTOR_SLOTS);
}

function partAOptions(correct: any, distractors: any[], seed: string) {
  const opts = [
    { text: str(correct.text), correct: true, claimId: str(correct.id) },
    ...distractors.map((d) => ({ text: str(d.text), correct: false, claimId: str(d.id), errorType: str(d.errorType) })),
  ];
  return labelize(seededShuffle(opts, seed + ":A"));
}

function labelize(opts: any[]) {
  return opts.map((o, i) => ({ key: LABELS[i], ...o }));
}

function composeOutcome(outcome: any, ctx: any, graphWarnings: string[] = []): any {
  const warnings: string[] = [...graphWarnings];
  const dim = str(outcome.dimension);
  const itemType = str(outcome.type);
  const subject = str(outcome.subject);
  const dok = str(outcome.dok) || "r-dok3";
  const seed = `${ctx.passage.id}:${dim}:${itemType}`;

  // 1. Select the correct claim from possibly many supported candidates.
  const candidates = ctx.claims.filter((c: any) => str(c.status) === "supported" && str(c.dimension) === dim);
  let correct: any = null;
  if (str(outcome.focus)) {
    correct = ctx.claimById[str(outcome.focus)];
    if (!correct) warnings.push(`focus claim '${str(outcome.focus)}' not found; ranking instead.`);
  }
  if (!correct) correct = rankClaims(candidates, outcome, ctx)[0];
  if (!correct) {
    warnings.push(`Outcome dimension '${dim}' cannot be satisfied: no supported claim with that dimension.`);
    return baseItem(itemType, outcome, ctx, dim, dok, null, warnings);
  }
  const alternativeClaims = Math.max(0, candidates.length - 1);

  const item = baseItem(itemType, outcome, ctx, dim, dok, correct, warnings);
  item.review.alternativeClaims = alternativeClaims;

  const directSources = (Array.isArray(correct.cites) ? correct.cites : [])
    .map((id: any) => ctx.sourceById[str(id)])
    .filter((s: any) => s && str(s.status) === "directly-supports");

  if (itemType === "short-text") {
    item.prompt = str(outcome.stem) || shortTextPrompt(dim, subject, str(outcome.mode) || "inference", str(outcome.other));
    item.rubric = Array.isArray(outcome.rubric) && outcome.rubric.length
      ? outcome.rubric.map((b: any) => ({ score: Number(b.score), descriptor: str(b.descriptor) }))
      : DEFAULT_RUBRIC;
    item.distractorAnalysis = [];
    item.answerKey = { rationale: str(correct.rationale) };
    if (ctx.passage.lines.length < TUNING.SHORT_TEXT_MIN_LINES) warnings.push("Short Text items should use a long literary passage; this passage is short.");
    return item;
  }

  // EBSR & Hot Text share Part A (statement options).
  // Viability check: a healthy pool has >=5 distinct distractors usable for this dimension, so
  // selection (and the plausibility ranking) has real choice. Thin pools warn — a signal the
  // upstream generator's repair loop can use to regenerate more foils.
  const viableDistractors = new Set(
    ctx.claims
      .filter((c: any) => str(c.status) === "distractor" && (!str(c.dimension) || str(c.dimension) === dim))
      .map((c: any) => norm(str(c.text))),
  ).size;
  if (viableDistractors < TUNING.MIN_VIABLE_DISTRACTORS) {
    warnings.push(`Only ${viableDistractors} viable distractor(s) for dimension '${dim}'; author at least 5 for stronger selection.`);
  }
  const distractors = selectDistractorClaims(correct, ctx, warnings);
  item.partA = { options: partAOptions(correct, distractors, seed) };
  const aKey = item.partA.options.find((o: any) => o.correct)?.key;
  const analysis: any[] = item.partA.options
    .filter((o: any) => !o.correct)
    .map((o: any) => {
      const claim = ctx.claimById[o.claimId];
      return {
        part: "A", key: o.key, claimId: o.claimId, errorType: o.errorType,
        tiesTo: [o.claimId],
        plausibility: Math.round(plausibility(claim, correct, ctx) * 100) / 100,
        rationale: str(claim?.rationale),
      };
    });

  if (itemType === "hot-text") {
    const directLines = new Set(directSources.map((s: any) => s.line));
    item.selectable = ctx.passage.lines.map((l: any) => ({ lineId: l.id, text: l.text, correct: directLines.has(l.id) }));
    if (directLines.size === 0) warnings.push("No directly-supporting evidence for the correct claim; Part B has no correct selection.");
    // Defensible-options guard: direct support + wrong-claim sources that also reference the correct claim.
    const extra = ctx.sources.filter((s: any) =>
      str(s.status) === "supports-wrong-claim" &&
      (Array.isArray(s.supports) ? s.supports.map(str) : []).includes(str(correct.id))).length;
    if (extra >= TUNING.HOT_TEXT_DEFENSIBLE_EXTRA) warnings.push(`Hot Text: ${directLines.size + extra} defensible supporting selections — recommend EBSR (Task Model 1).`);
    item.distractorAnalysis = analysis;
    item.answerKey = { partA: aKey, rationale: str(correct.rationale) };
    return item;
  }

  // EBSR Part B — curated 4 line options.
  const correctSrc = directSources[0];
  const distractorSrcs = pickPartBDistractors(correct, distractors, ctx);
  const bOpts = [
    ...(correctSrc ? [{ line: correctSrc.line, text: sourceText(correctSrc, ctx.passage), correct: true, sourceId: str(correctSrc.id) }] : []),
    ...distractorSrcs.map((s: any) => ({
      line: s.line, text: sourceText(s, ctx.passage), correct: false, sourceId: str(s.id),
      status: str(s.status), tiesTo: firstWrongClaim(s, correct),
    })),
  ];
  if (!correctSrc) warnings.push("No directly-supporting evidence for the correct claim; EBSR Part B has no correct option.");
  if (bOpts.length < TUNING.PART_OPTIONS) warnings.push(`Only ${bOpts.length} Part B option(s) available; EBSR wants 4.`);
  item.partB = { options: labelize(seededShuffle(bOpts, seed + ":B")) };
  const bKey = item.partB.options.find((o: any) => o.correct)?.key;

  // A<->B no-giveaway check: at least one Part B distractor should also tie to the correct claim.
  const overlap = distractorSrcs.some((s: any) => (Array.isArray(s.supports) ? s.supports.map(str) : []).includes(str(correct.id)));
  if (distractorSrcs.length && !overlap) {
    warnings.push("Part B options do not overlap the correct Part A option — possible A↔B giveaway.");
  }

  for (const o of item.partB.options) {
    if (!o.correct) {
      analysis.push({
        part: "B", key: o.key, sourceId: o.sourceId, status: o.status, tiesTo: o.tiesTo,
        rationale: partBRationale(ctx.sourceById[o.sourceId], o.status),
      });
    }
  }
  item.distractorAnalysis = analysis;
  item.answerKey = { partA: aKey, partB: bKey, rationale: str(correct.rationale) };
  return item;
}

function pickPartBDistractors(correct: any, distractors: any[], ctx: any): any[] {
  const distractorIds = new Set(distractors.map((d) => str(d.id)));
  const wrong = ctx.sources.filter((s: any) =>
    str(s.status) === "supports-wrong-claim" &&
    (Array.isArray(s.supports) ? s.supports.map(str) : []).some((id: string) => distractorIds.has(id)));
  const irrelevant = ctx.sources.filter((s: any) => str(s.status) === "irrelevant");
  const out: any[] = [];
  const seen = new Set<string>();
  for (const s of [...wrong, ...irrelevant]) {
    if (out.length >= 3) break;
    if (seen.has(str(s.id))) continue;
    seen.add(str(s.id));
    out.push(s);
  }
  return out;
}

function firstWrongClaim(s: any, correct: any): string {
  const ids = (Array.isArray(s.supports) ? s.supports.map(str) : []).filter((id: string) => id !== str(correct.id));
  return ids[0] || "";
}

function partBRationale(s: any, status: string): string {
  if (s && str(s.rationale)) return str(s.rationale);
  if (status === "supports-wrong-claim") return "Real evidence, but it supports a different (erroneous) inference, not the correct one.";
  return "Does not directly support the inference.";
}

function shortTextPrompt(dim: string, subject: string, mode: string, other: string): string {
  const about = aboutPhrase(dim, subject, other);
  const lead = mode === "conclusion" ? `What conclusion can be drawn about ${about}?`
    : mode === "author-intent" ? `What did the author most likely mean by including ${about} in the passage?`
      : `What inference can be made about ${about}?`;
  return `${lead} Explain using key details from the passage to support your answer.`;
}

function stemFor(itemType: string, dim: string, subject: string, mode: string, other: string, override: string, overrideB: string) {
  const about = aboutPhrase(dim, subject, other);
  return {
    partA: override || partAStem(itemType, mode, about),
    partB: overrideB || partBStem(itemType),
    leadIn: LEAD_IN,
  };
}

function baseItem(itemType: string, outcome: any, ctx: any, dim: string, dok: string, correct: any, warnings: string[]): any {
  const scoring = itemType === "short-text"
    ? "0–2 points; hand-scored against the rubric."
    : "Both parts correct = 1 point; otherwise 0.";
  return {
    kind: "item",
    id: `${ctx.passage.id}-${itemType}-${dim}`,
    type: itemType,
    standards: standardsFor(outcome, correct, dim),
    dok,
    dimension: dim,
    passage: ctx.passage,
    passages: null,
    stem: stemFor(itemType, dim, str(outcome.subject),
      str(outcome.mode) || "inference", str(outcome.other), str(outcome.stem), str(outcome.stemB)),
    distractorAnalysis: [],
    answerKey: {},
    review: {
      standards: standardsFor(outcome, correct, dim),
      dok,
      dimension: dim,
      scoring,
      correctClaim: correct ? { id: str(correct.id), text: str(correct.text) } : null,
      alternativeClaims: 0,
    },
    warnings,
  };
}

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
// the backlog would replace these and the plausibility weights with learned values).
const TUNING = {
  MIN_VIABLE_DISTRACTORS: 5, // below this, warn — a richer Part A pool gives selection real choice
  MIN_VIABLE_PART_B: 5, // below this many Part B foil sources, warn (item draws 3 of them)
  DISTRACTOR_SLOTS: 3, // foils chosen per item (Part A or Part B)
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

// --- Stems (Smarter Balanced · Grade 5 · Claim 1 · Target 4) --------------------------------
// Stems are AUTHORED, not generated: the upstream code generator instantiates the guideline's
// "Appropriate Stems" catalog (spec/stems.md) and emits each item's `stem` (and `stem-b` on
// EBSR) on the outcome. The compiler trusts the authored text — it does not synthesize stems.
// The two invariants below are not per-item question text: the EBSR lead-in and the fixed
// Hot-Text Part B selection instruction (Hot Text has no authored Part B stem).
const LEAD_IN = "This question has two parts. First, answer Part A. Then, answer Part B.";
const HOT_TEXT_PART_B = "Click the sentence(s) from the passage that best support your answer in Part A. Choose one option.";

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
  TEXT: "text", RATIONALE: "rationale", CITES: "cites", TARGETS: "targets",
  LINE: "line", QUOTE: "quote",
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
    outcomes,
    claimById: index(claims, "id"),
    sourceById: index(sources, "id"),
    outcomeById: index(outcomes, "id"),
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
  // dimension is required on supported claims (it must match the outcome); on distractors the
  // binding is by `targets` (not dimension), so it is optional there but validated if present.
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
    if (!Array.isArray(c.targets) || c.targets.length === 0) {
      push(`${where}: distractor needs targets (the outcome id(s) of the question(s) it foils).`);
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
  const id = str(o.id);
  const where = id ? `outcome '${id}'` : "an outcome";
  const at = coordOf(o);
  const push = (message: string) => errors.push({ message, ...at });
  if (!id) push(`${where}: missing id (each question needs a unique id so distractors can target it).`);
  if (!ITEM_TYPES.has(str(o.type))) {
    push(`${where}: invalid type '${str(o.type)}'. Expected ebsr, hot-text, or short-text.`);
  }
  if (!DIMENSIONS.has(str(o.dimension))) push(`${where}: invalid dimension '${str(o.dimension)}'.`);
  if (o.standard !== undefined && !STANDARDS.has(str(o.standard))) push(`${where}: invalid standard '${str(o.standard)}'.`);
  // Item-first contract: the question owns its correct answer (focus) and its stem text,
  // authored from the guideline's Appropriate-Stem catalog (the compiler no longer synthesizes stems).
  if (!str(o.focus)) push(`${where}: missing focus (the id of the supported claim this question is built around).`);
  if (!str(o.stem)) push(`${where}: missing stem (author it from the guideline's Appropriate-Stem catalog).`);
  if (str(o.type) === "ebsr" && !str(o.stemB)) push(`${where}: EBSR needs a Part B stem (stem-b).`);
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
  for (const [label, arr] of [["claim", ctx.claims], ["source", ctx.sources], ["outcome", ctx.outcomes]] as const) {
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
    // A distractor's targets must name real questions (hard error — the binding is the contract).
    if (str(c.status) === "distractor") {
      for (const ref of Array.isArray(c.targets) ? c.targets : []) {
        if (!ctx.outcomeById[str(ref)]) errors.push({ message: `distractor '${str(c.id)}' targets unknown outcome id '${str(ref)}'.`, ...coordOf(c) });
      }
    }
  }
  // Each question must pin a real, supported correct answer, and (for option items) have enough
  // foils bound to it — both hard errors, so a thin or mis-wired item fails the compile.
  for (const o of ctx.outcomes) {
    const oid = str(o.id);
    const f = str(o.focus);
    if (f) {
      const fc = ctx.claimById[f];
      if (!fc) errors.push({ message: `outcome '${oid}' focus '${f}' is not a known claim id.`, ...coordOf(o) });
      else if (str(fc.status) !== "supported") errors.push({ message: `outcome '${oid}' focus '${f}' must be a supported claim, not a ${str(fc.status)}.`, ...coordOf(o) });
    }
    const t = str(o.type);
    if (oid && (t === "ebsr" || t === "hot-text")) {
      const distinct = new Set(
        ctx.claims
          .filter((c: any) => str(c.status) === "distractor" && (Array.isArray(c.targets) ? c.targets.map(str) : []).includes(oid))
          .map((c: any) => norm(str(c.text))),
      ).size;
      if (distinct < TUNING.DISTRACTOR_SLOTS) {
        errors.push({ message: `outcome '${oid}': only ${distinct} distractor(s) target it; an EBSR/Hot-Text item needs at least ${TUNING.DISTRACTOR_SLOTS}.`, ...coordOf(o) });
      }
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

// Select up to 3 foils for an item from the distractors explicitly bound to this question via
// `targets` (NOT a dimension join) — so the foils are authored against this exact stem + key.
function selectDistractorClaims(outcome: any, correct: any, ctx: any, warnings: string[]): any[] {
  const oid = str(outcome.id);
  const pool = ctx.claims.filter((c: any) =>
    str(c.status) === "distractor" && (Array.isArray(c.targets) ? c.targets.map(str) : []).includes(oid));
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
  if (chosen.length < TUNING.DISTRACTOR_SLOTS) warnings.push(`Only ${chosen.length} distractor claim(s) target this outcome; an EBSR/Hot-Text item wants 3.`);
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
  const dok = str(outcome.dok) || "r-dok3";
  const seed = `${ctx.passage.id}:${str(outcome.id)}:${itemType}`;

  // 1. The question pins its own correct answer via `focus` (validated as a supported claim).
  const correct: any = ctx.claimById[str(outcome.focus)];
  if (!correct) {
    warnings.push(`Outcome '${str(outcome.id)}' focus '${str(outcome.focus)}' not found; cannot compose.`);
    return baseItem(itemType, outcome, ctx, dim, dok, null, warnings);
  }
  const alternativeClaims = Math.max(0,
    ctx.claims.filter((c: any) => str(c.status) === "supported" && str(c.dimension) === dim).length - 1);

  const item = baseItem(itemType, outcome, ctx, dim, dok, correct, warnings);
  item.review.alternativeClaims = alternativeClaims;

  const directSources = (Array.isArray(correct.cites) ? correct.cites : [])
    .map((id: any) => ctx.sourceById[str(id)])
    .filter((s: any) => s && str(s.status) === "directly-supports");

  if (itemType === "short-text") {
    item.prompt = str(outcome.stem); // authored from the guideline catalog (required)
    item.rubric = Array.isArray(outcome.rubric) && outcome.rubric.length
      ? outcome.rubric.map((b: any) => ({ score: Number(b.score), descriptor: str(b.descriptor) }))
      : DEFAULT_RUBRIC;
    item.distractorAnalysis = [];
    item.answerKey = { rationale: str(correct.rationale) };
    if (ctx.passage.lines.length < TUNING.SHORT_TEXT_MIN_LINES) warnings.push("Short Text items should use a long literary passage; this passage is short.");
    return item;
  }

  // EBSR & Hot Text share Part A (statement options).
  // Viability check: a healthy pool has >=5 distinct distractors bound to THIS question (via
  // `targets`), so selection (and the plausibility ranking) has real choice. Thin pools warn — a
  // signal the upstream generator's repair loop can use to regenerate more foils. (Fewer than 3
  // targeted foils is a hard error raised earlier in validateGraph.)
  const oid = str(outcome.id);
  const viableDistractors = new Set(
    ctx.claims
      .filter((c: any) => str(c.status) === "distractor" && (Array.isArray(c.targets) ? c.targets.map(str) : []).includes(oid))
      .map((c: any) => norm(str(c.text))),
  ).size;
  if (viableDistractors < TUNING.MIN_VIABLE_DISTRACTORS) {
    warnings.push(`Only ${viableDistractors} viable distractor(s) target outcome '${oid}'; author at least 5 for stronger selection.`);
  }
  const distractors = selectDistractorClaims(outcome, correct, ctx, warnings);
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
  const { pool: partBPool, chosen: distractorSrcs } = pickPartBDistractors(correct, distractors, ctx);
  if (partBPool < TUNING.MIN_VIABLE_PART_B) {
    warnings.push(`Only ${partBPool} Part B foil source(s) available; author at least ${TUNING.MIN_VIABLE_PART_B} non-supporting evidence lines (supports-wrong-claim + irrelevant) so the best 3 can be chosen.`);
  }
  const bOpts = [
    ...(correctSrc ? [{ line: correctSrc.line, text: sourceText(correctSrc, ctx.passage), correct: true, sourceId: str(correctSrc.id) }] : []),
    ...distractorSrcs.map((s: any) => ({
      line: s.line, text: sourceText(s, ctx.passage), correct: false, sourceId: str(s.id),
      status: str(s.status), tiesTo: firstWrongClaim(s, correct),
    })),
  ];
  if (!correctSrc) warnings.push("No directly-supporting evidence for the correct claim; EBSR Part B has no correct option.");
  if (bOpts.length < TUNING.PART_OPTIONS) warnings.push(`Only ${bOpts.length} Part B option(s) available; EBSR wants 4. Add irrelevant or supports-wrong-claim evidence sources.`);
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

// Part B foils come from sources that don't directly support the correct claim:
// `supports-wrong-claim` (real text backing an erroneous inference) and `irrelevant` lines.
// Rank so the most tempting win — a wrong-claim source tied to a CHOSEN distractor AND to the
// correct claim (plausibly supports more than one Part A option) scores highest; irrelevant
// lines lowest. Returns the full candidate `pool` size (for the viability floor) + the best 3.
function pickPartBDistractors(correct: any, distractors: any[], ctx: any): { pool: number; chosen: any[] } {
  const distractorIds = new Set(distractors.map((d) => str(d.id)));
  const correctId = str(correct.id);
  const candidates = ctx.sources.filter((s: any) => {
    const st = str(s.status);
    return st === "supports-wrong-claim" || st === "irrelevant";
  });
  const score = (s: any): number => {
    if (str(s.status) !== "supports-wrong-claim") return 0; // irrelevant
    const sup = Array.isArray(s.supports) ? s.supports.map(str) : [];
    return 0.5 + (sup.some((id: string) => distractorIds.has(id)) ? 2 : 0) + (sup.includes(correctId) ? 1 : 0);
  };
  const ranked = candidates.slice().sort((a: any, b: any) => score(b) - score(a) || str(a.id).localeCompare(str(b.id)));
  return { pool: candidates.length, chosen: ranked.slice(0, TUNING.DISTRACTOR_SLOTS) };
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

// Stems are authored on the outcome (from the guideline catalog). Part A is the authored `stem`;
// EBSR Part B is the authored `stem-b`; Hot Text Part B is the fixed selection instruction.
function stemFor(itemType: string, outcome: any) {
  const stem: any = { partA: str(outcome.stem), leadIn: LEAD_IN };
  if (itemType === "ebsr") stem.partB = str(outcome.stemB);
  else if (itemType === "hot-text") stem.partB = HOT_TEXT_PART_B;
  return stem;
}

function baseItem(itemType: string, outcome: any, ctx: any, dim: string, dok: string, correct: any, warnings: string[]): any {
  const scoring = itemType === "short-text"
    ? "0–2 points; hand-scored against the rubric."
    : "Both parts correct = 1 point; otherwise 0.";
  return {
    kind: "item",
    id: `${ctx.passage.id}-${str(outcome.id) || itemType + "-" + dim}`,
    type: itemType,
    standards: standardsFor(outcome, correct, dim),
    dok,
    dimension: dim,
    passage: ctx.passage,
    passages: null,
    stem: stemFor(itemType, outcome),
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

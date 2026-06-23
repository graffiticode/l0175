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
const CLAIM_STATUS = new Set(["supported", "distractor"]);
const SOURCE_STATUS = new Set(["directly-supports", "supports-wrong-claim", "irrelevant"]);
const ERROR_TYPES = ["misreads-detail", "erroneous-inference", "faulty-reasoning"];

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
  HOT_TEXT_SELECT_MAX: 3, // absolute cap on Part B sentence selections (per-item cap is min(this, validCount - 1))
  SHORT_TEXT_MIN_LINES: 3, // fewer than 3 passage paragraphs → warn (a constructed response wants a substantial passage)
  LENGTH_BALANCE_RATIO: 1.35, // correct option longer than this × the mean distractor length → length-giveaway warn
  GRADE_LEVEL_TOLERANCE: 1.5, // passage reading level may run up to this many grades above target before we warn
  STEM_GIVEAWAY_RATIO: 0.5, // Part A stem shares ≥ this fraction of the correct option's content words → giveaway warn
  STEM_GIVEAWAY_MIN: 4, // …and at least this many shared content words (ignore tiny overlaps)
};

// --- Target profiles -----------------------------------------------------------------------
// L0175 is one language parameterized over SBAC learning targets. The engine (task models,
// error types, statuses, DOK, TUNING, all composition/validation) is target-INVARIANT; only the
// vocabulary differs per target: expected text type, the standards set, the dimension/about
// taxonomy, and the dimension→companion-standard map. A program selects its target with a
// required top-level `target` attribute; the matching profile parameterizes validation and
// `standardsFor`. Stems live in the served catalog (stems.md), authored per target.
type TargetProfile = {
  id: string;            // the `target` tag, e.g. "c1-t4"
  label: string;
  grade: number;         // the guideline's grade band — the default reading-level target (overridable by a top-level `grade`)
  textType: string;      // expected passage type for this target
  baseStandard: string;  // always added by standardsFor (the cite-evidence standard)
  standards: Set<string>;
  dimensions: Set<string>;
  dimStandard: Record<string, string>; // dimension → companion standard
};

const TARGETS: Record<string, TargetProfile> = {
  // Claim 1 · Target 4 — Reasoning & Evidence, literary texts (RL standards). The original L0175.
  "c1-t4": {
    id: "c1-t4",
    label: "Grade 5 · Claim 1 · Target 4 (Reasoning & Evidence)",
    grade: 5,
    textType: "literary",
    baseStandard: "rl-1",
    standards: new Set(["rl-1", "rl-3", "rl-6", "rl-9"]),
    dimensions: new Set([
      "character", "setting", "event", "point-of-view",
      "theme", "topic", "narrators-feelings", "character-relationship",
    ]),
    dimStandard: {
      "character": "rl-3", "character-relationship": "rl-3", "setting": "rl-3", "event": "rl-3",
      "point-of-view": "rl-6", "narrators-feelings": "rl-6",
      "theme": "rl-9", "topic": "rl-9",
    },
  },
  // Claim 1 · Target 11 — Reasoning & Evidence, informational texts (RI standards).
  "c1-t11": {
    id: "c1-t11",
    label: "Grade 5 · Claim 1 · Target 11 (Reasoning & Evidence)",
    grade: 5,
    textType: "informational",
    baseStandard: "ri-1",
    standards: new Set(["ri-1", "ri-3", "ri-6", "ri-7", "ri-8", "ri-9"]),
    dimensions: new Set([
      "relationships-interactions", "author-use-of-information",
      "point-of-view", "purpose", "authors-opinion",
    ]),
    dimStandard: {
      "relationships-interactions": "ri-3",
      "author-use-of-information": "ri-8",
      "point-of-view": "ri-6",
      "purpose": "ri-8",
      "authors-opinion": "ri-8",
    },
  },
};
const DEFAULT_TARGET = "c1-t4"; // best-effort fallback when `target` is missing/unknown (still a hard error)

// --- Stems (Smarter Balanced · Grade 5 · Claim 1 · Target 4) --------------------------------
// Stems are AUTHORED, not generated: the upstream code generator instantiates the guideline's
// "Appropriate Stems" catalog (spec/stems.md) and emits each item's `stem` (and `stem-b` on
// EBSR) on the outcome. The compiler trusts the authored text — it does not synthesize stems.
// The lead-in below is not per-item question text. The Hot-Text Part B instruction is synthesized
// per item from the selection cap (Hot Text has no authored Part B stem) — see hotTextPartB.
const LEAD_IN = "This question has two parts. First, answer Part A. Then, answer Part B.";
const HOT_TEXT_PART_B_PLACEHOLDER = "Click the sentence(s) from the passage that support your answer in Part A.";

// Hot Text Part B asks for up to `max` supporting sentences (the per-item proper-subset cap). The
// student picks 1..max; any selection drawn from the valid set is correct (composeOutcome).
function hotTextPartB(max: number): string {
  return max <= 1
    ? "Click 1 sentence from the passage that supports your answer in Part A."
    : `Click 1 to ${max} sentences from the passage that support your answer in Part A.`;
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
  TEXT: "text", RATIONALE: "rationale", CITES: "cites", TARGETS: "targets",
  LINE: "line", QUOTE: "quote",
  SUPPORTS: "supports", TYPE: "type", SUBJECT: "subject", STANDARD: "standard",
  FOCUS: "focus", PASSAGE: "passage", LINES: "lines", TITLE: "title", TARGET: "target", GRADE: "grade", STEM: "stem",
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
  // Resolve the learning target first — it parameterizes validation and standards. `target` is
  // required; when missing/unknown we record a hard error but fall back to a profile so the rest
  // of composition still runs (best-effort, like a missing `focus`).
  const targetTag = str(top.target);
  const profile = TARGETS[targetTag] || TARGETS[DEFAULT_TARGET];
  // Resolve the grade: an explicit top-level `grade` (from the user's prompt) wins; otherwise use
  // the guideline's grade carried on the target profile. Drives the reading-level guard below.
  const grade = Number(top.grade) > 0 ? Number(top.grade) : profile.grade;
  const heading = str(top.passage);
  const passageType = top.type !== undefined ? str(top.type) : profile.textType;
  const lineTexts: string[] = Array.isArray(top.lines) ? top.lines.map(str) : [];
  const claims: any[] = Array.isArray(top.claims) ? top.claims : [];
  const sources: any[] = Array.isArray(top.evidence) ? top.evidence : [];
  const outcomes: any[] = Array.isArray(top.outcomes) ? top.outcomes : [];

  // --- hard validation (fails the compile) ---
  // `target` should be authored explicitly (the instructions tell the generator to always pick
  // one), but an OMITTED target defaults to c1-t4 with a warning rather than a hard error — so
  // minimal/template generation and legacy programs still compile. An explicit but UNKNOWN tag is
  // a genuine mistake and stays a hard error.
  if (targetTag && !TARGETS[targetTag]) {
    errors.push({ message: `unknown target '${targetTag}'. Expected one of: ${Object.keys(TARGETS).join(", ")}.` });
  }
  if (passageType && !PASSAGE_TYPES.has(passageType)) {
    errors.push({ message: `Unknown passage type '${passageType}'. Expected one of: ${[...PASSAGE_TYPES].join(", ")}.` });
  }
  if (lineTexts.length === 0) {
    errors.push({ message: "Passage has no `lines`." });
  }
  for (const c of claims) validateClaim(c, errors, profile);
  for (const s of sources) validateSource(s, errors);
  for (const o of outcomes) validateOutcome(o, errors, profile);

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
    profile,
    claimById: index(claims, "id"),
    sourceById: index(sources, "id"),
    outcomeById: index(outcomes, "id"),
  };

  const targetWarnings = !targetTag
    ? [`No target declared; defaulting to ${DEFAULT_TARGET}. Author a top-level 'target' (${Object.keys(TARGETS).join(" | ")}).`]
    : [];
  const readabilityWarnings: string[] = [];
  checkReadability(passage, grade, readabilityWarnings);
  const graphWarnings = [...targetWarnings, ...readabilityWarnings, ...validateGraph(ctx, errors)];
  const title = str(top.title);

  const items = outcomes.map((o, i) => composeOutcome(o, ctx, graphWarnings, i));
  if (items.length === 1) {
    items[0].grade = grade;
    if (title) items[0].title = title;
    return items[0];
  }
  const result: any = { kind: "items", items, grade };
  if (title) result.title = title;
  return result;
}

function validateClaim(c: any, errors: any[], profile: TargetProfile) {
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
    if (!profile.dimensions.has(str(c.dimension))) push(`${where}: invalid dimension '${str(c.dimension)}' for target ${profile.id}.`);
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

function validateOutcome(o: any, errors: any[], profile: TargetProfile) {
  const id = str(o.id);
  const where = id ? `outcome '${id}'` : "an outcome";
  const at = coordOf(o);
  const push = (message: string) => errors.push({ message, ...at });
  if (!id) push(`${where}: missing id (each question needs a unique id so distractors can target it).`);
  if (!ITEM_TYPES.has(str(o.type))) {
    push(`${where}: invalid type '${str(o.type)}'. Expected ebsr, hot-text, or short-text.`);
  }
  if (!profile.dimensions.has(str(o.dimension))) push(`${where}: invalid dimension '${str(o.dimension)}' for target ${profile.id}.`);
  if (o.standard !== undefined && !profile.standards.has(str(o.standard))) push(`${where}: invalid standard '${str(o.standard)}' for target ${profile.id}.`);
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
  // The guideline ties each target to a text type; flag a mismatch (non-fatal — dual-text is future scope).
  if (ctx.passage.type && ctx.passage.type !== ctx.profile.textType) {
    warnings.push(`Target ${ctx.profile.id} expects an ${ctx.profile.textType} passage, but this passage is ${ctx.passage.type}.`);
  }
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

function standardsFor(outcome: any, correct: any, dim: string, profile: TargetProfile): string[] {
  const companion = str(outcome.standard) || str(correct && correct.standard) || profile.dimStandard[dim];
  const out = [profile.baseStandard];
  if (companion && companion !== profile.baseStandard) out.push(companion);
  return out;
}

function sourceText(s: any, passage: any): string {
  if (str(s.quote)) return str(s.quote);
  const ln = passage.lines.find((l: any) => l.id === s.line);
  return ln ? ln.text : "";
}

// Segment a paragraph into sentences for Hot Text selection. Heuristic: take runs ending in
// sentence punctuation (.!?), absorbing any trailing closing quote/paren, then trim. The passage
// keeps its paragraph structure (one `lines` entry per paragraph); Hot Text makes each sentence
// within a paragraph individually selectable. An occasional dialogue-tag mis-split is acceptable
// for grade-level prose, and correctness is anchored to authored `quote`s rather than the split.
function splitSentences(text: string): string[] {
  const t = str(text).trim();
  if (!t) return [];
  const parts = t.match(/[^.!?]+[.!?]+["'”’)\]]*\s*/g);
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : [t];
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

function labelize(opts: any[]) {
  return opts.map((o, i) => ({ key: LABELS[i], ...o }));
}

// Rough syllable count for one word — the vowel-group heuristic the classic readability formulas
// assume: count runs of vowels, drop a silent trailing "e", floor at 1. Not linguistically exact,
// but stable and dependency-free, which is all the grade-level estimate needs.
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 0;
  if (w.length > 2 && w.endsWith("e") && !/[aeiouy]e$/.test(w)) n -= 1; // silent final e
  return Math.max(1, n);
}

// Flesch–Kincaid grade level over a block of prose: 0.39·(words/sentence) + 11.8·(syllables/word)
// − 15.59. A rough proxy for text complexity — enough to flag prose that reads well above the
// target grade. Returns null when the sample is too small to be meaningful.
function estimateGradeLevel(text: string): number | null {
  const sentences = (text.match(/[.!?]+/g) || []).length || (text.trim() ? 1 : 0);
  const words: string[] = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  if (sentences === 0 || words.length < 20) return null; // too little text to judge
  const syllables = words.reduce((sum: number, w: string) => sum + countSyllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

// Reading-level guard: estimate the passage's grade level and warn (non-fatal) when it reads
// notably above the target grade, so the upstream generator's repair loop can simplify the prose.
// The threshold is RELATIVE to the resolved grade (the guideline's grade, or a top-level `grade`
// override) — not a fixed grade-5 constant — so the same check serves future grade bands.
function checkReadability(passage: any, grade: number, warnings: string[]): void {
  const text = (Array.isArray(passage.lines) ? passage.lines : []).map((l: any) => str(l.text)).join(" ");
  const est = estimateGradeLevel(text);
  if (est === null) return;
  if (est > grade + TUNING.GRADE_LEVEL_TOLERANCE) {
    warnings.push(
      `Passage reads above grade ${grade} (est. grade ${est.toFixed(1)}); shorten sentences and use simpler, more concrete vocabulary to match the target reading level.`,
    );
  }
}

// Length-giveaway guard: the correct option should not stand out as the longest/most-detailed
// choice — a partial-understander can pick the key on heft alone. Warn (non-fatal) when the
// correct option's text runs notably longer than the mean distractor length, so the author/
// generator can pad the foils or trim the key until the options read as parallel in length.
function checkLengthBalance(options: any[], part: string, warnings: string[]): void {
  const correct = options.find((o: any) => o.correct);
  const foils = options.filter((o: any) => !o.correct);
  if (!correct || foils.length === 0) return;
  const len = (o: any) => str(o.text).length;
  const correctLen = len(correct);
  const meanFoil = foils.reduce((sum: number, o: any) => sum + len(o), 0) / foils.length;
  if (meanFoil === 0) return;
  const ratio = correctLen / meanFoil;
  const isLongest = foils.every((o: any) => len(o) <= correctLen);
  if (isLongest && ratio >= TUNING.LENGTH_BALANCE_RATIO) {
    warnings.push(
      `Part ${part}: the correct option (${correctLen} chars) is ${Math.round((ratio - 1) * 100)}% longer than the average distractor (${Math.round(meanFoil)} chars) — possible length giveaway. Balance the options' length/detail.`,
    );
  }
}

// Function words + stem boilerplate excluded when comparing a stem against the answer — only
// distinctive content words should count toward an overlap.
const STEM_STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "at", "for", "and", "or", "but", "that", "this", "these",
  "those", "is", "are", "was", "were", "be", "been", "being", "it", "its", "as", "by", "with", "from",
  "into", "about", "which", "what", "how", "who", "whose", "why", "where", "when", "your", "their",
  "them", "they", "had", "has", "have", "do", "does", "did", "will", "would", "can", "could", "more",
  "than", "then", "so", "such", "best", "most", "two", "three",
  // stem-template boilerplate
  "passage", "sentence", "sentences", "inference", "inferences", "conclusion", "conclusions", "click",
  "statement", "statements", "supported", "support", "supports", "answer", "part", "show", "shows",
  "select", "provides", "author", "most", "likely",
]);

function contentWords(s: string, subject: string): Set<string> {
  const subj = new Set(norm(subject).split(" ").filter(Boolean));
  return new Set(
    norm(s).split(" ").filter((w) => w.length > 2 && !STEM_STOPWORDS.has(w) && !subj.has(w)),
  );
}

// Stem-giveaway guard: the Part A stem should not echo the correct answer's wording. When the stem
// reuses most of the correct option's distinctive content words (ignoring function words, stem
// boilerplate, and the subject), the answer is obvious without reading the options. Warn (non-fatal)
// so the generator rewords the stem into a neutral question. The subject is excluded so a stem that
// merely names what the question is about (e.g. the character/topic) is not flagged.
function checkStemGiveaway(stem: string, correctText: string, subject: string, warnings: string[]): void {
  const stemWords = contentWords(stem, subject);
  const ansWords = [...contentWords(correctText, subject)];
  if (ansWords.length < TUNING.STEM_GIVEAWAY_MIN) return; // too short to judge
  const shared = ansWords.filter((w) => stemWords.has(w));
  if (shared.length >= TUNING.STEM_GIVEAWAY_MIN && shared.length / ansWords.length >= TUNING.STEM_GIVEAWAY_RATIO) {
    warnings.push(
      `Part A: the stem reuses much of the correct option's wording (shared: ${shared.slice(0, 8).join(", ")}) — reword the stem into a neutral question so it doesn't echo the answer.`,
    );
  }
}

// Place the correct option at a balanced slot, then label. A per-item seeded shuffle distributes
// uniformly in expectation but, over the few items in one program, can land the answer key first
// (or last) for every item — the pattern authors noticed. Instead the distractors are seeded-
// shuffled among themselves and the correct option is inserted at a slot that round-robins by
// outcome index, rotated by a per-program/part offset so the key neither always starts at A nor
// repeats the same position across items. Deterministic: same program → same labels.
function placeCorrect(
  correctOpt: any, distractorOpts: any[], seed: string, programSeed: string, part: string, outcomeIndex: number,
) {
  const opts = seededShuffle(distractorOpts, `${seed}:${part}`);
  const n = opts.length + 1;
  const slot = (outcomeIndex + (strHash(`${programSeed}:${part}`) % n)) % n;
  opts.splice(slot, 0, correctOpt);
  return labelize(opts);
}

function partAOptions(correct: any, distractors: any[], seed: string, programSeed: string, outcomeIndex: number) {
  const correctOpt = { text: str(correct.text), correct: true, claimId: str(correct.id) };
  const distractorOpts = distractors.map((d) => ({ text: str(d.text), correct: false, claimId: str(d.id), errorType: str(d.errorType) }));
  return placeCorrect(correctOpt, distractorOpts, seed, programSeed, "A", outcomeIndex);
}

function composeOutcome(outcome: any, ctx: any, graphWarnings: string[] = [], outcomeIndex = 0): any {
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
  item.partA = { options: partAOptions(correct, distractors, seed, ctx.passage.id, outcomeIndex) };
  checkLengthBalance(item.partA.options, "A", warnings);
  checkStemGiveaway(str(outcome.stem), str(correct.text), str(outcome.subject), warnings);
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
    // Part A asks for the best STATEMENT (an inference), authored from the Task Model 2 "Click on
    // the statement that best…" catalog. Selecting passage sentences is Part B (fixed by the
    // compiler). A Part A stem that asks the student to click sentences from the passage is the
    // wrong form — warn so the generator swaps in a statement stem.
    if (/\bsentences?\b/i.test(str(outcome.stem))) {
      warnings.push(
        "Hot Text Part A must ask for the best STATEMENT (an inference), not passage sentences — selecting sentences is Part B (fixed by the compiler). Use a \"Click on the statement that best…\" stem from stems.md Task Model 2.",
      );
    }
    // Each paragraph (`lines` entry) is segmented into sentences; every sentence is selectable,
    // grouped by paragraph so the passage keeps its paragraph format. A sentence is correct when a
    // directly-supporting source names it: a source with a `quote` marks the matching sentence
    // (normalized equality, falling back to containment); a source with no `quote` marks every
    // sentence of its paragraph (paragraph-level support, as before).
    const directNoQuote = new Set(directSources.filter((s: any) => !str(s.quote)).map((s: any) => s.line));
    const directQuotes = directSources.filter((s: any) => str(s.quote)).map((s: any) => norm(str(s.quote)));
    const isCorrectSentence = (lineId: number, text: string): boolean => {
      if (directNoQuote.has(lineId)) return true;
      const n = norm(text);
      return directQuotes.some((q) => q === n || q.includes(n) || n.includes(q));
    };
    const selectable: any[] = [];
    for (const l of ctx.passage.lines) {
      splitSentences(l.text).forEach((sentence: string, i: number) => {
        selectable.push({
          id: `${l.id}.${i + 1}`, lineId: l.id, sentence: i + 1, text: sentence,
          correct: isCorrectSentence(l.id, sentence),
        });
      });
    }
    item.selectable = selectable;
    const correctUnits = selectable.filter((s: any) => s.correct);
    const valid = correctUnits.length;
    if (valid === 0) warnings.push("No directly-supporting evidence for the correct claim; Part B has no correct selection.");
    // The valid supporting sentences are a SUPERSET; the student selects 1..selectMax and any
    // selection drawn from the set is correct. The expected count is a proper subset of the valid
    // set (so they never must find every one) — except when there is only one valid sentence.
    const selectMax = valid <= 1 ? 1 : Math.min(TUNING.HOT_TEXT_SELECT_MAX, valid - 1);
    item.selectMax = selectMax;
    item.stem.partB = hotTextPartB(selectMax);
    if (valid === 1) warnings.push("Only 1 valid supporting sentence; author a superset (2+ directly-supporting sentences) so the expected answer is a subset of the valid responses.");
    item.distractorAnalysis = analysis;
    item.answerKey = { partA: aKey, partB: correctUnits.map((s: any) => s.id).join(", "), rationale: str(correct.rationale) };
    return item;
  }

  // EBSR Part B — curated 4 line options.
  const correctSrc = directSources[0];
  const { pool: partBPool, chosen: distractorSrcs } = pickPartBDistractors(correct, distractors, ctx);
  if (partBPool < TUNING.MIN_VIABLE_PART_B) {
    warnings.push(`Only ${partBPool} Part B foil source(s) available; author at least ${TUNING.MIN_VIABLE_PART_B} non-supporting evidence lines (supports-wrong-claim + irrelevant) so the best 3 can be chosen.`);
  }
  const correctOpt = correctSrc
    ? { line: correctSrc.line, text: sourceText(correctSrc, ctx.passage), correct: true, sourceId: str(correctSrc.id) }
    : null;
  const distractorOpts = distractorSrcs.map((s: any) => ({
    line: s.line, text: sourceText(s, ctx.passage), correct: false, sourceId: str(s.id),
    status: str(s.status), tiesTo: firstWrongClaim(s, correct),
  }));
  const bCount = (correctOpt ? 1 : 0) + distractorOpts.length;
  if (!correctSrc) warnings.push("No directly-supporting evidence for the correct claim; EBSR Part B has no correct option.");
  if (bCount < TUNING.PART_OPTIONS) warnings.push(`Only ${bCount} Part B option(s) available; EBSR wants 4. Add irrelevant or supports-wrong-claim evidence sources.`);
  item.partB = {
    options: correctOpt
      ? placeCorrect(correctOpt, distractorOpts, seed, ctx.passage.id, "B", outcomeIndex)
      : labelize(seededShuffle(distractorOpts, `${seed}:B`)),
  };
  const bKey = item.partB.options.find((o: any) => o.correct)?.key;
  checkLengthBalance(item.partB.options, "B", warnings);

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
// EBSR Part B is the authored `stem-b`; Hot Text Part B is the fixed selection instruction. The
// two-part lead-in is added ONLY for the two-part models (EBSR, Hot Text); Short Text is a single
// constructed-response prompt with one answer box, so it carries no Part A/B lead-in.
function stemFor(itemType: string, outcome: any) {
  const stem: any = { partA: str(outcome.stem) };
  if (itemType === "ebsr") { stem.leadIn = LEAD_IN; stem.partB = str(outcome.stemB); }
  else if (itemType === "hot-text") { stem.leadIn = LEAD_IN; stem.partB = HOT_TEXT_PART_B_PLACEHOLDER; }
  return stem;
}

function baseItem(itemType: string, outcome: any, ctx: any, dim: string, dok: string, correct: any, warnings: string[]): any {
  const scoring = itemType === "short-text"
    ? "0–2 points; hand-scored against the rubric."
    : "Both parts correct = 1 point; otherwise 0.";
  const standards = standardsFor(outcome, correct, dim, ctx.profile);
  return {
    kind: "item",
    id: `${ctx.passage.id}-${str(outcome.id) || itemType + "-" + dim}`,
    type: itemType,
    target: ctx.profile.id,
    standards,
    dok,
    dimension: dim,
    passage: ctx.passage,
    passages: null,
    stem: stemFor(itemType, outcome),
    distractorAnalysis: [],
    answerKey: {},
    review: {
      target: ctx.profile.id,
      standards,
      dok,
      dimension: dim,
      scoring,
      correctClaim: correct ? { id: str(correct.id), text: str(correct.text) } : null,
      alternativeClaims: 0,
    },
    warnings,
  };
}

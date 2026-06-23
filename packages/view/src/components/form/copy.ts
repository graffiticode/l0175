// SPDX-License-Identifier: MIT
// Serializes a composed assessment item into clean, portable rich text (HTML + plain text) for
// the "Copy" button, so teachers can paste a WYSIWYG question/answer-key into Google Docs or Word.
// We serialize from the item DATA MODEL (not the rendered Tailwind DOM) so the output is
// self-contained, inline-styled, and free of class names and form controls.
//
//   - Questions mode (id "preview") -> the question only.
//   - Review/Key mode -> the question PLUS a clean teacher answer key (correct option marked, the
//     answer key, the short-text rubric, and the exemplar/correct inference). It deliberately
//     omits author QA noise: per-distractor error types, plausibility, warnings.
//   - Neither mode embeds the passage — it has its own view + "Copy passage" button
//     (passagesToHtml/passagesToText serialize just the reading passage(s)).
import type { Mode } from "./ModeToggle";

const esc = (s: any): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const P = (html: string, style = "margin:0 0 4px"): string => `<p style="${style}">${html}</p>`;
const NUM = (n: any): string => `<span style="color:#9ca3af">${esc(n)}</span>`;

function passageHtml(p: any): string {
  if (!p) return "";
  const heading = p.heading ? P(`<strong>${esc(p.heading)}</strong>`) : "";
  const lines = (p.lines ?? []).map((l: any) => P(`${NUM(l.id)} ${esc(l.text)}`)).join("");
  return heading + lines;
}

// One option line: "A. text" (Part B EBSR options are quoted). Correct options are bolded with a ✓
// in review mode only.
function optionsHtml(options: any[], mode: Mode, quote: boolean): string {
  return (options ?? [])
    .map((o: any) => {
      const correct = mode === "review" && o.correct;
      const txt = quote ? `<em>&ldquo;${esc(o.text)}&rdquo;</em>` : esc(o.text);
      const body = `${esc(o.key)}. ${txt}${correct ? " ✓" : ""}`;
      return P(correct ? `<strong>${body}</strong>` : body);
    })
    .join("");
}

// Hot Text Part B: the passage keeps its paragraph format, with each sentence individually
// selectable. Group the selectable sentences by paragraph (lineId) — one <p> per paragraph,
// sentences inline; correct sentences are bolded with a ✓ in review mode only.
function selectableHtml(selectable: any[], mode: Mode): string {
  const groups = groupByLine(selectable ?? []);
  return groups
    .map((g) =>
      P(
        g.units
          .map((s: any) => {
            const correct = mode === "review" && s.correct;
            const sent = `${esc(s.text)}${correct ? " ✓" : ""}`;
            return correct ? `<strong>${sent}</strong>` : sent;
          })
          .join(" "),
      ),
    )
    .join("");
}

// Group selectable sentence units into their paragraphs, preserving order.
function groupByLine(selectable: any[]): { lineId: number; units: any[] }[] {
  const groups: { lineId: number; units: any[] }[] = [];
  for (const s of selectable) {
    const last = groups[groups.length - 1];
    if (last && last.lineId === s.lineId) last.units.push(s);
    else groups.push({ lineId: s.lineId, units: [s] });
  }
  return groups;
}

// HTML for one composed item (the question, plus a clean answer key in review/Key mode). The
// passage is never embedded here — it is copied separately from the Passage view.
export function itemToHtml(item: any, mode: Mode): string {
  if (!item) return "";
  const review = mode === "review";
  const out: string[] = [];
  if (item.stem?.leadIn) out.push(P(`<em>${esc(item.stem.leadIn)}</em>`, "margin:8px 0;color:#6b7280"));

  if (item.type === "ebsr" || item.type === "hot-text") {
    out.push(P(`<strong>Part A.</strong> ${esc(item.stem?.partA)}`, "margin:8px 0 4px"));
    out.push(optionsHtml(item.partA?.options, mode, false));
    out.push(P(`<strong>Part B.</strong> ${esc(item.stem?.partB)}`, "margin:8px 0 4px"));
    out.push(item.type === "ebsr" ? optionsHtml(item.partB?.options, mode, true) : selectableHtml(item.selectable, mode));
  } else if (item.type === "short-text") {
    out.push(P(`<strong>${esc(item.prompt)}</strong>`, "margin:8px 0 4px"));
    if (!review) out.push(P("Answer: ___________________________________________", "margin:8px 0;color:#9ca3af"));
  }

  if (review) {
    const key: string[] = [];
    if (item.answerKey?.partA) key.push(`Part A &mdash; ${esc(item.answerKey.partA)}`);
    if (item.answerKey?.partB && item.type !== "hot-text") key.push(`Part B &mdash; ${esc(item.answerKey.partB)}`);
    if (item.type === "hot-text") {
      const ids = (item.selectable ?? []).filter((s: any) => s.correct).map((s: any) => s.id);
      if (ids.length) key.push(`Part B &mdash; any 1&ndash;${item.selectMax ?? 3} of: ${esc(ids.join(", "))}`);
    }
    if (key.length) out.push(P(`<strong>Answer key:</strong> ${key.join("; ")}`, "margin:8px 0 4px"));

    if (item.type === "short-text" && Array.isArray(item.rubric) && item.rubric.length) {
      out.push(P("<strong>Scoring rubric:</strong>", "margin:8px 0 4px"));
      out.push(
        `<ul style="margin:0 0 4px;padding-left:20px">${item.rubric
          .map((r: any) => `<li><strong>${esc(r.score)}</strong> &mdash; ${esc(r.descriptor)}</li>`)
          .join("")}</ul>`,
      );
    }

    // Short Text shows the answer-key rationale ("Exemplar inference"); EBSR / Hot Text show the
    // correct claim's statement ("Correct inference") — mirroring the on-screen renderers.
    const shortText = item.type === "short-text";
    const exemplar = shortText
      ? item.answerKey?.rationale || item.review?.correctClaim?.text
      : item.review?.correctClaim?.text || item.answerKey?.rationale;
    if (exemplar) {
      out.push(P(`<strong>${shortText ? "Exemplar inference" : "Correct inference"}:</strong> ${esc(exemplar)}`, "margin:8px 0 4px"));
    }
  }

  return out.filter(Boolean).join("");
}

// Plain-text fallback (mirrors itemToHtml, no markup).
export function itemToText(item: any, mode: Mode): string {
  if (!item) return "";
  const review = mode === "review";
  const out: string[] = [];
  if (item.stem?.leadIn) out.push(item.stem.leadIn, "");

  const opt = (o: any, quote: boolean) => {
    const mark = mode === "review" && o.correct ? " ✓" : "";
    return `${o.key}. ${quote ? `“${o.text}”` : o.text}${mark}`;
  };

  if (item.type === "ebsr" || item.type === "hot-text") {
    out.push(`Part A. ${item.stem?.partA ?? ""}`);
    for (const o of item.partA?.options ?? []) out.push(opt(o, false));
    out.push("", `Part B. ${item.stem?.partB ?? ""}`);
    if (item.type === "ebsr") {
      for (const o of item.partB?.options ?? []) out.push(opt(o, true));
    } else {
      // Hot Text: one line per paragraph, sentences inline; correct sentences marked in review.
      for (const g of groupByLine(item.selectable ?? [])) {
        out.push(
          g.units
            .map((s: any) => `${s.text}${mode === "review" && s.correct ? " ✓" : ""}`)
            .join(" "),
        );
      }
    }
  } else if (item.type === "short-text") {
    out.push(item.prompt ?? "");
    if (!review) out.push("", "Answer: ___________________________________________");
  }

  if (review) {
    const key: string[] = [];
    if (item.answerKey?.partA) key.push(`Part A — ${item.answerKey.partA}`);
    if (item.answerKey?.partB && item.type !== "hot-text") key.push(`Part B — ${item.answerKey.partB}`);
    if (item.type === "hot-text") {
      const ids = (item.selectable ?? []).filter((s: any) => s.correct).map((s: any) => s.id);
      if (ids.length) key.push(`Part B — any 1–${item.selectMax ?? 3} of: ${ids.join(", ")}`);
    }
    if (key.length) out.push("", `Answer key: ${key.join("; ")}`);
    if (item.type === "short-text" && Array.isArray(item.rubric) && item.rubric.length) {
      out.push("", "Scoring rubric:");
      for (const r of item.rubric) out.push(`  ${r.score} — ${r.descriptor}`);
    }
    const shortText = item.type === "short-text";
    const exemplar = shortText
      ? item.answerKey?.rationale || item.review?.correctClaim?.text
      : item.review?.correctClaim?.text || item.answerKey?.rationale;
    if (exemplar) out.push("", `${shortText ? "Exemplar inference" : "Correct inference"}: ${exemplar}`);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Dedupe the reading passage(s) across items — a set of items typically shares one passage, so
// the Passage view (and its Copy button) collapses identical passages to one. Shared by the
// on-screen PassageView and the passage serializers below so they never diverge.
export function uniquePassages(items: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const item of items ?? []) {
    const p = item?.passage;
    if (!p) continue;
    const key = `${p.heading} ${(p.lines ?? []).map((l: any) => `${l.id}:${l.text}`).join("\n")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

// The Passage view's "Copy passage" button: just the reading passage(s), deduped, as rich text.
export function passagesToHtml(items: any[], title?: string): string {
  const body = uniquePassages(items)
    .map((p) => `<div>${passageHtml(p)}</div>`)
    .join('<p style="margin:14px 0"></p>');
  const head = title ? `<h3 style="margin:0 0 8px">${esc(title)}</h3>` : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.4;color:#111827">${head}${body}</div>`;
}

export function passagesToText(items: any[], title?: string): string {
  const body = uniquePassages(items)
    .map((p) => {
      const lines: string[] = [];
      if (p.heading) lines.push(p.heading);
      for (const l of p.lines ?? []) lines.push(`${l.id} ${l.text}`);
      return lines.join("\n");
    })
    .join("\n\n———\n\n");
  return (title ? `${title}\n\n` : "") + body;
}

// Joins the currently visible item(s) for copying, wrapped in a base-font container.
export function itemsToHtml(items: any[], mode: Mode, title?: string): string {
  const body = (items ?? [])
    .map((it) => `<div>${itemToHtml(it, mode)}</div>`)
    .join('<p style="margin:14px 0"></p>');
  const head = title ? `<h3 style="margin:0 0 8px">${esc(title)}</h3>` : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.4;color:#111827">${head}${body}</div>`;
}

export function itemsToText(items: any[], mode: Mode, title?: string): string {
  const body = (items ?? []).map((it) => itemToText(it, mode)).join("\n\n———\n\n");
  return (title ? `${title}\n\n` : "") + body;
}

// Writes rich text (HTML + plain) to the clipboard. Primary path: the async Clipboard API with a
// ClipboardItem (both flavors, so Docs/Word take the HTML and a plain editor takes the text).
// Fallback: a hidden contenteditable + execCommand("copy") for older browsers.
export async function copyRichText(html: string, text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const el = document.createElement("div");
    el.setAttribute("contenteditable", "true");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.opacity = "0";
    el.innerHTML = html;
    document.body.appendChild(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    const ok = document.execCommand("copy");
    sel?.removeAllRanges();
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

// SPDX-License-Identifier: MIT
// Hot Text (Task Model 2): Part A = pick the best statement; Part B = click the passage
// sentence(s) that support it. The passage keeps its paragraph format; each sentence within a
// paragraph is individually selectable (correct = the correct claim's directly-supporting
// sentences). Selectable units are grouped by `lineId` (the paragraph) and rendered inline.
import { Fragment, useState } from "react";
import { OptionRow, StemLine, ResultBanner, analysisIndex, cx, type Mode } from "./itemKit";

export function HotTextItem({
  item,
  mode,
  respond,
}: {
  item: any;
  mode: Mode;
  respond: (r: any) => void;
}) {
  const [partA, setPartA] = useState<string | undefined>();
  const [picked, setPicked] = useState<string[]>([]);
  const ax = analysisIndex(item);
  const review = mode === "review";
  const preview = mode === "preview";
  const previewB = preview && picked.length > 0; // Part B feedback active once a sentence is clicked
  // Single-part Hot Text (evidence targets, e.g. T8): the inference is given in the stem and there
  // is no Part A statement to pick — only the sentence selection.
  const hasPartA = !!item.partA;
  const aOk = hasPartA ? !!item.partA.options.find((o: any) => o.key === partA)?.correct : true;
  const correctIds = item.selectable.filter((s: any) => s.correct).map((s: any) => s.id);
  // The valid sentences are a superset; the student picks an EXACT count, and any selection of
  // that many drawn from the valid set (nothing outside it) is correct. `count` comes from the
  // compiler (one less than the valid set, capped at 3, floored at 1).
  const count = item.selectCount ?? 1;
  const bOk = picked.length === count && picked.every((id: string) => correctIds.includes(id));
  const answered = (hasPartA ? partA !== undefined : true) && picked.length > 0;

  // Group the selectable sentences by their paragraph (lineId), preserving order.
  const paragraphs: { lineId: number; units: any[] }[] = [];
  for (const s of item.selectable) {
    const last = paragraphs[paragraphs.length - 1];
    if (last && last.lineId === s.lineId) last.units.push(s);
    else paragraphs.push({ lineId: s.lineId, units: [s] });
  }

  const pickA = (key: string) => {
    setPartA(key);
    respond({ partA: key, selected: picked });
  };
  const toggleSentence = (id: string) => {
    const has = picked.includes(id);
    if (!has && picked.length >= count) return; // cap selections at the per-item count (deselect always allowed)
    const next = has ? picked.filter((x) => x !== id) : [...picked, id];
    setPicked(next);
    respond({ partA, selected: next });
  };

  return (
    <div className="flex flex-col gap-4">
      {hasPartA && (
        <div className="flex flex-col gap-2">
          <StemLine>Part A. {item.stem.partA}</StemLine>
          {item.partA.options.map((o: any) => (
            <OptionRow
              key={o.key}
              name={`${item.id}-A`}
              optKey={o.key}
              selected={partA === o.key}
              onSelect={() => pickA(o.key)}
              mode={mode}
              correct={o.correct}
              analysis={ax[`A:${o.key}`]}
              feedback={preview && partA !== undefined}
            >
              {o.text}
            </OptionRow>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <StemLine>{hasPartA ? `Part B. ${item.stem.partB}` : item.stem.partA}</StemLine>
        {/* Mirror the Passage view (ItemView.tsx `Passage`): same panel, paragraph numbers, and
            text styling, so the selectable passage reads exactly like the Passage tab — each
            sentence is a selectable inline span. */}
        <div className="font-sans rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-col gap-0.5">
            {paragraphs.map((p) => (
              <p key={p.lineId} className="text-sm text-zinc-800 leading-loose">
                <span className="text-zinc-400 mr-2 select-none">{p.lineId}</span>
                {p.units.map((s: any) => {
                const on = picked.includes(s.id);
                const reveal = review || previewB; // show correctness
                const wrong = previewB && on && !s.correct;
                return (
                  <Fragment key={s.id}>
                    {/* Inline span (not a block button) so sentences flow within the paragraph and
                        wrap naturally; box-decoration-break keeps the border/background intact when a
                        sentence wraps across lines. */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSentence(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSentence(s.id); }
                      }}
                      style={{ WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}
                      className={cx(
                        "rounded px-1 py-0.5 border cursor-pointer transition",
                        reveal && s.correct
                          ? "border-green-400 bg-green-50"
                          : wrong
                            ? "border-red-400 bg-red-50"
                            : on
                              ? "border-zinc-300 bg-zinc-100"
                              : "border-zinc-300 bg-white hover:bg-zinc-100",
                      )}
                    >
                      {s.text}
                      {reveal && s.correct && <span className="text-green-600 font-semibold ml-1">✓</span>}
                      {wrong && <span className="text-red-600 font-semibold ml-1">✗</span>}
                    </span>{" "}
                  </Fragment>
                );
                })}
              </p>
            ))}
          </div>
        </div>
      </div>
      {preview && answered && (
        <ResultBanner correct={aOk && bOk}>
          {aOk && bOk
            ? "Correct — 1 / 1 point."
            : hasPartA
              ? `Not quite — 0 / 1 point.  (Part A ${aOk ? "✓" : "✗"} · Part B ${bOk ? "✓" : "✗"})`
              : "Not quite — 0 / 1 point."}
        </ResultBanner>
      )}
    </div>
  );
}

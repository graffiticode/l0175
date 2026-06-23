// SPDX-License-Identifier: MIT
// Hot Text (Task Model 2): Part A = pick the best statement; Part B = click the passage
// sentence(s) that support it. The passage keeps its paragraph format; each sentence within a
// paragraph is individually selectable (correct = the correct claim's directly-supporting
// sentences). Selectable units are grouped by `lineId` (the paragraph) and rendered inline.
import { useState } from "react";
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
  const aOk = !!item.partA.options.find((o: any) => o.key === partA)?.correct;
  const correctIds = item.selectable.filter((s: any) => s.correct).map((s: any) => s.id);
  const bOk = correctIds.length === picked.length && correctIds.every((id: string) => picked.includes(id));
  const answered = partA !== undefined && picked.length > 0;

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
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setPicked(next);
    respond({ partA, selected: next });
  };

  return (
    <div className="flex flex-col gap-4">
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
      <div className="flex flex-col gap-2">
        <StemLine>Part B. {item.stem.partB}</StemLine>
        <div className="flex flex-col gap-3 leading-relaxed">
          {paragraphs.map((p) => (
            <p key={p.lineId} className="text-sm">
              {p.units.map((s: any) => {
                const on = picked.includes(s.id);
                const reveal = review || previewB; // show correctness
                const wrong = previewB && on && !s.correct;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSentence(s.id)}
                    className={cx(
                      "appearance-none text-left rounded px-1 py-0.5 border cursor-pointer transition mr-1",
                      reveal && s.correct
                        ? "border-green-400 bg-green-50"
                        : wrong
                          ? "border-red-400 bg-red-50"
                          : on
                            ? "border-sky-400 bg-sky-50"
                            : "border-transparent hover:bg-zinc-50",
                    )}
                  >
                    {s.text}
                    {reveal && s.correct && <span className="text-green-600 font-semibold ml-1">✓</span>}
                    {wrong && <span className="text-red-600 font-semibold ml-1">✗</span>}
                  </button>
                );
              })}
            </p>
          ))}
        </div>
      </div>
      {preview && answered && (
        <ResultBanner correct={aOk && bOk}>
          {aOk && bOk
            ? "Correct — 1 / 1 point."
            : `Not quite — 0 / 1 point.  (Part A ${aOk ? "✓" : "✗"} · Part B ${bOk ? "✓" : "✗"})`}
        </ResultBanner>
      )}
    </div>
  );
}

// SPDX-License-Identifier: MIT
// Hot Text (Task Model 2): Part A = pick the best statement; Part B = click the passage
// sentence(s) that support it. The whole passage is the selectable set (correct = the
// correct claim's directly-supporting lines).
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
  const [picked, setPicked] = useState<number[]>([]);
  const ax = analysisIndex(item);
  const review = mode === "review";
  const preview = mode === "preview";
  const previewB = preview && picked.length > 0; // Part B feedback active once a line is clicked
  const aOk = !!item.partA.options.find((o: any) => o.key === partA)?.correct;
  const correctLines = item.selectable.filter((s: any) => s.correct).map((s: any) => s.lineId);
  const bOk = correctLines.length === picked.length && correctLines.every((l: number) => picked.includes(l));
  const answered = partA !== undefined && picked.length > 0;

  const pickA = (key: string) => {
    setPartA(key);
    respond({ partA: key, selected: picked });
  };
  const toggleLine = (lineId: number) => {
    const next = picked.includes(lineId) ? picked.filter((l) => l !== lineId) : [...picked, lineId];
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
        <div className="flex flex-col gap-1 leading-relaxed">
          {item.selectable.map((s: any) => {
            const on = picked.includes(s.lineId);
            const reveal = review || previewB; // show correctness
            const wrong = previewB && on && !s.correct;
            return (
              <button
                key={s.lineId}
                type="button"
                onClick={() => toggleLine(s.lineId)}
                className={cx(
                  "appearance-none text-left text-sm rounded px-2 py-1 border cursor-pointer transition",
                  reveal && s.correct
                    ? "border-green-400 bg-green-50"
                    : wrong
                      ? "border-red-400 bg-red-50"
                      : on
                        ? "border-sky-400 bg-sky-50"
                        : "border-transparent hover:bg-zinc-50",
                )}
              >
                <span className="text-zinc-400 mr-2">{s.lineId}</span>
                {s.text}
                {reveal && s.correct && <span className="text-green-600 font-semibold ml-1">✓</span>}
                {wrong && <span className="text-red-600 font-semibold ml-1">✗</span>}
              </button>
            );
          })}
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

// SPDX-License-Identifier: MIT
// Multi-Select (single-part, 5–6 options, an exact correct SET). Used by Central Ideas (T9)
// "Choose two sentences that belong in a summary" items. 1 point only for selecting exactly the
// correct set (and nothing else). Checkboxes, since more than one option is correct.
import { useState } from "react";
import { StemLine, ResultBanner, analysisIndex, cx, type Mode } from "./itemKit";

export function MultiSelectItem({
  item,
  mode,
  respond,
}: {
  item: any;
  mode: Mode;
  respond: (r: any) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const ax = analysisIndex(item);
  const review = mode === "review";
  const preview = mode === "preview";
  const feedback = preview && picked.length > 0; // correctness shown once a box is checked
  const correctKeys = item.choice.options.filter((o: any) => o.correct).map((o: any) => o.key);
  const need = item.selectCount ?? correctKeys.length;
  const ok = picked.length === correctKeys.length && correctKeys.every((k: string) => picked.includes(k));

  const toggle = (key: string) => {
    const next = picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key];
    setPicked(next);
    respond({ choices: next });
  };

  return (
    <div className="flex flex-col gap-2">
      <StemLine>{item.stem.partA}</StemLine>
      {item.choice.options.map((o: any) => {
        const on = picked.includes(o.key);
        const reveal = review || feedback;
        const showCorrect = reveal && o.correct;
        const showWrong = feedback && on && !o.correct;
        const an = ax[`A:${o.key}`];
        const showAnalysis = an && (review || showWrong);
        return (
          <div key={o.key}>
            <label
              className={cx(
                "flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition text-sm",
                showCorrect
                  ? "border-green-400 bg-green-50"
                  : showWrong
                    ? "border-red-400 bg-red-50"
                    : on
                      ? "border-zinc-400 bg-zinc-50"
                      : "border-zinc-200 hover:bg-zinc-50",
              )}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(o.key)}
                className="appearance-none mt-0.5 h-4 w-4 shrink-0 rounded border border-zinc-300 checked:border-zinc-800 checked:bg-zinc-800 cursor-pointer"
              />
              <span className="font-medium text-zinc-500 w-4">{o.key}</span>
              <span className="flex-1 text-zinc-900">{o.text}</span>
              {showCorrect && <span className="text-green-600 font-semibold">✓</span>}
              {showWrong && <span className="text-red-600 font-semibold">✗</span>}
            </label>
            {showAnalysis &&
              (review ? (
                <p className="ml-9 mt-1 text-xs text-amber-700">
                  <span className="font-semibold">{an.errorType || an.status}</span>
                  {typeof an.plausibility === "number" ? ` · p=${an.plausibility}` : ""}
                  {an.rationale ? ` — ${an.rationale}` : ""}
                </p>
              ) : (
                an.rationale && <p className="ml-9 mt-1 text-xs text-red-700">{an.rationale}</p>
              ))}
          </div>
        );
      })}
      <p className="text-xs text-zinc-500">Select {need}.</p>
      {feedback && (
        <ResultBanner correct={ok}>
          {ok ? "Correct — 1 / 1 point." : `Not quite — 0 / 1 point.  (select exactly ${correctKeys.length})`}
        </ResultBanner>
      )}
    </div>
  );
}

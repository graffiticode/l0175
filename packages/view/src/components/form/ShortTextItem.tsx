// SPDX-License-Identifier: MIT
// Short Text (Task Model 3): constructed response. A prompt + a text box; hand-scored 0/1/2
// against the rubric (no auto-scoring). Review mode shows the rubric and the answer-key rationale.
import { useState } from "react";
import { StemLine, type Mode } from "./itemKit";

export function ShortTextItem({
  item,
  mode,
  respond,
}: {
  item: any;
  mode: Mode;
  respond: (r: any) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <StemLine>{item.prompt}</StemLine>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          respond({ text: e.target.value });
        }}
        rows={5}
        placeholder="Type your answer here…"
        className="appearance-none w-full rounded-md border border-zinc-300 p-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
      />
      {mode === "preview" && text.trim() !== "" && (
        <p className="text-xs text-zinc-500">
          This constructed response is hand-scored against a 0–2 rubric — switch to Review to see it.
        </p>
      )}
      {mode === "review" && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-semibold text-zinc-700 mb-2">Scoring rubric (hand-scored)</p>
          <ul className="flex flex-col gap-1">
            {item.rubric.map((r: any) => (
              <li key={r.score} className="text-xs text-zinc-700">
                <span className="font-semibold">{r.score}</span> — {r.descriptor}
              </li>
            ))}
          </ul>
          {item.answerKey?.rationale && (
            <p className="text-xs text-zinc-600 mt-2">
              <span className="font-semibold">Exemplar inference:</span> {item.answerKey.rationale}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

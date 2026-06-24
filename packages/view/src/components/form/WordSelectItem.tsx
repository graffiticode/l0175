// SPDX-License-Identifier: MIT
// Word-select Hot Text (T10 Word Meanings, Task Model 3): the stem gives a definition; the student
// clicks the word in the excerpt that matches it. Single-part, exactly one correct word. The
// excerpt renders in-context — candidate words are underlined and clickable, other words plain.
import { useState } from "react";
import { StemLine, ResultBanner, cx, type Mode } from "./itemKit";

export function WordSelectItem({
  item,
  mode,
  respond,
}: {
  item: any;
  mode: Mode;
  respond: (r: any) => void;
}) {
  const [picked, setPicked] = useState<number | undefined>();
  const review = mode === "review";
  const preview = mode === "preview";
  const tokens: any[] = item.wordSelect?.tokens ?? [];
  const ok = picked !== undefined && !!tokens.find((t) => t.idx === picked)?.correct;
  const answered = picked !== undefined;

  const choose = (idx: number) => {
    setPicked(idx);
    respond({ selected: idx });
  };

  return (
    <div className="flex flex-col gap-2">
      <StemLine>{item.stem.partA}</StemLine>
      <p className="font-sans rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800 leading-loose">
        {tokens.map((t: any) => {
          if (!t.selectable) return <span key={t.idx}>{t.text} </span>;
          const on = picked === t.idx;
          const reveal = review || (preview && answered);
          const wrong = preview && on && !t.correct;
          return (
            <span key={t.idx}>
              <button
                type="button"
                onClick={() => choose(t.idx)}
                className={cx(
                  "appearance-none rounded px-1 cursor-pointer border underline decoration-dotted underline-offset-2 transition",
                  reveal && t.correct
                    ? "border-green-400 bg-green-50"
                    : wrong
                      ? "border-red-400 bg-red-50"
                      : on
                        ? "border-zinc-400 bg-zinc-100"
                        : "border-zinc-300 bg-white hover:bg-zinc-100",
                )}
              >
                {t.text}
                {reveal && t.correct && <span className="text-green-600 font-semibold ml-1">✓</span>}
                {wrong && <span className="text-red-600 font-semibold ml-1">✗</span>}
              </button>{" "}
            </span>
          );
        })}
      </p>
      {preview && answered && (
        <ResultBanner correct={ok}>
          {ok ? "Correct — 1 / 1 point." : "Not quite — 0 / 1 point."}
        </ResultBanner>
      )}
    </div>
  );
}

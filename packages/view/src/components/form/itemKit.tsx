// SPDX-License-Identifier: MIT
// Shared presentational helpers for the assessment-item renderers (EBSR / Hot Text / Short
// Text). Items are styled font-sans for readability inside the Form's mono container.
import type { Mode } from "./ModeToggle";

export type { Mode };

export function cx(...c: any[]) {
  return c.filter(Boolean).join(" ");
}

// distractorAnalysis indexed by "A:B" (part:key) for review-mode annotations.
export function analysisIndex(item: any): Record<string, any> {
  const m: Record<string, any> = {};
  for (const d of item.distractorAnalysis ?? []) m[`${d.part}:${d.key}`] = d;
  return m;
}

export function Pill({ children }: { children: any }) {
  return (
    <span className="inline-block rounded bg-zinc-100 text-zinc-700 text-[11px] font-medium px-1.5 py-0.5 uppercase tracking-wide">
      {children}
    </span>
  );
}

export function StemLine({ children }: { children: any }) {
  return <p className="text-sm font-semibold text-zinc-900">{children}</p>;
}

// A selectable option row (radio for single-select). In review mode the correct option is
// tinted green and any distractor analysis is shown beneath it.
export function OptionRow({
  name,
  optKey,
  selected,
  onSelect,
  mode,
  correct,
  children,
  analysis,
}: {
  name: string;
  optKey: string;
  selected: boolean;
  onSelect: () => void;
  mode: Mode;
  correct?: boolean;
  children: any;
  analysis?: any;
}) {
  const review = mode === "review";
  return (
    <div>
      <label
        className={cx(
          "flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition text-sm",
          review && correct
            ? "border-green-400 bg-green-50"
            : selected
              ? "border-zinc-400 bg-zinc-50"
              : "border-zinc-200 hover:bg-zinc-50",
        )}
      >
        <input
          type="radio"
          name={name}
          checked={selected}
          onChange={onSelect}
          className="appearance-none mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-300 checked:border-zinc-800 checked:border-4 cursor-pointer"
        />
        <span className="font-medium text-zinc-500 w-4">{optKey}</span>
        <span className="flex-1 text-zinc-900">{children}</span>
        {review && correct && <span className="text-green-600 font-semibold">✓</span>}
      </label>
      {review && analysis && (
        <p className="ml-9 mt-1 text-xs text-amber-700">
          <span className="font-semibold">{analysis.errorType || analysis.status}</span>
          {typeof analysis.plausibility === "number" ? ` · p=${analysis.plausibility}` : ""}
          {analysis.tiesTo && Array.isArray(analysis.tiesTo) ? "" : analysis.tiesTo ? ` → ${analysis.tiesTo}` : ""}
          {analysis.rationale ? ` — ${analysis.rationale}` : ""}
        </p>
      )}
    </div>
  );
}

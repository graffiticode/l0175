// SPDX-License-Identifier: MIT
// Questions / Answers / Passage toggle. The compiled item carries BOTH the answerable (questions)
// payload and the answer metadata (correct answers, distractor analysis), plus the reading passage,
// so toggling is local-only — no recompile. "Passage" shows the reading passage in its own view;
// "Questions" shows the items without the passage; "Answers" adds the answer key. Mirrors
// ThemeToggle's published-component styling constraints (preflight off). (Mode ids stay
// `preview`/`review`.)
export type Mode = "preview" | "review" | "passage";

export function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const opt = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={
        "appearance-none cursor-pointer px-3 py-1 text-xs font-medium rounded-md border transition " +
        (mode === m
          ? "bg-zinc-900 text-white border-zinc-900"
          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100")
      }
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex gap-1 self-end">
      {opt("passage", "Passage")}
      {opt("preview", "Questions")}
      {opt("review", "Answers")}
    </div>
  );
}

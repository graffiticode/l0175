// SPDX-License-Identifier: MIT
// Student / Review toggle. The compiled item carries BOTH the answerable payload and the
// review metadata (correct answers, distractor analysis), so toggling is local-only — no
// recompile. Mirrors ThemeToggle's published-component styling constraints (preflight off).
export type Mode = "student" | "review";

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
      {opt("student", "Student")}
      {opt("review", "Review")}
    </div>
  );
}

// SPDX-License-Identifier: MIT
// L0175's Form renders composed ELA assessment items (EBSR / Hot Text / Short Text) in a
// student-facing answerable mode with a toggle to a review overlay (correct answers,
// distractor analysis, scoring, warnings). Injected into the shared View (from
// @graffiticode/l0000-view), which supplies `state.data`, `state.errors`, and `state.apply`.
import "../../index.css";
import { useState } from "react";
import type { FormProps, CompileError } from "@graffiticode/l0000-view";
import { ModeToggle, type Mode } from "./ModeToggle";
import { ItemView, Passage } from "./ItemView";
import { CopyButton } from "./CopyButton";
import { uniquePassages } from "./copy";

function renderErrors(errors: CompileError[]) {
  return (
    <div className="flex flex-col gap-2">
      {errors.map((error, i) => (
        <div
          key={i}
          className="rounded-md p-3 border text-sm bg-red-50 border-red-200 text-red-800"
        >
          {error.message}
        </div>
      ))}
    </div>
  );
}

// Hover is applied per-button (not here) so the selected page can use a darker static background
// than the hover tint without the two conflicting.
const PAGE_BTN =
  "appearance-none cursor-pointer inline-flex items-center justify-center gap-x-2 rounded-lg " +
  "border border-transparent bg-transparent px-3 py-1.5 text-sm font-semibold text-zinc-700 " +
  "transition disabled:opacity-40 disabled:pointer-events-none";

function Pagination({
  count,
  current,
  setPage,
}: {
  count: number;
  current: number;
  setPage: (p: number) => void;
}) {
  return (
    <nav className="flex gap-x-2" aria-label="Question pagination">
      <span className="grow basis-0">
        <button
          type="button"
          onClick={() => setPage(current - 1)}
          disabled={current === 0}
          aria-label="Previous question"
          className={PAGE_BTN + " hover:bg-zinc-950/5"}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-4 h-4 stroke-current">
            <path d="M2.75 8H13.25M2.75 8L5.25 5.5M2.75 8L5.25 10.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Previous
        </button>
      </span>
      <span className="hidden items-baseline gap-x-2 sm:flex">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPage(i)}
            aria-current={i === current ? "page" : undefined}
            aria-label={`Question ${i + 1}`}
            className={PAGE_BTN + " min-w-9 " + (i === current ? "bg-zinc-950/10" : "hover:bg-zinc-950/5")}
          >
            {i + 1}
          </button>
        ))}
      </span>
      <span className="flex grow basis-0 justify-end">
        <button
          type="button"
          onClick={() => setPage(current + 1)}
          disabled={current === count - 1}
          aria-label="Next question"
          className={PAGE_BTN + " hover:bg-zinc-950/5"}
        >
          Next
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-4 h-4 stroke-current">
            <path d="M13.25 8L2.75 8M13.25 8L10.75 10.5M13.25 8L10.75 5.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </span>
    </nav>
  );
}

// The "Passage" view renders the reading passage for the current question, away from the items
// themselves. It receives the SAME paginated slice as the Questions/Answers views, so the passage
// nav has one button per question and stays in sync — different questions can use different
// passages, and switching tabs keeps you on the matching one (redundant repeats are intentional).
// Identical passages within the shown slice are still collapsed via uniquePassages.
function PassageView({ items }: { items: any[] }) {
  const passages = uniquePassages(items);
  if (passages.length === 0) {
    return <p className="text-sm text-zinc-500">No passage for this item.</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      {passages.map((p, i) => (
        <Passage key={i} passage={p} />
      ))}
    </div>
  );
}

export const Form = ({ state }: FormProps) => {
  const errors: CompileError[] = state.errors ?? [];
  const data: any = state.data;
  const [mode, setMode] = useState<Mode>("preview");
  const [page, setPage] = useState(0);

  const isItem = data && (data.kind === "item" || data.kind === "items");
  const items: any[] = data?.kind === "items" ? data.items : isItem ? [data] : [];

  // Multiple questions are paginated one at a time, in both Preview and Review.
  const paginated = items.length > 1;
  const current = Math.min(page, items.length - 1);
  const visibleItems = paginated ? [items[current]] : items;

  return (
    <div className="bg-white text-zinc-900 rounded-md flex flex-col gap-4 p-4">
      {errors.length > 0 ? (
        renderErrors(errors)
      ) : isItem ? (
        <>
          {paginated && (
            <Pagination count={items.length} current={current} setPage={setPage} />
          )}
          <div className="flex items-center justify-between gap-2">
            <CopyButton items={visibleItems} mode={mode} title={data.title} />
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
          {mode === "passage" ? (
            <PassageView items={visibleItems} />
          ) : (
            <div className="flex flex-col gap-8">
              {visibleItems.map((item, i) => (
                <ItemView key={item.id ?? i} item={item} mode={mode} apply={state.apply} />
              ))}
            </div>
          )}
        </>
      ) : (
        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
};

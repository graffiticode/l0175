// SPDX-License-Identifier: MIT
// L0175's Form renders composed ELA assessment items (EBSR / Hot Text / Short Text) in a
// student-facing answerable mode with a toggle to a review overlay (correct answers,
// distractor analysis, scoring, warnings). Injected into the shared View (from
// @graffiticode/l0000-view), which supplies `state.data`, `state.errors`, and `state.apply`.
import "../../index.css";
import { useState } from "react";
import type { FormProps, CompileError } from "@graffiticode/l0000-view";
import { ModeToggle, type Mode } from "./ModeToggle";
import { ItemView } from "./ItemView";

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
    <nav className="inline-flex flex-wrap gap-1 self-center" aria-label="Question pagination">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setPage(i)}
          aria-current={i === current ? "page" : undefined}
          aria-label={`Question ${i + 1}`}
          className={
            "appearance-none cursor-pointer w-7 h-7 text-xs font-medium rounded-md border transition " +
            (i === current
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100")
          }
        >
          {i + 1}
        </button>
      ))}
    </nav>
  );
}

export const Form = ({ state }: FormProps) => {
  const errors: CompileError[] = state.errors ?? [];
  const data: any = state.data;
  const [mode, setMode] = useState<Mode>("review");
  const [page, setPage] = useState(0);

  const isItem = data && (data.kind === "item" || data.kind === "items");
  const items: any[] = data?.kind === "items" ? data.items : isItem ? [data] : [];

  // In preview mode multiple questions are paginated one at a time; review mode stays stacked.
  const paginated = mode === "student" && items.length > 1;
  const current = Math.min(page, items.length - 1);
  const visibleItems = paginated ? [items[current]] : items;

  return (
    <div className="bg-white text-zinc-900 rounded-md flex flex-col gap-4 p-4">
      {errors.length > 0 ? (
        renderErrors(errors)
      ) : isItem ? (
        <>
          <ModeToggle mode={mode} setMode={setMode} />
          {paginated && <Pagination count={items.length} current={current} setPage={setPage} />}
          <div className="flex flex-col gap-8">
            {visibleItems.map((item, i) => (
              <ItemView key={item.id ?? i} item={item} mode={mode} apply={state.apply} />
            ))}
          </div>
        </>
      ) : (
        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
};

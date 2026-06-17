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

export const Form = ({ state }: FormProps) => {
  const errors: CompileError[] = state.errors ?? [];
  const data: any = state.data;
  const [mode, setMode] = useState<Mode>("student");

  const isItem = data && (data.kind === "item" || data.kind === "items");
  const items: any[] = data?.kind === "items" ? data.items : isItem ? [data] : [];

  return (
    <div className="bg-white text-zinc-900 rounded-md flex flex-col gap-4 p-4">
      {errors.length > 0 ? (
        renderErrors(errors)
      ) : isItem ? (
        <>
          <ModeToggle mode={mode} setMode={setMode} />
          <div className="flex flex-col gap-8">
            {items.map((item, i) => (
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

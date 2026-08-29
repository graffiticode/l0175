// SPDX-License-Identifier: MIT
// The "Answers" view: a bare answer key — the correct answer(s) for the visible question(s), with
// no stems, options, or distractor analysis (that's the "Rationale" view). Each block carries the
// same metadata pill row as its question so a paginated answer lines up with the item it answers.
// The rows come from `answerRows`, shared with the Copy serializer.
import { MetaPills } from "./ItemView";
import { answerRows, type AnswerRow } from "./answers";

function Row({ row }: { row: AnswerRow }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold text-zinc-700">
        {row.label}
        {row.note && <span className="ml-1.5 font-normal text-zinc-500">({row.note})</span>}
      </p>
      {row.values.map((v, i) => (
        <p key={i} className="text-sm text-zinc-900">
          <span className="text-green-600 font-semibold mr-1.5 select-none">✓</span>
          {v}
        </p>
      ))}
    </div>
  );
}

export function AnswersView({ items }: { items: any[] }) {
  return (
    <div className="flex flex-col gap-8">
      {(items ?? []).map((item, i) => {
        const rows = answerRows(item);
        return (
          <div key={item?.id ?? i} className="font-sans flex flex-col gap-3">
            <MetaPills item={item} />
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-500">No answer key for this item.</p>
            ) : (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 flex flex-col gap-3">
                {rows.map((row, j) => (
                  <Row key={j} row={row} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

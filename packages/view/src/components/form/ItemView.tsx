// SPDX-License-Identifier: MIT
// Renders one composed assessment item: a metadata header, the lead-in, the task-model-specific
// body, and (in review mode) the answer key, scoring, and warnings. The passage is never shown
// here — it lives in its own "Passage" tab.
import { Pill, type Mode } from "./itemKit";
import { EbsrItem } from "./EbsrItem";
import { HotTextItem } from "./HotTextItem";
import { ShortTextItem } from "./ShortTextItem";
import { MultipleChoiceItem } from "./MultipleChoiceItem";
import { MultiSelectItem } from "./MultiSelectItem";
import { Warnings } from "./Warnings";

const TYPE_LABEL: Record<string, string> = {
  "ebsr": "EBSR",
  "hot-text": "Hot Text",
  "short-text": "Short Text",
  "multiple-choice": "Multiple Choice",
  "multi-select": "Multi-Select",
};

export function Passage({ passage }: { passage: any }) {
  if (!passage) return null;
  return (
    <div className="font-sans rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{passage.heading}</p>
      <div className="flex flex-col gap-0.5">
        {passage.lines.map((l: any) => (
          <p key={l.id} className="text-sm text-zinc-800 leading-relaxed">
            <span className="text-zinc-400 mr-2 select-none">{l.id}</span>
            {l.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function ReviewPanel({ item }: { item: any }) {
  const r = item.review ?? {};
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 flex flex-col gap-2">
      <p className="text-xs font-semibold text-zinc-700">Answer key &amp; scoring</p>
      <p className="text-xs text-zinc-600">
        {item.answerKey?.partA && <>Part A: <span className="font-semibold">{item.answerKey.partA}</span>{" "}</>}
        {item.answerKey?.partB && (
          <>· Part B: <span className="font-semibold">
            {item.type === "hot-text" ? `any ${item.selectCount ?? 1} of: ${item.answerKey.partB}` : item.answerKey.partB}
          </span></>
        )}
      </p>
      <p className="text-xs text-zinc-600">{r.scoring}</p>
      {r.correctClaim && (
        <p className="text-xs text-zinc-600">
          <span className="font-semibold">Correct inference:</span> {r.correctClaim.text}
        </p>
      )}
      {r.alternativeClaims > 0 && (
        <p className="text-xs text-zinc-500">
          Selected from {r.alternativeClaims + 1} supported claim(s) matching this dimension.
        </p>
      )}
    </div>
  );
}

export function ItemView({
  item,
  mode,
  apply,
}: {
  item: any;
  mode: Mode;
  apply: (action: any) => void;
}) {
  const respond = (r: any) => apply({ type: "response", args: { itemId: item.id, ...r } });
  const body =
    item.type === "ebsr" ? (
      <EbsrItem item={item} mode={mode} respond={respond} />
    ) : item.type === "hot-text" ? (
      <HotTextItem item={item} mode={mode} respond={respond} />
    ) : item.type === "short-text" ? (
      <ShortTextItem item={item} mode={mode} respond={respond} />
    ) : item.type === "multiple-choice" ? (
      <MultipleChoiceItem item={item} mode={mode} respond={respond} />
    ) : item.type === "multi-select" ? (
      <MultiSelectItem item={item} mode={mode} respond={respond} />
    ) : null;

  return (
    <div className="font-sans flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill>{TYPE_LABEL[item.type] ?? item.type}</Pill>
        {(item.standards ?? []).map((s: string) => (
          <Pill key={s}>{s}</Pill>
        ))}
        {item.dok && <Pill>{item.dok}</Pill>}
        {item.dimension && <Pill>{item.dimension}</Pill>}
      </div>
      {item.stem?.leadIn && <p className="text-xs italic text-zinc-500">{item.stem.leadIn}</p>}
      {body}
      {mode === "review" && (
        <>
          <ReviewPanel item={item} />
          <Warnings warnings={item.warnings ?? []} />
        </>
      )}
    </div>
  );
}

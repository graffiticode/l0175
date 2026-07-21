// SPDX-License-Identifier: MIT
// The copy buttons beside the Questions/Review/Passage toggle. "Copy" copies the currently visible
// content in the current mode as rich text (Questions -> the question; Review -> the question + a
// clean answer key; Passage -> the reading passage). "Copy All" (shown only when the items are
// paginated) copies the whole set — the passage plus every question, or every answer key in Review
// mode — so a teacher can paste a full WYSIWYG worksheet into Google Docs or Word.
import { useState } from "react";
import type { Mode } from "./ModeToggle";
import { itemsToHtml, itemsToText, passagesToHtml, passagesToText, copyRichText } from "./copy";

// Serialize the given items in the given mode to a rich-text payload (HTML + plain-text fallback).
// Passage mode serializes just the reading passage(s); the other modes lead with the passage(s)
// then the question(s)/answer key(s).
// Both buttons title their sections ("Passage", "Question"/"Answer Key"); "Copy All" numbers the
// items ("Question #1", …) since it spans the whole set, while the single "Copy" leaves them bare.
function payload(items: any[], mode: Mode, title?: string, numbered = false): { html: string; text: string } {
  if (mode === "passage") {
    return { html: passagesToHtml(items, title, true), text: passagesToText(items, title, true) };
  }
  return {
    html: itemsToHtml(items, mode, title, true, numbered),
    text: itemsToText(items, mode, title, true, numbered),
  };
}

// One copy button with its own copied/failed feedback state.
function CopyBtn({ label, build }: { label: string; build: () => { html: string; text: string } }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const onCopy = async () => {
    // Serialize + clipboard-write can both throw (a malformed item, or a clipboard permission
    // error in an embedded iframe). Guard the whole thing so a failure surfaces as "Copy failed"
    // instead of the button silently doing nothing.
    try {
      const { html, text } = build();
      const ok = await copyRichText(html, text);
      if (ok) {
        setCopied(true);
        setFailed(false);
        setTimeout(() => setCopied(false), 1500);
        return;
      }
    } catch (err) {
      console.error("Copy failed", err);
    }
    setFailed(true);
    setTimeout(() => setFailed(false), 2000);
  };

  const text = copied ? "Copied!" : failed ? "Copy failed" : label;

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={text}
      className={
        "appearance-none cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium " +
        "rounded-md border transition " +
        (copied
          ? "bg-green-50 text-green-700 border-green-300"
          : failed
            ? "bg-red-50 text-red-700 border-red-300"
            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100")
      }
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-3.5 h-3.5 stroke-current">
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" strokeWidth={1.3} />
        <path d="M10.5 2.5H3.5a1 1 0 0 0-1 1v7" strokeWidth={1.3} strokeLinecap="round" />
      </svg>
      {text}
    </button>
  );
}

export function CopyButton({
  items,
  allItems,
  mode,
  title,
}: {
  items: any[];
  allItems?: any[];
  mode: Mode;
  title?: string;
}) {
  // "Copy All" copies the whole set: passage + all questions, or all answer keys in Review mode.
  // Shown only in the Questions/Review views (not Passage) and when there are more items than the
  // visible slice (i.e. paginated).
  const showAll = mode !== "passage" && Array.isArray(allItems) && allItems.length > items.length;
  const allMode: Mode = mode === "review" ? "review" : "preview";

  return (
    <div className="flex items-center gap-2">
      <CopyBtn label="Copy" build={() => payload(items, mode, title)} />
      {showAll && <CopyBtn label="Copy All" build={() => payload(allItems!, allMode, title, true)} />}
      {/* single Copy leaves items unnumbered (numbered defaults to false) */}
    </div>
  );
}

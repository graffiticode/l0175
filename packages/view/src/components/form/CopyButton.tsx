// SPDX-License-Identifier: MIT
// A context-aware "Copy" button beside the Questions/Review/Passage toggle. It copies the
// currently visible content in the current mode as rich text (Questions -> the question; Review ->
// the question + a clean answer key; Passage -> the reading passage) so a teacher can paste a
// WYSIWYG version into Google Docs or Word.
import { useState } from "react";
import type { Mode } from "./ModeToggle";
import { itemsToHtml, itemsToText, passagesToHtml, passagesToText, copyRichText } from "./copy";

export function CopyButton({ items, mode, title }: { items: any[]; mode: Mode; title?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const onCopy = async () => {
    // Serialize + clipboard-write can both throw (a malformed item, or a clipboard permission
    // error in an embedded iframe). Guard the whole thing so a failure surfaces as "Copy failed"
    // instead of the button silently doing nothing.
    try {
      const passage = mode === "passage";
      const html = passage ? passagesToHtml(items, title) : itemsToHtml(items, mode, title);
      const text = passage ? passagesToText(items, title) : itemsToText(items, mode, title);
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

  const label = copied
    ? "Copied!"
    : failed
      ? "Copy failed"
      : mode === "review"
        ? "Copy answer key"
        : mode === "passage"
          ? "Copy passage"
          : "Copy question";

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
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
      {label}
    </button>
  );
}

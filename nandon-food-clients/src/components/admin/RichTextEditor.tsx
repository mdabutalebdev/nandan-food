"use client";

import { useEffect, useRef } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Link2, Link2Off, Heading2, Heading3, Pilcrow, Quote, RemoveFormatting,
} from "lucide-react";

/**
 * Lightweight self-contained WYSIWYG editor (no external deps).
 * Uses contentEditable + document.execCommand — outputs plain HTML that the
 * storefront renders with its prose styles. Good enough for CMS-style pages.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Push external value in only when it differs and the editor isn't focused,
  // so loading content works but typing never loses the caret.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== (value || "")) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const emit = () => ref.current && onChange(ref.current.innerHTML);

  const cmd = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (url) cmd("createLink", url.trim());
  };

  const Btn = ({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()} // keep the selection in the editor
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-white hover:text-brand ${active ? "bg-white text-brand" : ""}`}
    >
      {children}
    </button>
  );

  const Sep = () => <span className="mx-1 h-5 w-px bg-line" />;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white focus-within:border-brand">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-page px-2 py-1.5">
        <Btn onClick={() => cmd("bold")} title="Bold"><Bold size={16} /></Btn>
        <Btn onClick={() => cmd("italic")} title="Italic"><Italic size={16} /></Btn>
        <Btn onClick={() => cmd("underline")} title="Underline"><Underline size={16} /></Btn>
        <Sep />
        <Btn onClick={() => cmd("formatBlock", "<h2>")} title="Heading"><Heading2 size={16} /></Btn>
        <Btn onClick={() => cmd("formatBlock", "<h3>")} title="Subheading"><Heading3 size={16} /></Btn>
        <Btn onClick={() => cmd("formatBlock", "<p>")} title="Paragraph"><Pilcrow size={16} /></Btn>
        <Btn onClick={() => cmd("formatBlock", "<blockquote>")} title="Quote"><Quote size={16} /></Btn>
        <Sep />
        <Btn onClick={() => cmd("insertUnorderedList")} title="Bullet list"><List size={16} /></Btn>
        <Btn onClick={() => cmd("insertOrderedList")} title="Numbered list"><ListOrdered size={16} /></Btn>
        <Sep />
        <Btn onClick={addLink} title="Add link"><Link2 size={16} /></Btn>
        <Btn onClick={() => cmd("unlink")} title="Remove link"><Link2Off size={16} /></Btn>
        <Btn onClick={() => cmd("removeFormat")} title="Clear formatting"><RemoveFormatting size={16} /></Btn>
      </div>

      {/* Editable area — styled to preview the storefront look */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="rte min-h-[320px] max-h-[70vh] overflow-y-auto px-4 py-3 text-sm leading-relaxed text-ink-soft outline-none
          [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink
          [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-ink
          [&_p]:mt-2.5
          [&_ul]:mt-2 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:mt-2 [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:mt-1
          [&_a]:text-brand [&_a]:underline
          [&_strong]:font-bold [&_strong]:text-ink [&_b]:font-bold [&_b]:text-ink
          [&_blockquote]:mt-3 [&_blockquote]:border-l-4 [&_blockquote]:border-brand/30 [&_blockquote]:pl-4 [&_blockquote]:italic"
      />
    </div>
  );
}

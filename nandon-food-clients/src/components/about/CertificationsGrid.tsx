"use client";

import { useCallback, useEffect, useState } from "react";
import { Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { AboutCard } from "@/lib/types";

/** Certificate cards with hover overlay + a click-to-zoom lightbox. */
export default function CertificationsGrid({ items }: { items: AboutCard[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (dir: number) =>
      setOpen((i) => (i === null ? i : (i + dir + items.length) % items.length)),
    [items.length],
  );

  // Keyboard: Esc closes, ←/→ navigate. Lock body scroll while open.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, go]);

  if (!items.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((c, i) => (
          <button
            key={c._id || i}
            onClick={() => setOpen(i)}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-white shadow-sm transition-shadow hover:shadow-md"
            aria-label={c.title || `Certificate ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.imageUrl}
              alt={c.title || "Certificate"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {/* Hover: light black overlay + zoom icon */}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/45 group-hover:opacity-100">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink shadow">
                <Maximize2 size={18} />
              </span>
            </span>
            {c.title && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-left text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {c.title}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
          >
            <X size={22} />
          </button>

          {items.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                aria-label="Previous"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:left-6"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); go(1); }}
                aria-label="Next"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:right-6"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <figure className="max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={items[open].imageUrl}
              alt={items[open].title || "Certificate"}
              className="mx-auto max-h-[82vh] w-auto rounded-lg object-contain shadow-2xl"
            />
            {items[open].title && (
              <figcaption className="mt-3 text-center text-sm text-white/90">{items[open].title}</figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}

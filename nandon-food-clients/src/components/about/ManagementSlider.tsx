"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AboutCard } from "@/lib/types";

/** Horizontal, snap-scrolling card slider for the "Our Management" section. */
export default function ManagementSlider({ members }: { members: AboutCard[] }) {
  const rail = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  if (!members.length) return null;

  return (
    <div className="relative">
      {/* Arrows (hidden until there's overflow-worthy count) */}
      {members.length > 3 && (
        <div className="pointer-events-none absolute -top-14 right-0 hidden gap-2 sm:flex">
          <button
            onClick={() => scroll(-1)}
            aria-label="Previous"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-brand hover:text-brand"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Next"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-brand hover:text-brand"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div
        ref={rail}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
      >
        {members.map((m, i) => (
          <figure
            key={m._id || i}
            data-card
            className="group w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-shadow hover:shadow-md sm:w-[240px]"
          >
            <div className="aspect-[3/4] overflow-hidden bg-page">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.imageUrl}
                alt={m.title || "Team member"}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <figcaption className="px-4 py-4 text-center">
              {m.title && <p className="font-display text-base font-bold text-ink">{m.title}</p>}
              {m.description && (
                <p className="mt-0.5 text-sm font-medium text-brand">{m.description}</p>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/api";

type Card = { imageUrl: string; title: string; description: string };

export default function HealthPromises() {
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    getSiteContent()
      .then((data) => {
        const arr = (data?.healthPromises as Array<Record<string, unknown>>) ?? [];
        setCards(
          arr
            .filter((x) => x.active !== false && x.imageUrl)
            .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
            .map((x) => ({
              imageUrl: x.imageUrl as string,
              title: (x.title as string) || "",
              description: (x.description as string) || "",
            })),
        );
      })
      .catch(() => {});
  }, []);

  // No fallback — hide the whole section until the admin adds items.
  if (!cards.length) return null;

  return (
    <section className="frame py-6">
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-extrabold text-brand sm:text-3xl">Our Health Promises</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const hasText = !!(c.title || c.description);
          return (
            <article key={i} className="relative aspect-[4/3] overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={c.title || ""} className="absolute inset-0 h-full w-full object-cover" />
              {hasText && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/0" />
                  <div className="relative flex h-full flex-col justify-end p-5 text-white">
                    {c.title && <h3 className="font-display text-lg font-bold leading-tight">{c.title}</h3>}
                    {c.description && <p className="mt-1.5 text-sm leading-snug text-white/85">{c.description}</p>}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

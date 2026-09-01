"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/api";

type Item = { imageUrl: string; title?: string; link?: string };

export default function WideBannerSection({
  section,
  heading,
  eyebrow,
}: {
  section: string;
  heading: string;
  eyebrow?: string;
}) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    getSiteContent()
      .then((data) => {
        const arr = (data?.[section] as Array<Record<string, unknown>>) ?? [];
        setItems(
          arr
            .filter((x) => x.active !== false && x.imageUrl)
            .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
            .map((x) => ({ imageUrl: x.imageUrl as string, title: x.title as string, link: x.link as string })),
        );
      })
      .catch(() => {});
  }, [section]);

  // No fallback — hide the section until the admin adds a banner.
  if (!items.length) return null;

  return (
    <section>
      <div className="frame py-5 text-center">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</p>}
        <h2 className="mt-1 font-display text-2xl font-extrabold text-brand sm:text-3xl">{heading}</h2>
      </div>
      <div className="space-y-4">
        {items.map((it, i) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.imageUrl} alt={it.title || ""} className="block h-auto w-full" />
          );
          return it.link ? (
            <Link key={i} href={it.link} className="block">
              {img}
            </Link>
          ) : (
            <div key={i}>{img}</div>
          );
        })}
      </div>
    </section>
  );
}

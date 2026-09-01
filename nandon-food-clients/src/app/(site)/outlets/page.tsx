"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";
import { getSiteContent } from "@/lib/api";
import PageHero from "@/components/PageHero";

type Card = { imageUrl?: string; title?: string; description?: string; link?: string; active?: boolean; order?: number };

export default function OutletsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteContent().then((d) => {
      // /outlets is managed on its own (outletList); fall back to the older
      // shared `outlets` list only if it hasn't been seeded yet.
      const raw = (d?.outletList as Card[]) ?? (d?.outlets as Card[]) ?? [];
      const list = raw.filter((c) => c.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setCards(list);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHero eyebrow="Visit us" title="Our Outlets" subtitle="Find a Nandon Foods outlet near you." />

      <div className="frame py-12 lg:py-16">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl border border-line bg-white" />)}
          </div>
        ) : cards.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-line bg-white py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand">
              <Store size={22} strokeWidth={1.75} />
            </span>
            <p className="mt-4 font-display text-base font-bold text-ink">Outlet details coming soon</p>
            <p className="mt-1 text-sm text-ink-soft">Meanwhile, order online and we&apos;ll deliver to your door.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/products" className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">Shop online</Link>
              <Link href="/contact" className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">Contact us</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c, i) => {
              const inner = (
                <div className="overflow-hidden rounded-xl border border-line bg-white">
                  <div className="aspect-[4/3] overflow-hidden bg-page">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imageUrl} alt={c.title || "Outlet"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-soft/40">
                        <Store size={40} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  {(c.title || c.description) && (
                    <div className="p-5">
                      {c.title && <h3 className="font-display text-base font-bold text-ink">{c.title}</h3>}
                      {c.description && <p className="mt-1 text-sm text-ink-soft">{c.description}</p>}
                    </div>
                  )}
                </div>
              );
              return c.link ? <Link key={i} href={c.link}>{inner}</Link> : <div key={i}>{inner}</div>;
            })}
          </div>
        )}

        <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-sm text-ink-soft">
          Prefer home delivery?
          <Link href="/products" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
            Browse the full catalogue <ArrowRight size={15} />
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import type { AboutCard } from "@/lib/types";

/** Repeat the list until it's wide enough, so the -50% loop never shows a gap. */
function fill(items: AboutCard[]): AboutCard[] {
  if (!items.length) return [];
  const base = [...items];
  while (base.length < 8) base.push(...items);
  return base;
}

function Logo({ c }: { c: AboutCard }) {
  return (
    <div className="mx-3 flex h-20 w-40 shrink-0 items-center justify-center rounded-xl border border-line bg-white px-4 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.imageUrl}
        alt={c.title || "Client"}
        className="max-h-12 max-w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

/** One row: two identical tracks so the marquee loops seamlessly. */
function Row({ items, dir }: { items: AboutCard[]; dir: "left" | "right" }) {
  const base = fill(items);
  const anim = dir === "left" ? "marquee-left" : "marquee-right";
  return (
    <div className="marquee-row group relative overflow-hidden py-1">
      <div className={`flex w-max ${anim}`}>
        {base.map((c, i) => (
          <Logo key={`a-${i}`} c={c} />
        ))}
        {base.map((c, i) => (
          <Logo key={`b-${i}`} c={c} />
        ))}
      </div>
      {/* Soft fade on both edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-page to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-page to-transparent" />
    </div>
  );
}

/** "Our Clients" — logos split into two rows scrolling opposite ways. */
export default function ClientsMarquee({ clients }: { clients: AboutCard[] }) {
  if (!clients.length) return null;

  // Split into two groups; row 1 drifts right→left, row 2 left→right.
  const mid = Math.ceil(clients.length / 2);
  const top = clients.slice(0, mid);
  const bottom = clients.length > 1 ? clients.slice(mid) : clients;

  return (
    <div className="space-y-4">
      <Row items={top} dir="left" />
      <Row items={bottom.length ? bottom : top} dir="right" />
    </div>
  );
}

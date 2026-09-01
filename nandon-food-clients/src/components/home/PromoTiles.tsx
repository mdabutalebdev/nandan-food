import Link from "next/link";

/** The 4-up tile row (kazifarms "Mid-01..04" band), Nandon-branded. */
const TILES = [
  {
    title: "Our Products",
    sub: "Meat · Poultry · Fish · Agro",
    href: "/products",
    tint: "bg-brand-tint",
    ring: "ring-brand/20",
    icon: (
      <path d="M4 12a8 8 0 0 1 16 0M6 12v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5" />
    ),
  },
  {
    title: "Our Outlets",
    sub: "Find a store near you",
    href: "/outlets",
    tint: "bg-maroon-tint",
    ring: "ring-maroon/20",
    icon: <path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11zM12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  },
  {
    title: "Certifications",
    sub: "HACCP · ISO · 100% Halal",
    href: "/certifications",
    tint: "bg-cream-soft",
    ring: "ring-brand/20",
    icon: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3zM9.5 12l1.8 1.8L15 10" />,
  },
  {
    title: "Home Delivery",
    sub: "Fast delivery in Dhaka",
    href: "/contact",
    tint: "bg-brand-tint",
    ring: "ring-brand/20",
    icon: <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 7 19zM18 19a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z" />,
  },
];

export default function PromoTiles() {
  return (
    <section className="frame py-10">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TILES.map((t) => (
          <Link
            key={t.title}
            href={t.href}
            className={`group flex items-center gap-4 rounded-xl border border-line ${t.tint} p-4 ring-1 ${t.ring} transition-all hover:-translate-y-0.5 hover:shadow-md`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-dark shadow-sm ring-1 ring-black/5">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
            </span>
            <span>
              <span className="block font-display text-[15px] font-bold text-ink group-hover:text-maroon">
                {t.title}
              </span>
              <span className="block text-xs text-ink-soft">{t.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

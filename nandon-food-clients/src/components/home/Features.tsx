import { BadgeCheck, Sprout, ShieldCheck, Truck, type LucideIcon } from "lucide-react";

const FEATURES: { title: string; sub: string; Icon: LucideIcon }[] = [
  { title: "100% Halal", sub: "Certified & ethically sourced", Icon: BadgeCheck },
  { title: "Farm Fresh", sub: "Cold-chain from farm to fork", Icon: Sprout },
  { title: "Quality Assured", sub: "HACCP & ISO processing", Icon: ShieldCheck },
  { title: "Fast Delivery", sub: "Same-day inside Dhaka", Icon: Truck },
];

export default function Features() {
  return (
    <section className="frame">
      <div className="grid grid-cols-2 divide-line rounded-xl border border-line bg-white sm:grid-cols-4 sm:divide-x">
        {FEATURES.map(({ title, sub, Icon }) => (
          <div key={title} className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
              <Icon size={22} strokeWidth={1.75} />
            </span>
            <span>
              <span className="block font-display text-[15px] font-bold text-ink">{title}</span>
              <span className="block text-xs text-ink-soft">{sub}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

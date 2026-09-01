import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FALLBACK_CATEGORY_TREE } from "@/lib/menu";
import CategoryIcon from "@/components/CategoryIcon";

export default function CategoryStrip() {
  return (
    <section className="frame py-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Fresh & frozen</p>
          <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            Shop by category
          </h2>
        </div>
        <Link href="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-maroon hover:underline">
          View all <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {FALLBACK_CATEGORY_TREE.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className="group flex flex-col items-center rounded-xl border border-line bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
          >
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white">
              <CategoryIcon name={c.name} size={24} />
            </span>
            <span className="text-[13px] font-semibold text-ink group-hover:text-maroon">
              {c.name}
            </span>
            {!!c.children?.length && (
              <span className="mt-0.5 text-[11px] text-ink-soft">
                {c.children.length} items
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

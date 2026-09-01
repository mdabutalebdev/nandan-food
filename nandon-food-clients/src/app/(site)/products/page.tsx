"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { getProducts } from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";

const SORTS = [
  { label: "Newest", value: "-createdAt" },
  { label: "Price: Low → High", value: "price" },
  { label: "Price: High → Low", value: "-price" },
  { label: "Best selling", value: "-totalSold" },
];

function Shop() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";

  const [products, setProducts] = useState<Product[] | null>(null);
  const [sort, setSort] = useState("-createdAt");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    getProducts({ searchTerm: q || undefined, sort, limit: 30, status: "active" }).then(
      ({ products, meta }) => {
        if (!alive) return;
        setProducts(products);
        setTotal(meta.total ?? products.length);
      },
    );
    return () => {
      alive = false;
    };
  }, [q, sort]);

  // Derived — `null` until the first fetch resolves.
  const loading = products === null;
  const list = products ?? [];

  return (
    <div className="frame py-6">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span>/</span>
        <span className="font-semibold text-ink">{q ? "Search" : "All products"}</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            {q ? `Results for “${q}”` : "All products"}
          </h1>
          {!loading && <p className="mt-1 text-sm text-ink-soft">{total} product{total === 1 ? "" : "s"}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl border border-line bg-white" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-brand"><SearchX size={30} strokeWidth={1.5} /></div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink">No products found</h3>
          <p className="mt-1 text-sm text-ink-soft">{q ? "Try a different search." : "Products will appear here once added."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="frame py-16 text-center text-ink-soft">Loading…</div>}>
      <Shop />
    </Suspense>
  );
}

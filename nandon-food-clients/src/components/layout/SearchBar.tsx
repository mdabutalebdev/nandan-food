"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { getProducts } from "@/lib/api";
import { taka } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const term = q.trim();

  // Debounced live suggestions.
  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const { products } = await getProducts(
        { searchTerm: term, limit: 6, status: "active", visibility: "visible" },
        ctrl.signal,
      );
      setResults(products);
      setLoading(false);
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const goToResults = () => {
    if (!term) return;
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(term)}`);
  };

  const goToProduct = (slug: string) => {
    setOpen(false);
    setQ("");
    router.push(`/product/${slug}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && results[active]) goToProduct(results[active].slug);
    else goToResults();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Escape") setOpen(false);
  };

  const showPanel = open && term.length >= 2;

  return (
    <div ref={rootRef} className="relative w-full">
      <form onSubmit={onSubmit}>
        <div className="flex items-center overflow-hidden rounded-lg border border-line bg-page focus-within:border-brand focus-within:bg-white">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search for chicken, beef, fish, frozen…"
            className="w-full bg-transparent px-4 py-2.5 text-sm outline-none"
            aria-label="Search products"
            autoComplete="off"
          />
          <button
            type="submit"
            className="m-1 flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3.5 text-white transition-colors hover:bg-brand-dark"
            aria-label="Search"
          >
            <Search size={16} />
            <span className="hidden text-[13px] font-semibold lg:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-2xl ring-1 ring-black/5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-ink-soft">
              <Loader2 size={16} className="animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-soft">
              No products found for “<span className="font-semibold text-ink">{term}</span>”.
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1.5">
              {results.map((p, i) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => goToProduct(p.slug)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${active === i ? "bg-brand-tint" : "hover:bg-page"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                      <span className="text-xs font-semibold text-brand">{taka(p.discountedPrice ?? p.price)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/products?q=${encodeURIComponent(term)}`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-line bg-page/60 px-4 py-2.5 text-[13px] font-bold text-brand-dark hover:bg-brand-tint"
          >
            See all results for “{term}” <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

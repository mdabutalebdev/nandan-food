"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { getCategories, getProducts } from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";
import type { ApiCategory, Product } from "@/lib/types";

const SORTS = [
  { label: "Newest", value: "-createdAt" },
  { label: "Price: Low → High", value: "price" },
  { label: "Price: High → Low", value: "-price" },
  { label: "Best selling", value: "-totalSold" },
];

const catId = (c: ApiCategory) => c.id || c._id || c.slug;
const parentId = (c: ApiCategory): string | null =>
  !c.parent ? null : typeof c.parent === "string" ? c.parent : c.parent._id;

export default function CategoryPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug as string);

  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [catsLoaded, setCatsLoaded] = useState(false);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [sort, setSort] = useState("-createdAt");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getCategories().then((c) => {
      setCats(c);
      setCatsLoaded(true);
    });
  }, []);

  const { current, trail, descendantIds } = useMemo(() => {
    const found = cats.find((c) => c.slug === slug) || null;
    if (!found) return { current: null as ApiCategory | null, trail: [] as ApiCategory[], descendantIds: [] as string[] };

    const byId = new Map(cats.map((c) => [catId(c), c]));
    // Ancestors (for breadcrumb)
    const trail: ApiCategory[] = [];
    let node: ApiCategory | undefined = found;
    while (node) {
      trail.unshift(node);
      const pid = parentId(node);
      node = pid ? byId.get(pid) : undefined;
    }
    // Descendants (self + all below) for the product filter
    const childrenOf = new Map<string, ApiCategory[]>();
    for (const c of cats) {
      const p = parentId(c);
      if (!p) continue;
      const arr = childrenOf.get(p) ?? [];
      arr.push(c);
      childrenOf.set(p, arr);
    }
    const ids: string[] = [];
    const stack: ApiCategory[] = [found];
    while (stack.length) {
      const n = stack.pop()!;
      ids.push(catId(n));
      stack.push(...(childrenOf.get(catId(n)) ?? []));
    }
    return { current: found, trail, descendantIds: ids };
  }, [cats, slug]);

  useEffect(() => {
    if (!catsLoaded) return;
    let alive = true;
    if (!current) {
      // Defer so we never call setState synchronously inside the effect body.
      Promise.resolve().then(() => {
        if (!alive) return;
        setProducts([]);
        setTotal(0);
      });
      return () => {
        alive = false;
      };
    }
    getProducts({ categoryIds: descendantIds.join(","), sort, limit: 30, status: "active" }).then(
      ({ products, meta }) => {
        if (!alive) return;
        setProducts(products);
        setTotal(meta.total ?? products.length);
      },
    );
    return () => {
      alive = false;
    };
  }, [catsLoaded, current, descendantIds, sort]);

  // Derived — `null` means "still loading" (nothing fetched yet).
  const loading = products === null;
  const list = products ?? [];

  // Direct child categories, shown as quick chips.
  const childChips = useMemo(() => {
    if (!current) return [];
    return cats.filter((c) => parentId(c) === catId(current));
  }, [cats, current]);

  const title = current?.name ?? slug?.replace(/-/g, " ");

  return (
    <div className="frame py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand">Products</Link>
        {trail.map((c) => (
          <span key={catId(c)} className="flex items-center gap-1.5">
            <span>/</span>
            <Link href={`/category/${c.slug}`} className={c.slug === slug ? "font-semibold text-ink" : "hover:text-brand"}>
              {c.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold capitalize text-ink sm:text-3xl">{title}</h1>
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

      {/* Sub-category chips */}
      {childChips.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {childChips.map((c) => (
            <Link
              key={catId(c)}
              href={`/category/${c.slug}`}
              className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl border border-line bg-white" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-brand"><PackageSearch size={30} strokeWidth={1.5} /></div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink">No products here yet</h3>
          <p className="mt-1 text-sm text-ink-soft">Products for this category will appear once they’re added.</p>
          <Link href="/products" className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
            Browse all products
          </Link>
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

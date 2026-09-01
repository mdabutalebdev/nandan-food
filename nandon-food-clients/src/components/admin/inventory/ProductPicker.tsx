"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, X, Plus } from "lucide-react";
import type { InventoryItem } from "@/lib/admin";
import { num } from "@/components/admin/ui";

/**
 * Searchable product selector for the Purchase / Usage forms.
 * Type to filter the products you've created; if it isn't listed, a link
 * points to the Products page to add it. Emits the selected item id.
 */
export default function ProductPicker({
  items,
  value,
  onChange,
  autoFocus,
}: {
  items: InventoryItem[];
  value: string;
  onChange: (id: string) => void;
  autoFocus?: boolean;
}) {
  const selected = items.find((i) => i._id === value) || null;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const term = q.trim().toLowerCase();
  const filtered = term
    ? items.filter((i) => i.name.toLowerCase().includes(term) || (i.code || "").toLowerCase().includes(term))
    : items;

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQ("");
  };

  const inputCls =
    "w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white";

  return (
    <div ref={ref} className="relative">
      {selected && !open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setQ(""); }}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-left text-sm"
        >
          <span className="min-w-0 truncate">
            <span className="font-semibold text-ink">{selected.name}</span>
            <span className="ml-2 text-xs text-ink-soft">{num(selected.stock)} {selected.unit} in stock</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-ink-soft">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="rounded p-0.5 hover:text-red-600"
              aria-label="Clear"
            >
              <X size={15} />
            </span>
            <ChevronDown size={15} />
          </span>
        </button>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"><Search size={15} /></span>
          <input
            value={q}
            autoFocus={autoFocus}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search a product…"
            className={`${inputCls} pl-9`}
          />
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-line bg-white shadow-xl ring-1 ring-black/5">
          {filtered.length === 0 ? (
            <div className="px-4 py-4 text-sm text-ink-soft">
              {term ? <>No product matches “<b className="text-ink">{q}</b>”.</> : "No products yet."}
              <Link
                href="/admin/inventory-products"
                className="mt-2 flex items-center gap-1.5 font-semibold text-brand hover:underline"
              >
                <Plus size={14} /> Add it in Products
              </Link>
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.map((i) => (
                <li key={i._id}>
                  <button
                    type="button"
                    onClick={() => pick(i._id)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-brand-tint ${i._id === value ? "bg-brand-tint/60" : ""}`}
                  >
                    <span className="min-w-0 truncate font-medium text-ink">{i.name}</span>
                    <span className="shrink-0 text-xs text-ink-soft">{num(i.stock)} {i.unit}</span>
                  </button>
                </li>
              ))}
              <li className="border-t border-line">
                <Link
                  href="/admin/inventory-products"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand hover:bg-page"
                >
                  <Plus size={13} /> Add a new product
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

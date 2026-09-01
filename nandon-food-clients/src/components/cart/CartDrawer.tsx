"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getProducts } from "@/lib/api";
import { taka } from "@/lib/format";
import type { Product } from "@/lib/types";

/* Quantity stepper -------------------------------------------------- */
function Stepper({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-line">
      <button onClick={onDec} aria-label="Decrease" className="flex h-8 w-8 items-center justify-center text-ink-soft hover:text-brand">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 10h10" strokeLinecap="round" /></svg>
      </button>
      <span className="w-8 text-center text-sm font-bold text-ink">{value}</span>
      <button onClick={onInc} aria-label="Increase" className="flex h-8 w-8 items-center justify-center text-ink-soft hover:text-brand">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 5v10M5 10h10" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, subtotal, setQty, removeItem, count } = useCart();
  const [suggest, setSuggest] = useState<Product[]>([]);

  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Load a few "you may also like" products once.
  useEffect(() => {
    if (!isOpen || suggest.length) return;
    getProducts({ flag: "best-selling", limit: 6 }).then(({ products }) => {
      if (products.length) setSuggest(products);
      else getProducts({ limit: 6 }).then((r) => setSuggest(r.products));
    });
  }, [isOpen, suggest.length]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />

      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-ink">
            Shopping Cart {count > 0 && <span className="text-brand">({count})</span>}
          </h2>
          <button onClick={closeCart} className="flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand">
            Close
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-page text-ink-soft"><ShoppingCart size={34} strokeWidth={1.5} /></div>
            <p className="font-display text-lg font-bold text-ink">Your cart is empty</p>
            <p className="text-sm text-ink-soft">Add some fresh products to get started.</p>
            <button onClick={closeCart} className="mt-2 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {items.map((it) => (
                <div key={`${it.productId}-${it.variantId || ""}`} className="flex gap-3 rounded-xl border border-line p-3">
                  <Link href={`/product/${it.slug}`} onClick={closeCart} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.thumbnail} alt={it.name} className="h-20 w-20 rounded-lg object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/product/${it.slug}`} onClick={closeCart} className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand">
                        {it.name}
                      </Link>
                      <button onClick={() => removeItem(it.productId, it.variantId)} aria-label="Remove" className="shrink-0 text-ink-soft hover:text-red-600">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                    {(it.color || it.size) && (
                      <p className="mt-0.5 text-xs text-ink-soft">{[it.color, it.size].filter(Boolean).join(" · ")}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Stepper
                        value={it.quantity}
                        onDec={() => setQty(it.productId, it.quantity - 1, it.variantId)}
                        onInc={() => setQty(it.productId, it.quantity + 1, it.variantId)}
                      />
                      <span className="text-sm font-bold text-brand">{taka(it.price * it.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* You may also like */}
              {suggest.length > 0 && (
                <div className="pt-3">
                  <h3 className="mb-2 font-display text-sm font-bold text-ink">You may also like</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {suggest.slice(0, 6).map((p) => (
                      <Link
                        key={p._id}
                        href={`/product/${p.slug}`}
                        onClick={closeCart}
                        className="w-28 shrink-0 rounded-lg border border-line p-2 transition-colors hover:border-brand"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.thumbnail} alt={p.name} className="h-20 w-full rounded-md object-cover" />
                        <p className="mt-1.5 line-clamp-2 text-[11px] font-medium text-ink">{p.name}</p>
                        <p className="text-xs font-bold text-brand">{taka(p.price)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-line px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-soft">Subtotal</span>
                <span className="font-display text-lg font-extrabold text-ink">{taka(subtotal)}</span>
              </div>
              <p className="mb-3 text-xs text-ink-soft">Delivery charge calculated at checkout.</p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="flex w-full items-center justify-center rounded-full bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                Checkout · {taka(subtotal)}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

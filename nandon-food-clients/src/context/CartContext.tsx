"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "nandon_cart";

/** Unique key for a cart line (product + variant). */
const lineKey = (productId: string, variantId?: string) => `${productId}::${variantId || ""}`;

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem, opts?: { open?: boolean }) => void;
  setQty: (productId: string, quantity: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const firstPersist = useRef(true);

  // Hydrate from localStorage once, on the client.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client hydration from localStorage; a lazy initializer would break SSR hydration
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist on change, skipping the initial mount so we don't clobber storage
  // before hydration has loaded it.
  useEffect(() => {
    if (firstPersist.current) {
      firstPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((item: CartItem, opts?: { open?: boolean }) => {
    setItems((cur) => {
      const key = lineKey(item.productId, item.variantId);
      const idx = cur.findIndex((x) => lineKey(x.productId, x.variantId) === key);
      if (idx >= 0) {
        const next = [...cur];
        const maxStock = next[idx].stock ?? Infinity;
        next[idx] = { ...next[idx], quantity: Math.min(next[idx].quantity + item.quantity, maxStock) };
        return next;
      }
      return [...cur, item];
    });
    if (opts?.open !== false) setIsOpen(true);
  }, []);

  const setQty = useCallback((productId: string, quantity: number, variantId?: string) => {
    setItems((cur) => {
      const key = lineKey(productId, variantId);
      if (quantity <= 0) return cur.filter((x) => lineKey(x.productId, x.variantId) !== key);
      return cur.map((x) => {
        if (lineKey(x.productId, x.variantId) !== key) return x;
        const maxStock = x.stock ?? Infinity;
        return { ...x, quantity: Math.min(quantity, maxStock) };
      });
    });
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    const key = lineKey(productId, variantId);
    setItems((cur) => cur.filter((x) => lineKey(x.productId, x.variantId) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((s, x) => s + x.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, x) => s + x.price * x.quantity, 0), [items]);

  const value: CartContextValue = {
    items,
    count,
    subtotal,
    isOpen,
    openCart,
    closeCart,
    addItem,
    setQty,
    removeItem,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const STORAGE_KEY = "nandon_wishlist";

/** Minimal product snapshot kept for the wishlist page. */
export type WishItem = {
  productId: string;
  slug: string;
  name: string;
  thumbnail: string;
  price: number;
  originalPrice?: number | null;
};

type WishlistContextValue = {
  items: WishItem[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (item: WishItem) => void;
  remove: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishItem[]>([]);
  const firstPersist = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client hydration from localStorage; a lazy initializer would break SSR hydration
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (firstPersist.current) {
      firstPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const has = useCallback((productId: string) => items.some((x) => x.productId === productId), [items]);

  const toggle = useCallback((item: WishItem) => {
    setItems((cur) =>
      cur.some((x) => x.productId === item.productId)
        ? cur.filter((x) => x.productId !== item.productId)
        : [...cur, item],
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((cur) => cur.filter((x) => x.productId !== productId));
  }, []);

  return (
    <WishlistContext.Provider value={{ items, count: items.length, has, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within <WishlistProvider>");
  return ctx;
}

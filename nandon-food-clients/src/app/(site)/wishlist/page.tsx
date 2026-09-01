"use client";

import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const { items } = useWishlist();

  const asProduct = (w: (typeof items)[number]): Product =>
    ({
      _id: w.productId,
      slug: w.slug,
      name: w.name,
      thumbnail: w.thumbnail,
      price: w.price,
      originalPrice: w.originalPrice ?? null,
      description: "",
    } as Product);

  return (
    <div className="frame py-6">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span>/</span>
        <span className="font-semibold text-ink">Wishlist</span>
      </nav>

      <h1 className="mb-5 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        My Wishlist {items.length > 0 && <span className="text-ink-soft">({items.length})</span>}
      </h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-3xl">🤍</div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink">Your wishlist is empty</h3>
          <p className="mt-1 text-sm text-ink-soft">Tap the heart on any product to save it here.</p>
          <Link href="/products" className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((w) => (
            <ProductCard key={w.productId} product={asProduct(w)} />
          ))}
        </div>
      )}
    </div>
  );
}

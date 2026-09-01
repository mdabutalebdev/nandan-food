"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { taka, discountPct } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();

  const pct = product.discount || discountPct(product.price, product.originalPrice);
  const fav = has(product._id);
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const soldOut = product.status === "out-of-stock";
  const href = `/product/${product.slug}`;

  const onAdd = () => {
    // Variants need a choice → send to the detail page.
    if (hasVariants) return router.push(href);
    addItem({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      thumbnail: product.thumbnail,
      price: product.price,
      quantity: 1,
      stock: product.stock,
    });
  };

  const onFav = () =>
    toggle({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      thumbnail: product.thumbnail,
      price: product.price,
      originalPrice: product.originalPrice,
    });

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      {/* Image */}
      <Link href={href} className="relative block aspect-square overflow-hidden bg-page">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.thumbnail}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {pct > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white shadow">
            -{pct}%
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-bold uppercase tracking-wide text-ink">
            Out of stock
          </span>
        )}
      </Link>

      {/* Favorite */}
      <button
        onClick={onFav}
        aria-label={fav ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={fav}
        className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow transition-colors ${
          fav ? "text-brand" : "text-ink-soft hover:text-brand"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
          <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3">
        <Link href={href} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-ink hover:text-brand">
          {product.name}
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display text-base font-extrabold text-brand">{taka(product.price)}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-ink-soft line-through">{taka(product.originalPrice)}</span>
          )}
          {pct > 0 && <span className="text-xs font-bold text-green-600">-{pct}%</span>}
        </div>

        <button
          onClick={onAdd}
          disabled={soldOut}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 4h2l2.4 12.3a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
          </svg>
          {hasVariants ? "Select options" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}

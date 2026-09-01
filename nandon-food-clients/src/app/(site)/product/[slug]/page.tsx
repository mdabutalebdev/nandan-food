"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getProductBySlug,
  getRelatedProducts,
  getProductReviews,
  submitReview,
} from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { taka, discountPct } from "@/lib/format";
import ProductCard from "@/components/product/ProductCard";
import type { Product, Review, ProductVariant, CategoryRef } from "@/lib/types";

/* Star rating (read-only or interactive) --------------------------- */
function Stars({ value, onChange, size = "h-4 w-4" }: { value: number; onChange?: (n: number) => void; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star`}
        >
          <svg viewBox="0 0 20 20" className={`${size} ${n <= Math.round(value) ? "text-amber-400" : "text-line"}`} fill="currentColor">
            <path d="M10 1.8l2.4 5 5.4.5-4.1 3.6 1.2 5.3L10 13.9 5.1 16.2l1.2-5.3L2.2 7.3l5.4-.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-line">
      <button onClick={onDec} aria-label="Decrease" className="flex h-10 w-10 items-center justify-center text-ink-soft hover:text-brand">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 10h10" strokeLinecap="round" /></svg>
      </button>
      <span className="w-10 text-center text-sm font-bold text-ink">{value}</span>
      <button onClick={onInc} aria-label="Increase" className="flex h-10 w-10 items-center justify-center text-ink-soft hover:text-brand">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 5v10M5 10h10" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

const catOf = (c?: CategoryRef | string | null): CategoryRef | null =>
  c && typeof c === "object" ? (c as CategoryRef) : null;

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug as string);

  const { addItem } = useCart();
  const { has, toggle } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [missing, setMissing] = useState(false);

  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [tab, setTab] = useState<"description" | "delivery" | "payment" | "terms">("description");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);

  // Review form
  const [rvName, setRvName] = useState("");
  const [rvRating, setRvRating] = useState(5);
  const [rvComment, setRvComment] = useState("");
  const [rvMsg, setRvMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rvSending, setRvSending] = useState(false);

  useEffect(() => {
    let alive = true;
    getProductBySlug(slug).then((p) => {
      if (!alive) return;
      if (!p) {
        setMissing(true);
        return;
      }
      setMissing(false);
      setProduct(p);
      setActiveImg(0);
      setQty(1);
      setVariant((p.variants && p.variants.length ? p.variants[0] : null) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  // Derived (no synchronous setState in the effect above).
  const loading = !product && !missing;

  useEffect(() => {
    if (!product) return;
    const cat = catOf(product.category);
    getProductReviews(product._id).then(setReviews);
    if (cat?._id) getRelatedProducts(product._id, cat._id, 10).then(setRelated);
  }, [product]);

  const price = variant?.price ?? product?.price ?? 0;
  const originalPrice = variant?.originalPrice ?? product?.originalPrice ?? null;
  const pct = variant?.discount || product?.discount || discountPct(price, originalPrice);
  const stock = variant?.stock ?? product?.stock ?? 0;
  const soldOut = product?.status === "out-of-stock";

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const imgs = variant?.images?.length ? variant.images : [product.thumbnail, ...(product.images ?? [])];
    return [...new Set(imgs.filter(Boolean))];
  }, [product, variant]);

  const colors = useMemo(() => {
    const set = new Map<string, ProductVariant>();
    (product?.variants ?? []).forEach((v) => v.color && !set.has(v.color) && set.set(v.color, v));
    return [...set.values()];
  }, [product]);

  const fav = product ? has(product._id) : false;

  const addToCart = () => {
    if (!product) return;
    addItem({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      thumbnail: gallery[0] || product.thumbnail,
      price,
      quantity: qty,
      variantId: variant?._id,
      color: variant?.color,
      size: variant?.size,
      stock,
    });
  };

  const buyNow = () => {
    addToCart();
    router.push("/checkout");
  };

  async function sendReview(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    if (!rvName.trim() || !rvComment.trim()) {
      return setRvMsg({ ok: false, text: "Please add your name and a comment." });
    }
    setRvSending(true);
    const res = await submitReview({ product: product._id, rating: rvRating, name: rvName.trim(), comment: rvComment.trim() });
    setRvSending(false);
    if (res.ok) {
      setRvMsg({ ok: true, text: "Thanks! Your review was submitted." });
      setRvName("");
      setRvComment("");
      setRvRating(5);
      getProductReviews(product._id).then(setReviews);
    } else {
      setRvMsg({ ok: false, text: res.message || "Could not submit review." });
    }
  }

  if (loading) {
    return (
      <div className="frame py-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-2xl bg-white" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-white" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-white" />
            <div className="h-24 animate-pulse rounded bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (missing || !product) {
    return (
      <div className="frame py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Product not found</h1>
        <p className="mt-2 text-ink-soft">It may have been removed or is unavailable.</p>
        <Link href="/products" className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
          Browse products
        </Link>
      </div>
    );
  }

  const cat = catOf(product.category);
  const tabs = [
    { key: "description" as const, label: "Description", body: product.description },
    { key: "delivery" as const, label: "Delivery", body: product.deliveryInfo },
    { key: "payment" as const, label: "Payment", body: product.paymentInfo },
    { key: "terms" as const, label: "Terms", body: product.termsInfo },
  ].filter((t) => t.body);

  return (
    <div className="frame py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand">Products</Link>
        {cat && (
          <>
            <span>/</span>
            <Link href={`/category/${cat.slug}`} className="hover:text-brand">{cat.name}</Link>
          </>
        )}
        <span>/</span>
        <span className="line-clamp-1 font-semibold text-ink">{product.name}</span>
      </nav>

      {/* Main */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery[activeImg]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {pct > 0 && (
              <span className="absolute left-3 top-3 rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-white">-{pct}%</span>
            )}
            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImg((i) => (i - 1 + gallery.length) % gallery.length)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-maroon opacity-0 shadow-lg transition hover:bg-white group-hover:opacity-100"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5 7 10l5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  onClick={() => setActiveImg((i) => (i + 1) % gallery.length)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-maroon opacity-0 shadow-lg transition hover:bg-white group-hover:opacity-100"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === activeImg ? "border-brand" : "border-line hover:border-brand/50"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{product.name}</h1>
          {product.tagline && <p className="mt-1.5 text-sm text-ink-soft">{product.tagline}</p>}

          <div className="mt-3 flex items-center gap-3">
            {(product.rating ?? 0) > 0 && (
              <div className="flex items-center gap-1.5">
                <Stars value={product.rating ?? 0} />
                <span className="text-xs text-ink-soft">({product.reviewCount ?? reviews.length})</span>
              </div>
            )}
            {(product.totalSold ?? 0) > 0 && <span className="text-xs text-ink-soft">{product.totalSold} sold</span>}
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold text-brand">{taka(price)}</span>
            {originalPrice && originalPrice > price && (
              <span className="text-lg text-ink-soft line-through">{taka(originalPrice)}</span>
            )}
            {pct > 0 && <span className="rounded bg-brand-tint px-2 py-0.5 text-sm font-bold text-brand-dark">Save {pct}%</span>}
          </div>

          {/* Colour variants */}
          {colors.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-ink">Colour: <span className="font-normal text-ink-soft">{variant?.color}</span></p>
              <div className="flex flex-wrap gap-2">
                {colors.map((v) => (
                  <button
                    key={v._id || v.color}
                    onClick={() => { setVariant(v); setActiveImg(0); }}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      variant?.color === v.color ? "border-brand bg-brand-tint text-brand-dark" : "border-line text-ink hover:border-brand"
                    }`}
                  >
                    {v.color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          <p className="mt-5 text-sm">
            {soldOut ? (
              <span className="font-semibold text-red-600">Out of stock</span>
            ) : (
              <span className="font-semibold text-green-600">In stock</span>
            )}
          </p>

          {/* Qty + actions */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Stepper value={qty} onDec={() => setQty((q) => Math.max(1, q - 1))} onInc={() => setQty((q) => q + 1)} />
            <button
              onClick={addToCart}
              disabled={soldOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h2l2.4 12.3a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /></svg>
              Add to cart
            </button>
            <button
              onClick={() => product && toggle({ productId: product._id, slug: product.slug, name: product.name, thumbnail: product.thumbnail, price: product.price, originalPrice: product.originalPrice })}
              aria-label="Add to wishlist"
              className={`flex h-12 w-12 items-center justify-center rounded-full border border-line transition-colors ${fav ? "text-brand" : "text-ink-soft hover:text-brand"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <button
            onClick={buyNow}
            disabled={soldOut}
            className="mt-3 w-full rounded-full border-2 border-brand py-3 text-sm font-bold text-brand transition-colors hover:bg-brand hover:text-white disabled:opacity-50"
          >
            Buy now
          </button>

          {/* Meta */}
          <dl className="mt-6 space-y-1.5 border-t border-line pt-5 text-sm">
            {cat && (
              <div className="flex gap-2">
                <dt className="text-ink-soft">Category:</dt>
                <dd><Link href={`/category/${cat.slug}`} className="font-medium text-brand hover:underline">{cat.name}</Link></dd>
              </div>
            )}
            {product.sku && (
              <div className="flex gap-2"><dt className="text-ink-soft">SKU:</dt><dd className="font-medium text-ink">{product.sku}</dd></div>
            )}
            {product.brand && (
              <div className="flex gap-2"><dt className="text-ink-soft">Brand:</dt><dd className="font-medium text-ink">{product.brand}</dd></div>
            )}
          </dl>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="mt-10">
          <div className="flex flex-wrap gap-1 border-b border-line">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tab === t.key ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-line py-5 text-sm leading-relaxed text-ink-soft">
            {tabs.find((t) => t.key === tab)?.body || tabs[0].body}
          </div>
        </div>
      )}

      {/* Reviews */}
      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Reviews ({reviews.length})</h2>
          <div className="mt-4 space-y-4">
            {reviews.length === 0 && <p className="text-sm text-ink-soft">No reviews yet. Be the first to review this product.</p>}
            {reviews.map((r) => (
              <div key={r._id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{r.name || r.userName || "Customer"}</span>
                  <Stars value={r.rating} />
                </div>
                {(r.comment || r.review) && <p className="mt-2 text-sm text-ink-soft">{r.comment || r.review}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Review form */}
        <div>
          <h3 className="font-display text-lg font-bold text-ink">Write a review</h3>
          <form onSubmit={sendReview} className="mt-4 space-y-3 rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-ink">Rating</span>
              <Stars value={rvRating} onChange={setRvRating} size="h-6 w-6" />
            </div>
            <input
              value={rvName}
              onChange={(e) => setRvName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
            />
            <textarea
              value={rvComment}
              onChange={(e) => setRvComment(e.target.value)}
              rows={4}
              placeholder="Share your experience…"
              className="w-full resize-none rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
            />
            {rvMsg && <p className={`text-sm ${rvMsg.ok ? "text-green-600" : "text-brand-dark"}`}>{rvMsg.text}</p>}
            <button
              type="submit"
              disabled={rvSending}
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {rvSending ? "Submitting…" : "Submit review"}
            </button>
          </form>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 font-display text-xl font-bold text-ink">Related products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {related.slice(0, 10).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

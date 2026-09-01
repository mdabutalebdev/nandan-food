"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { site } from "@/lib/site";
import { buildNav, FALLBACK_CATEGORY_TREE } from "@/lib/menu";
import { fetchCategoryTree } from "@/lib/api";
import type { MenuNode } from "@/lib/types";
import DesktopNav from "./DesktopNav";
import MobileMenu from "./MobileMenu";
import SearchBar from "./SearchBar";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

/* Right-side action (icon + label) — a link, or a button when onClick given */
function Action({
  href,
  onClick,
  label,
  children,
  badge,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  badge?: number;
}) {
  const cls =
    "group relative flex flex-col items-center gap-0.5 text-ink transition-colors hover:text-brand-dark";
  const inner = (
    <>
      <span className="relative">
        {children}
        {badge !== undefined && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

const ic = "h-6 w-6";

export default function Header() {
  const [tree, setTree] = useState<MenuNode[]>(FALLBACK_CATEGORY_TREE);
  const { count: cartCount, openCart } = useCart();
  const { count: wishCount } = useWishlist();

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCategoryTree(ctrl.signal).then((t) => setTree(t));
    return () => ctrl.abort();
  }, []);

  const nav = useMemo(() => buildNav(tree), [tree]);

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      {/* Main bar */}
      <div className="border-b border-line bg-surface">
        <div className="frame flex items-center gap-3 py-2 md:gap-6">
          <MobileMenu nav={nav} />

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center" aria-label={site.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.logo} alt={site.name} className="h-11 w-auto md:h-[56px]" />
          </Link>

          {/* Search — centered on desktop */}
          <div className="mx-auto hidden max-w-2xl flex-1 md:block"><SearchBar /></div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-4 md:ml-0 md:gap-6">
            <div className="hidden items-center gap-6 sm:flex">
              <Action href="/track-order" label="Track Order">
                <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
                  <circle cx="7" cy="17.5" r="1.6" /><circle cx="18" cy="17.5" r="1.6" />
                </svg>
              </Action>
              <Action href="/account" label="Account">
                <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </Action>
              <Action href="/wishlist" label="Wishlist" badge={wishCount}>
                <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" />
                </svg>
              </Action>
            </div>
            <Action onClick={openCart} label="Cart" badge={cartCount}>
              <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2.4 12.3a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6" />
                <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
              </svg>
            </Action>
          </div>
        </div>

        {/* Mobile search row */}
        <div className="frame pb-3 md:hidden"><SearchBar /></div>
      </div>

      {/* Nav bar — sticks with the rest of the header */}
      <DesktopNav nav={nav} />
    </header>
  );
}

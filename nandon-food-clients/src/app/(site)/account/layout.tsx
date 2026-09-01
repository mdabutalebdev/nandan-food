"use client";

/**
 * Customer account area — a left-sidebar dashboard, the way a normal shop lets
 * a shopper manage their profile, orders and password. Guards access on the
 * client (the storefront auth is a localStorage token) and shares one shell
 * across every /account/* page.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, ShoppingBag, MapPin, Heart, UserPen, Lock, Settings, LogOut, type LucideIcon } from "lucide-react";

type StoredUser = { firstName: string; lastName: string; email: string; role: string };

const NAV: { label: string; href: string; Icon: LucideIcon; exact?: boolean }[] = [
  { label: "Dashboard", href: "/account", Icon: LayoutGrid, exact: true },
  { label: "My Orders", href: "/account/orders", Icon: ShoppingBag },
  { label: "Addresses", href: "/account/addresses", Icon: MapPin },
  { label: "Wishlist", href: "/wishlist", Icon: Heart },
  { label: "Edit Profile", href: "/account/profile", Icon: UserPen },
  { label: "Password", href: "/account/security", Icon: Lock },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let u: StoredUser | null = null;
    try {
      const s = localStorage.getItem("nandon_user");
      if (s) u = JSON.parse(s);
    } catch {}
    if (!u) {
      router.replace("/login?redirect=/account");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only auth hydration from localStorage
    setUser(u);
    setReady(true);
  }, [router]);

  function logout() {
    ["nandon_token", "nandon_refresh", "nandon_user"].forEach((k) => localStorage.removeItem(k));
    router.replace("/login");
  }

  if (!ready || !user) {
    return <div className="frame py-24 text-center text-ink-soft">Checking your account…</div>;
  }

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <div className="frame py-6 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center gap-3 bg-gradient-to-r from-brand to-brand-dark p-5 text-white">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                {initials || "N"}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold">{user.firstName} {user.lastName}</p>
                <p className="truncate text-xs text-white/85">{user.email}</p>
              </div>
            </div>

            <nav className="p-2">
              {NAV.map(({ label, href, Icon, exact }) => {
                const on = active(href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      on ? "bg-brand-tint text-brand" : "text-ink-soft hover:bg-page hover:text-ink"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                    {label}
                  </Link>
                );
              })}

              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-page hover:text-ink"
                >
                  <Settings size={18} strokeWidth={1.75} className="shrink-0" />
                  Admin Panel
                </Link>
              )}

              <button
                onClick={logout}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
                Logout
              </button>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

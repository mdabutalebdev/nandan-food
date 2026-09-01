"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { site } from "@/lib/site";

type StoredUser = { firstName: string; lastName: string; email: string; role: string };

/* ── Icons (compact line set) ───────────────────────────────────────── */
const I = {
  dashboard: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z",
  orders: "M6 2l1.5 3h9L18 2M3 7h18l-1.5 12.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 7z",
  products: "M12 2 3 7v10l9 5 9-5V7l-9-5zM3 7l9 5 9-5M12 12v10",
  inventory: "M3 4h18v4H3zM5 8v12h14V8M9 12h6",
  categories: "M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z",
  banners: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
  customers: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M18 8v6M15 11h6",
  coupons: "M4 7h16v4a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4V7zM12 7v10",
  reports: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-4l-.3 2.9a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.9h4l.3-2.9a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z",
  health: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3zM9.5 12l1.8 1.8L15 10",
  showcase: "M12 3l2.6 5.7 6.4.6-4.8 4.2 1.4 6.2L12 16.9 6.8 19.9l1.4-6.2L3.4 9.3l6.4-.6z",
  store: "M4 9l1-5h14l1 5M5 9v10h14V9M4 9h16M9 19v-5h6v5",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.9 5.8 3.9 9s-1.4 6.4-3.9 9c-2.5-2.6-3.9-5.8-3.9-9s1.4-6.4 3.9-9z",
  career: "M4 7h16v13H4zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 12h16",
  social: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  about: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
  doc: "M6 2h8l4 4v16H6zM14 2v4h4M9 12h6M9 16h6",
  chat: "M4 5h16v10H9l-4 4v-4H4z",
  message: "M4 5h16v10H9l-4 4v-4H4z",
  cert: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3zM9.5 12l1.8 1.8L15 10",
  application: "M9 2h6a2 2 0 0 1 2 2v0h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2-2zM9 4v2h6V4M8 12h8M8 16h5",
  tag: "M20.6 13.4 12 22 3 13V4h9l8.6 8.6a1.4 1.4 0 0 1 0 2zM7.5 7.5h.01",
  cart: "M3 4h2l2.4 12.3a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM18 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  usage: "M3 7l6 6 4-4 8 8M21 17v-4h-4",
};
type IconKey = keyof typeof I;

const NAV: { section: string; items: { label: string; href: string; icon: IconKey }[] }[] = [
  {
    section: "Overview",
    items: [{ label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" }],
  },
  {
    section: "Homepage",
    items: [
      { label: "Banners", href: "/admin/banners", icon: "banners" },
      { label: "Health Promises", href: "/admin/health-promises", icon: "health" },
      { label: "Our Products", href: "/admin/our-products", icon: "showcase" },
      { label: "Outlet Banner", href: "/admin/outlets", icon: "store" },
      { label: "Export Brochure", href: "/admin/export-brochure", icon: "globe" },
    ],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: "products" },
      { label: "Categories", href: "/admin/categories", icon: "categories" },
    ],
  },
  {
    section: "Inventory",
    items: [
      { label: "Overview", href: "/admin/inventory", icon: "inventory" },
      { label: "Products", href: "/admin/inventory-products", icon: "tag" },
      { label: "Purchases", href: "/admin/inventory-purchases", icon: "cart" },
      { label: "Usage", href: "/admin/inventory-usage", icon: "usage" },
      { label: "Reports", href: "/admin/inventory-reports", icon: "reports" },
    ],
  },
  {
    section: "About Page",
    items: [
      { label: "About Intro", href: "/admin/about-intro", icon: "about" },
      { label: "Mission", href: "/admin/about-mission", icon: "doc" },
      { label: "Vision", href: "/admin/about-vision", icon: "about" },
      { label: "Message", href: "/admin/about-message", icon: "message" },
      { label: "Our Management", href: "/admin/about-management", icon: "customers" },
      { label: "Our Clients", href: "/admin/about-clients", icon: "showcase" },
      { label: "Certifications", href: "/admin/about-certifications", icon: "cert" },
    ],
  },
  {
    section: "Pages",
    items: [
      { label: "Outlets", href: "/admin/outlets-page", icon: "store" },
      { label: "Return Policy", href: "/admin/return-policy", icon: "doc" },
      { label: "Careers", href: "/admin/careers", icon: "career" },
      { label: "Applications", href: "/admin/applications", icon: "application" },
      { label: "Social Links", href: "/admin/social-links", icon: "social" },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: "orders" },
      { label: "Coupons", href: "/admin/coupons", icon: "coupons" },
      { label: "Customers", href: "/admin/customers", icon: "customers" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Reports", href: "/admin/reports", icon: "reports" },
      { label: "Settings", href: "/admin/settings", icon: "settings" },
    ],
  },
];

function NavIcon({ k }: { k: IconKey }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={I[k]} />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ok, setOk] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    let u: StoredUser | null = null;
    try {
      const s = localStorage.getItem("nandon_user");
      if (s) u = JSON.parse(s);
    } catch {}
    if (!u) return router.replace("/login");
    if (u.role !== "admin") return router.replace("/account");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only admin-auth hydration from localStorage
    setUser(u);
    setOk(true);
  }, [router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the mobile drawer on route change
  useEffect(() => setOpenMobile(false), [pathname]);

  // ── Sidebar accordion — one section open at a time ──
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const activeSection = useMemo(
    () => NAV.find((g) => g.items.some((it) => isActive(it.href)))?.section ?? NAV[0].section,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname],
  );
  const [openSection, setOpenSection] = useState<string>(activeSection);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- open the section of the current route
  useEffect(() => setOpenSection(activeSection), [activeSection]);

  function logout() {
    ["nandon_token", "nandon_refresh", "nandon_user"].forEach((k) => localStorage.removeItem(k));
    router.replace("/login");
  }

  if (!ok || !user) {
    return <div className="flex h-screen items-center justify-center text-ink-soft">Checking access…</div>;
  }

  const seg = pathname.split("/")[2] || "dashboard";
  const title = seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Sidebar */}
      <aside
        className={`print-hide fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#151a2e] text-slate-300 transition-transform duration-300 lg:translate-x-0 ${
          openMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.logo} alt={site.name} className="h-9 w-9 object-contain" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold text-white">{site.name}</div>
            <div className="text-[11px] text-slate-400">Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV.map((group) => {
            const isOpen = openSection === group.section;
            const groupActive = group.items.some((it) => isActive(it.href));
            return (
              <div key={group.section} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => setOpenSection((s) => (s === group.section ? "" : group.section))}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    groupActive ? "text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                  aria-expanded={isOpen}
                >
                  <span>{group.section}</span>
                  <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5.5 7.5 10 12l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isOpen && (
                  <ul className="mb-2 mt-0.5 space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg py-2 pl-6 pr-3 text-sm transition-colors ${
                              active ? "bg-brand text-white shadow" : "text-slate-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <NavIcon k={item.icon} />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        onClick={() => setOpenMobile(false)}
        className={`print-hide fixed inset-0 z-40 bg-black/40 lg:hidden ${openMobile ? "block" : "hidden"}`}
      />

      {/* Content column */}
      <div className="lg:pl-64 print:pl-0 print-reset">
        {/* Topbar */}
        <header className="print-hide sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3 sm:px-6">
          <button
            onClick={() => setOpenMobile(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-page lg:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <h1 className="font-display text-lg font-bold text-ink">{title}</h1>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/" className="hidden text-sm font-semibold text-brand hover:underline sm:block">
              View site ↗
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {initials || "A"}
              </span>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-semibold text-ink">{user.firstName} {user.lastName}</div>
                <div className="text-[11px] text-ink-soft">{user.email}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 print-reset">{children}</main>
      </div>
    </div>
  );
}

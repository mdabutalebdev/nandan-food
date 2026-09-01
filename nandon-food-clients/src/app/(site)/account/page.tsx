"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Clock, Wallet, Package, ArrowRight, type LucideIcon } from "lucide-react";
import { getMyOrders } from "@/lib/api";
import { taka } from "@/lib/format";
import { statusMeta, type StoreOrder } from "@/lib/order-ui";

function Tile({ href, label, value, hint, Icon, tone }: { href: string; label: string; value: string; hint?: string; Icon: LucideIcon; tone: string }) {
  return (
    <Link href={href} className="rounded-xl border border-line bg-white p-5 transition-colors hover:border-brand/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
      </div>
    </Link>
  );
}

export default function AccountDashboard() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("nandon_user") || "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only greeting from localStorage
      setName(u.firstName || "there");
    } catch {}
    const ctrl = new AbortController();
    getMyOrders(ctrl.signal).then((d) => {
      setOrders(d as StoreOrder[]);
      setLoading(false);
    });
    return () => ctrl.abort();
  }, []);

  const active = orders.filter((o) => !["delivered", "cancelled", "returned"].includes(o.status)).length;
  const spent = orders.filter((o) => o.status === "delivered").reduce((n, o) => n + (o.total || 0), 0);
  const recent = orders.slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Hello, {name}</h1>
        <p className="text-sm text-ink-soft">Here&apos;s what&apos;s happening with your account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile href="/account/orders" label="Total orders" value={loading ? "…" : String(orders.length)} hint={`${active} active`} tone="bg-brand-tint text-brand" Icon={ShoppingBag} />
        <Tile href="/account/orders" label="Active orders" value={loading ? "…" : String(active)} hint="in progress" tone="bg-blue-50 text-blue-600" Icon={Clock} />
        <Tile href="/wishlist" label="Total spent" value={loading ? "…" : taka(spent)} hint="on delivered orders" tone="bg-green-50 text-green-600" Icon={Wallet} />
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display font-bold text-ink">Recent orders</h2>
          <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            View all <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-page" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand">
              <ShoppingBag size={22} strokeWidth={1.75} />
            </span>
            <p className="mt-4 font-semibold text-ink">No orders yet</p>
            <p className="text-sm text-ink-soft">When you place an order it will show up here.</p>
            <Link href="/products" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">Start shopping</Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((o) => {
              const st = statusMeta(o.status);
              return (
                <li key={o._id}>
                  <Link href={`/account/orders/${o._id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-page/60">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-page text-ink-soft">
                      <Package size={18} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{o.orderId}</p>
                      <p className="text-xs text-ink-soft">
                        {o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <span className="hidden font-semibold text-ink sm:block">{taka(o.total)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

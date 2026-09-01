"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Package } from "lucide-react";
import { getMyOrders } from "@/lib/api";
import { taka } from "@/lib/format";
import { statusMeta, type StoreOrder } from "@/lib/order-ui";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    getMyOrders(ctrl.signal).then((d) => {
      setOrders(d as StoreOrder[]);
      setLoading(false);
    });
    return () => ctrl.abort();
  }, []);

  const list = useMemo(() => {
    let out = orders;
    if (filter === "active") out = out.filter((o) => !["delivered", "cancelled", "returned"].includes(o.status));
    else if (filter !== "all") out = out.filter((o) => o.status === filter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      out = out.filter((o) => o.orderId.toLowerCase().includes(s) || o.items?.some((i) => i.name.toLowerCase().includes(s)));
    }
    return out;
  }, [orders, filter, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">My Orders</h1>
          <p className="text-sm text-ink-soft">Track and review everything you&apos;ve ordered.</p>
        </div>
        <Link href="/track-order" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
          Track an order
        </Link>
      </div>

      {/* Filter + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.key ? "bg-brand text-white" : "border border-line text-ink-soft hover:border-brand"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
            <Search size={16} strokeWidth={1.75} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by order ID or product…"
            className="w-full rounded-lg border border-line bg-page py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand focus:bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-white" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand">
            <Package size={22} strokeWidth={1.75} />
          </span>
          <p className="mt-4 font-semibold text-ink">No orders found</p>
          <p className="text-sm text-ink-soft">{orders.length === 0 ? "You haven't placed any orders yet." : "Try a different filter."}</p>
          <Link href="/products" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">Browse products</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((o) => {
            const st = statusMeta(o.status);
            const thumbs = (o.items || []).slice(0, 4);
            return (
              <li key={o._id} className="rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand">
                <Link href={`/account/orders/${o._id}`} className="block">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                    <div>
                      <p className="font-display font-bold text-ink">{o.orderId}</p>
                      <p className="text-xs text-ink-soft">
                        Placed {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-3">
                    <div className="flex -space-x-2">
                      {thumbs.map((it, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={it.thumbnail} alt="" className="h-11 w-11 rounded-lg border-2 border-white object-cover shadow-sm" />
                      ))}
                      {(o.items?.length ?? 0) > 4 && (
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-white bg-page text-xs font-bold text-ink-soft shadow-sm">
                          +{(o.items!.length) - 4}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-soft">{o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? "" : "s"}</p>
                      <p className="font-display text-lg font-extrabold text-brand">{taka(o.total)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

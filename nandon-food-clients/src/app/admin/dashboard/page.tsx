"use client";

import { useEffect, useState } from "react";
import { authGet } from "@/lib/api";
import AreaChart from "@/components/admin/AreaChart";
import DonutChart from "@/components/admin/DonutChart";

type Summary = {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  totalCategories: number;
  pendingOrders: number;
  deliveredOrders: number;
  todayOrders: number;
  todayRevenue: number;
};
type Monthly = { month: string; revenue: number; orders: number }[];
type OrderRow = {
  _id: string;
  orderNumber?: string;
  user?: { name?: string; email?: string };
  total?: number;
  status?: string;
  createdAt?: string;
};
type TopProduct = { _id: string; name: string; price?: number; totalSold?: number; stock?: number };

const bdt = (n: number) => "৳" + (n || 0).toLocaleString("en-IN");

const SAMPLE_MONTHLY: Monthly = [
  { month: "Jan", revenue: 42000, orders: 38 },
  { month: "Feb", revenue: 51000, orders: 46 },
  { month: "Mar", revenue: 47500, orders: 41 },
  { month: "Apr", revenue: 63000, orders: 55 },
  { month: "May", revenue: 58000, orders: 52 },
  { month: "Jun", revenue: 72000, orders: 64 },
  { month: "Jul", revenue: 69000, orders: 60 },
  { month: "Aug", revenue: 81000, orders: 71 },
];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function Kpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tint text-brand-dark">
          {icon}
        </span>
      </div>
    </div>
  );
}

const ic = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<Monthly>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      authGet<Summary>("/analytics/dashboard", ctrl.signal),
      authGet<Monthly>("/analytics/monthly-revenue", ctrl.signal),
      authGet<OrderRow[]>("/analytics/recent-orders?limit=6", ctrl.signal),
      authGet<TopProduct[]>("/analytics/top-products?limit=5", ctrl.signal),
    ]).then(([sum, mon, ord, tp]) => {
      setS(sum);
      setMonthly(Array.isArray(mon) ? mon : []);
      setOrders(Array.isArray(ord) ? ord : []);
      setTop(Array.isArray(tp) ? tp : []);
      setLoading(false);
    });
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-white" />
        ))}
      </div>
    );
  }

  const salesSample = monthly.length === 0;
  const chartData = (salesSample ? SAMPLE_MONTHLY : monthly);
  const other = Math.max(0, (s?.totalOrders ?? 0) - (s?.pendingOrders ?? 0) - (s?.deliveredOrders ?? 0));
  const donutTotal = (s?.pendingOrders ?? 0) + (s?.deliveredOrders ?? 0) + other;
  const donutSample = donutTotal === 0;
  const segments = donutSample
    ? [
        { label: "Delivered", value: 64, color: "#16a34a" },
        { label: "Pending", value: 18, color: "#f59e0b" },
        { label: "Processing", value: 12, color: "#6366f1" },
      ]
    : [
        { label: "Delivered", value: s?.deliveredOrders ?? 0, color: "#16a34a" },
        { label: "Pending", value: s?.pendingOrders ?? 0, color: "#f59e0b" },
        { label: "Other", value: other, color: "#6366f1" },
      ];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Revenue" value={bdt(s?.totalRevenue ?? 0)} hint={`Today: ${bdt(s?.todayRevenue ?? 0)}`} icon={ic("M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6")} />
        <Kpi label="Orders" value={String(s?.totalOrders ?? 0)} hint={`${s?.pendingOrders ?? 0} pending · ${s?.todayOrders ?? 0} today`} icon={ic("M6 2l1.5 3h9L18 2M3 7h18l-1.5 12.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 7z")} />
        <Kpi label="Products" value={String(s?.totalProducts ?? 0)} hint={`${s?.totalCategories ?? 0} categories`} icon={ic("M12 2 3 7v10l9 5 9-5V7l-9-5zM3 7l9 5 9-5")} />
        <Kpi label="Customers" value={String(s?.totalCustomers ?? 0)} hint="Registered users" icon={ic("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0")} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">Sales overview</h2>
            {salesSample && (
              <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-bold uppercase text-brand-dark">
                Sample
              </span>
            )}
          </div>
          <AreaChart data={chartData.map((m) => m.revenue)} labels={chartData.map((m) => m.month)} />
        </div>

        <div className="rounded-xl border border-line bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">Orders by status</h2>
            {donutSample && (
              <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-bold uppercase text-brand-dark">
                Sample
              </span>
            )}
          </div>
          <DonutChart segments={segments} centerLabel="orders" centerValue={donutSample ? 94 : donutTotal} />
        </div>
      </div>

      {/* Recent orders + Low stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display font-bold text-ink">Recent orders</h2>
            <span className="text-xs text-ink-soft">Latest {orders.length}</span>
          </div>
          {orders.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-soft">
              No orders yet — they’ll appear here as customers check out.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-ink-soft">
                    <th className="px-5 py-2.5 font-semibold">Order</th>
                    <th className="px-5 py-2.5 font-semibold">Customer</th>
                    <th className="px-5 py-2.5 font-semibold">Total</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id} className="border-t border-line">
                      <td className="px-5 py-3 font-semibold text-ink">#{o.orderNumber ?? o._id.slice(-6)}</td>
                      <td className="px-5 py-3 text-ink-soft">{o.user?.name || o.user?.email || "Guest"}</td>
                      <td className="px-5 py-3 font-medium text-ink">{bdt(o.total ?? 0)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[o.status ?? ""] ?? "bg-page text-ink-soft"}`}>
                          {o.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low stock / inventory teaser */}
        <div className="rounded-xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display font-bold text-ink">Inventory</h2>
            <span className="text-xs text-ink-soft">Top products</span>
          </div>
          {top.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-soft">
              No products yet. Add products to track stock here.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {top.map((p) => {
                const low = (p.stock ?? 0) <= 5;
                return (
                  <li key={p._id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-ink-soft">{p.totalSold ?? 0} sold · {bdt(p.price ?? 0)}</p>
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {p.stock ?? 0} in stock
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

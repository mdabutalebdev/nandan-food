"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package, ShoppingCart, TrendingDown, BarChart3, ArrowRight } from "lucide-react";
import { invStats } from "@/lib/admin";
import { Button, Icon, ICONS, PageHeader, Stat, bdt, num } from "@/components/admin/ui";

const CARDS = [
  { href: "/admin/inventory-products", title: "Products", desc: "Create & manage the things you buy.", Icon: Package, tone: "text-brand bg-brand-tint" },
  { href: "/admin/inventory-purchases", title: "Purchases", desc: "Record what you buy — stock goes up.", Icon: ShoppingCart, tone: "text-green-700 bg-green-50" },
  { href: "/admin/inventory-usage", title: "Usage", desc: "Record what you use — stock goes down.", Icon: TrendingDown, tone: "text-amber-700 bg-amber-50" },
  { href: "/admin/inventory-reports", title: "Reports", desc: "Monthly bought vs used vs left.", Icon: BarChart3, tone: "text-blue-700 bg-blue-50" },
];

export default function InventoryOverviewPage() {
  const monthLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }, []);

  const [stats, setStats] = useState<Awaited<ReturnType<typeof invStats>>>(null);

  useEffect(() => {
    const d = new Date();
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
    invStats({ from, to }).then(setStats);
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        desc="Your raw-material book — products, purchases, usage and monthly reports."
        actions={
          <>
            <Link href="/admin/inventory-products"><Button variant="outline"><Icon d={ICONS.plus} /> New product</Button></Link>
            <Link href="/admin/inventory-purchases"><Button><Icon d={ICONS.plus} /> Add purchase</Button></Link>
          </>
        }
      />

      {/* This-month stats */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">This month · {monthLabel}</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Products" value={String(stats?.totalItems ?? 0)} hint={`${stats?.activeItems ?? 0} active`} />
          <Stat label="Stock value" value={bdt(stats?.stockValue ?? 0)} tone="blue" hint="at average cost" />
          <Stat label="Bought" value={bdt(stats?.purchaseValue ?? 0)} tone="green" hint={`${stats?.purchaseCount ?? 0} purchases`} />
          <Stat label="Used" value={bdt(stats?.consumeValue ?? 0)} tone="amber" hint={`${stats?.consumeCount ?? 0} entries`} />
          <Stat label="Low stock" value={String(stats?.lowStockCount ?? 0)} tone="red" hint="needs re-ordering" />
        </div>
      </div>

      {/* Low-stock alert */}
      {!!stats?.lowStockItems?.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-amber-800">⚠️ Running low — reorder soon</p>
            <Link href="/admin/inventory-purchases" className="text-xs font-semibold text-amber-800 hover:underline">Add purchase →</Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stats.lowStockItems.map((i) => (
              <Link
                key={i._id}
                href={`/admin/inventory-purchases?item=${i._id}`}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                {i.name} · {num(i.stock)} {i.unit}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map(({ href, title, desc, Icon: I, tone }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-brand/40"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}><I size={22} strokeWidth={1.75} /></span>
            <h3 className="mt-4 flex items-center gap-1 font-display text-base font-bold text-ink">
              {title}
              <ArrowRight size={15} className="opacity-0 transition-opacity group-hover:opacity-100" />
            </h3>
            <p className="mt-1 text-sm text-ink-soft">{desc}</p>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-line bg-white p-5">
        <h3 className="font-display font-bold text-ink">How it works</h3>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-ink-soft">
          <li>Create a <b>product</b> once (name + unit) in <Link href="/admin/inventory-products" className="text-brand hover:underline">Products</Link>.</li>
          <li>Each time you buy it, record a <b>purchase</b> (quantity + total) — stock goes up.</li>
          <li>Each time you use it, record <b>usage</b> — stock goes down and you see what’s left.</li>
          <li>See the month’s <b>report</b> — bought vs used vs remaining, per product.</li>
        </ol>
      </div>
    </div>
  );
}

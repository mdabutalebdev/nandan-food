"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { invReport, invGetItems, type InventoryItem } from "@/lib/admin";
import { INVENTORY_GROUPS } from "@/components/admin/inventory/ItemEditor";
import {
  Button, EmptyState, Field, Icon, ICONS, PageHeader, Select, Stat, Toast, useToast, bdt, downloadCsv, num,
} from "@/components/admin/ui";

type Report = Awaited<ReturnType<typeof invReport>>;

/** Range for a `YYYY-MM` month string. */
function monthRange(m: string): { from: string; to: string } {
  const [y, mo] = m.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate();
  return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, "0")}` };
}

export default function InventoryReportsPage() {
  const toast = useToast();

  // Default to the current month (client-side Date is fine here).
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [allTime, setAllTime] = useState(false);
  const [item, setItem] = useState("all");
  const [group, setGroup] = useState("all");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [report, setReport] = useState<Report>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => (allTime ? { from: undefined, to: undefined } : monthRange(month)), [allTime, month]);

  useEffect(() => { invGetItems({}).then((d) => setItems(Array.isArray(d) ? d : [])); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setReport(await invReport({ from: range.from, to: range.to, item, group }));
    setLoading(false);
  }, [range, item, group]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch from API
    load();
  }, [load]);

  const rows = report?.rows ?? [];
  const label = allTime ? "All time" : new Date(`${month}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" desc="How much you bought, used and have left — one month at a time." />

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Month">
          <input
            type="month"
            value={month}
            disabled={allTime}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white disabled:opacity-50"
          />
        </Field>
        <Field label="Range">
          <Select value={allTime ? "all" : "month"} onChange={(e) => setAllTime(e.target.value === "all")}>
            <option value="month">Selected month</option>
            <option value="all">All time</option>
          </Select>
        </Field>
        <Field label="Product">
          <Select value={item} onChange={(e) => setItem(e.target.value)}>
            <option value="all">All products</option>
            {items.map((i) => (<option key={i._id} value={i._id}>{i.name}</option>))}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All categories</option>
            {INVENTORY_GROUPS.map((g) => (<option key={g} value={g}>{g}</option>))}
          </Select>
        </Field>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={`Bought · ${label}`} value={bdt(report?.totals.purchaseValue ?? 0)} tone="green" />
        <Stat label={`Used · ${label}`} value={bdt(report?.totals.consumeValue ?? 0)} tone="amber" />
        <Stat label="Stock value now" value={bdt(report?.totals.stockValue ?? 0)} tone="blue" />
      </div>

      <div className="rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div>
            <h3 className="font-display font-bold text-ink">Purchase vs usage</h3>
            <p className="text-xs text-ink-soft">{label}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(`inventory-report-${allTime ? "all-time" : month}.csv`, [
                ["Product", "Unit", "Bought qty", "Bought value", "Used qty", "Used value", "In stock", "Avg cost", "Stock value"],
                ...rows.map((r) => [r.name, r.unit, r.purchaseQty, r.purchaseValue, r.consumeQty, r.consumeValue, r.stock, r.avgCost, r.stockValue]),
              ])
            }
          >
            <Icon d={ICONS.download} /> Export CSV
          </Button>
        </div>

        {loading ? (
          <div className="p-4"><div className="h-40 animate-pulse rounded bg-page" /></div>
        ) : !rows.length ? (
          <EmptyState Icon={BarChart3} title="Nothing to report" desc="No products match, or no activity in this month." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Bought</th>
                  <th className="px-4 py-3 font-semibold">Bought value</th>
                  <th className="px-4 py-3 font-semibold">Used</th>
                  <th className="px-4 py-3 font-semibold">Used value</th>
                  <th className="px-4 py-3 font-semibold">In stock now</th>
                  <th className="px-4 py-3 font-semibold">Stock value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-line last:border-0 hover:bg-page/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-ink-soft">{r.group} · {r.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-ink">{num(r.purchaseQty)} {r.unit}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{bdt(r.purchaseValue)}</td>
                    <td className="px-4 py-3 text-ink">{num(r.consumeQty)} {r.unit}</td>
                    <td className="px-4 py-3 font-semibold text-amber-700">{bdt(r.consumeValue)}</td>
                    <td className="px-4 py-3 font-bold text-ink">{num(r.stock)} {r.unit}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{bdt(r.stockValue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-page font-bold text-ink">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-green-700">{bdt(report?.totals.purchaseValue ?? 0)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-amber-700">{bdt(report?.totals.consumeValue ?? 0)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">{bdt(report?.totals.stockValue ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
}

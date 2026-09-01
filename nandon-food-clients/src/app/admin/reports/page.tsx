"use client";

/**
 * Reports — one date range drives every panel on the page.
 * Numbers come straight from the orders collection, so nothing here is mocked.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import AreaChart from "@/components/admin/AreaChart";
import DonutChart from "@/components/admin/DonutChart";
import {
  getSalesReport, getTopCustomers, invStats, SALES_CHANNELS, type SalesReport,
} from "@/lib/admin";
import {
  Badge, Button, Card, EmptyState, Icon, ICONS, Input, PageHeader, Select, Stat,
  TableSkeleton, bdt, downloadCsv, isoDate, shortDate,
} from "@/components/admin/ui";

type Customer = { _id: string; name: string; company?: string; orders: number; revenue: number; lastOrder: string };

const CHANNEL_COLOR: Record<string, string> = {
  online: "#16a34a",
  corporate: "#e11b22",
  direct: "#6366f1",
};

const CHANNEL_LABEL: Record<string, string> = {
  online: "Online Sales",
  corporate: "Corporate Sales",
  direct: "Direct Sales",
};

/** Quick presets so the common ranges are one click away. */
function preset(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

function monthToDate(): { from: string; to: string } {
  const now = new Date();
  return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) };
}

export default function AdminReportsPage() {
  const [range, setRange] = useState(preset(30));
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");

  const [report, setReport] = useState<SalesReport | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<{ purchaseValue: number; consumeValue: number; stockValue: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, c, inv] = await Promise.all([
      getSalesReport({ from: range.from, to: range.to, channel, status }),
      getTopCustomers({ from: range.from, to: range.to, limit: 10 }),
      invStats({ from: range.from, to: range.to }),
    ]);
    setReport(r);
    setCustomers(Array.isArray(c) ? c : []);
    setInventory(inv ? { purchaseValue: inv.purchaseValue, consumeValue: inv.consumeValue, stockValue: inv.stockValue } : null);
    setLoading(false);
  }, [range, channel, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);

  const s = report?.summary;

  const channelSegments = useMemo(
    () =>
      (report?.byChannel ?? []).map((c) => ({
        label: CHANNEL_LABEL[c._id] || c._id,
        value: c.revenue,
        color: CHANNEL_COLOR[c._id] || "#94a3b8",
      })),
    [report],
  );

  const chartData = report?.daily ?? [];
  const grossProfit = s && inventory ? s.revenue - inventory.consumeValue : null;

  function exportSummary() {
    if (!report) return;
    downloadCsv(`sales-report-${range.from}_to_${range.to}.csv`, [
      ["Nandon Foods — Sales report"],
      ["From", range.from, "To", range.to, "Channel", channel],
      [],
      ["Metric", "Value"],
      ["Orders", report.summary.orders],
      ["Items sold", report.summary.items],
      ["Gross revenue", report.summary.revenue],
      ["Product subtotal", report.summary.subtotal],
      ["Discounts", report.summary.discount],
      ["Delivery collected", report.summary.shipping],
      ["Payment received", report.summary.paid],
      ["Outstanding due", report.summary.due],
      ["Average order value", report.summary.avgOrderValue],
      [],
      ["Date", "Orders", "Revenue"],
      ...report.daily.map((d) => [d.date, d.orders, d.revenue]),
      [],
      ["Sales channel", "Orders", "Revenue"],
      ...report.byChannel.map((c) => [CHANNEL_LABEL[c._id] || c._id, c.orders, c.revenue]),
      [],
      ["Product", "Qty", "Revenue"],
      ...report.topProducts.map((p) => [p.name, p.qty, p.revenue]),
      [],
      ["Category", "Qty", "Revenue"],
      ...report.byCategory.map((c) => [c.name, c.qty, c.revenue]),
    ]);
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Reports"
        desc="Sales, channels, products and inventory — filtered by date."
        actions={
          <>
            <Button variant="outline" onClick={load}><Icon d={ICONS.refresh} /> Refresh</Button>
            <Button onClick={exportSummary} disabled={!report}><Icon d={ICONS.download} /> Export report</Button>
          </>
        }
      />

      {/* Filters */}
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="all">All sales channels</option>
            {SALES_CHANNELS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All order statuses</option>
            <option value="delivered">Delivered only</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {([["Today", 1], ["7 days", 7], ["30 days", 30], ["90 days", 90], ["1 year", 365]] as [string, number][]).map(([label, d]) => (
            <button
              key={label}
              onClick={() => setRange(preset(d))}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft hover:border-brand hover:text-brand"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setRange(monthToDate())}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft hover:border-brand hover:text-brand"
          >
            This month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-line bg-white"><TableSkeleton rows={8} cols={4} /></div>
      ) : !s || s.orders === 0 ? (
        <EmptyState
          Icon={TrendingUp}
          title="No sales in this range"
          desc="Pick a wider date range, or create an invoice under Orders."
          action={<Link href="/admin/orders/new"><Button><Icon d={ICONS.plus} /> Create invoice</Button></Link>}
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Gross revenue" value={bdt(s.revenue)} tone="green" hint={`${s.orders} orders`} />
            <Stat label="Payment received" value={bdt(s.paid)} tone="blue" hint={`Due ${bdt(s.due)}`} />
            <Stat label="Average order" value={bdt(s.avgOrderValue)} hint={`${s.items} items sold`} />
            <Stat label="Discounts given" value={bdt(s.discount)} tone="amber" hint={`Delivery ${bdt(s.shipping)}`} />
          </div>

          {/* Chart + channel split */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Revenue over time" className="lg:col-span-2">
              {chartData.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-soft">No daily data.</p>
              ) : (
                <AreaChart
                  data={chartData.map((d) => d.revenue)}
                  labels={chartData.map((d) => d.date.slice(5))}
                />
              )}
            </Card>

            <Card title="By sales channel">
              {channelSegments.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-soft">No channel data.</p>
              ) : (
                <DonutChart segments={channelSegments} centerLabel="revenue" centerValue={bdt(s.revenue)} />
              )}
            </Card>
          </div>

          {/* Channel table */}
          <Card title="Sales channel breakdown" bodyClass="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase text-ink-soft">
                    <th className="px-5 py-2.5 font-semibold">Channel</th>
                    <th className="px-5 py-2.5 font-semibold">Orders</th>
                    <th className="px-5 py-2.5 font-semibold">Revenue</th>
                    <th className="px-5 py-2.5 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {report!.byChannel.map((c) => {
                    const pct = s.revenue ? Math.round((c.revenue / s.revenue) * 100) : 0;
                    return (
                      <tr key={c._id} className="border-b border-line last:border-0">
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2 font-medium text-ink">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHANNEL_COLOR[c._id] || "#94a3b8" }} />
                            {CHANNEL_LABEL[c._id] || c._id}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-ink-soft">{c.orders}</td>
                        <td className="px-5 py-3 font-semibold text-ink">{bdt(c.revenue)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-page">
                              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: CHANNEL_COLOR[c._id] || "#94a3b8" }} />
                            </span>
                            <span className="text-xs font-semibold text-ink-soft">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Products + categories */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Top products" bodyClass="p-0">
              {report!.topProducts.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-ink-soft">No products sold in this range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-[11px] uppercase text-ink-soft">
                        <th className="px-5 py-2.5 font-semibold">Product</th>
                        <th className="px-5 py-2.5 font-semibold">Qty</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report!.topProducts.map((p) => (
                        <tr key={p._id} className="border-b border-line last:border-0">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {p.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.thumbnail} alt="" className="h-8 w-8 rounded border border-line object-cover" />
                              ) : null}
                              <span className="line-clamp-1 font-medium text-ink">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-ink-soft">{p.qty}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-ink">{bdt(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Sales by category" bodyClass="p-0">
              {report!.byCategory.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-ink-soft">No category data.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-[11px] uppercase text-ink-soft">
                        <th className="px-5 py-2.5 font-semibold">Category</th>
                        <th className="px-5 py-2.5 font-semibold">Qty</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report!.byCategory.map((c, i) => (
                        <tr key={c._id || i} className="border-b border-line last:border-0">
                          <td className="px-5 py-2.5 font-medium text-ink">{c.name}</td>
                          <td className="px-5 py-2.5 text-ink-soft">{c.qty}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-ink">{bdt(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Status + payment + customers */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Orders by status">
              <ul className="space-y-2">
                {report!.byStatus.map((r) => (
                  <li key={r._id} className="flex items-center justify-between">
                    <Badge tone={r._id === "delivered" ? "green" : r._id === "cancelled" ? "red" : "amber"}>{r._id}</Badge>
                    <span className="text-sm text-ink-soft">{r.orders} · <b className="text-ink">{bdt(r.revenue)}</b></span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="By payment method">
              <ul className="space-y-2">
                {report!.byPayment.map((r) => (
                  <li key={r._id} className="flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-ink">{r._id}</span>
                    <span className="text-sm text-ink-soft">{r.orders} · <b className="text-ink">{bdt(r.revenue)}</b></span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Inventory in this range" desc="From Purchase Inventory.">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">Materials purchased</dt><dd className="font-semibold text-green-700">{bdt(inventory?.purchaseValue ?? 0)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">Materials used</dt><dd className="font-semibold text-amber-700">{bdt(inventory?.consumeValue ?? 0)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2"><dt className="text-ink-soft">Closing stock value</dt><dd className="font-semibold text-ink">{bdt(inventory?.stockValue ?? 0)}</dd></div>
                {grossProfit !== null && (
                  <div className="flex justify-between border-t border-line pt-2">
                    <dt className="font-bold text-ink">Revenue − material cost</dt>
                    <dd className={`font-bold ${grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>{bdt(grossProfit)}</dd>
                  </div>
                )}
              </dl>
              <Link href="/admin/inventory" className="mt-3 inline-block text-xs font-semibold text-brand hover:underline">
                Open Purchase Inventory →
              </Link>
            </Card>
          </div>

          <Card title="Top customers" bodyClass="p-0">
            {customers.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-soft">No customer data in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase text-ink-soft">
                      <th className="px-5 py-2.5 font-semibold">Customer</th>
                      <th className="px-5 py-2.5 font-semibold">Phone</th>
                      <th className="px-5 py-2.5 font-semibold">Orders</th>
                      <th className="px-5 py-2.5 font-semibold">Spent</th>
                      <th className="px-5 py-2.5 font-semibold">Last order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr key={`${c._id}-${i}`} className="border-b border-line last:border-0">
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-ink">{c.name || "—"}</p>
                          {c.company && <p className="text-xs text-ink-soft">{c.company}</p>}
                        </td>
                        <td className="px-5 py-2.5 text-ink-soft">{c._id || "—"}</td>
                        <td className="px-5 py-2.5 text-ink-soft">{c.orders}</td>
                        <td className="px-5 py-2.5 font-semibold text-ink">{bdt(c.revenue)}</td>
                        <td className="px-5 py-2.5 text-ink-soft">{shortDate(c.lastOrder)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

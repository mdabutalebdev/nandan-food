"use client";

import { useCallback, useEffect, useState } from "react";
import { ReceiptText } from "lucide-react";
import Link from "next/link";
import {
  adminGetOrders, adminDeleteOrder, adminUpdateOrderStatus, adminOrderStats,
  ORDER_STATUSES, PAYMENT_STATUSES, SALES_CHANNELS, type AdminOrder, type SalesChannel,
} from "@/lib/admin";
import {
  Badge, Button, EmptyState, Icon, ICONS, Input, PageHeader, Pagination, Select, Stat,
  TableSkeleton, Toast, useToast, bdt, downloadCsv, shortDate,
} from "@/components/admin/ui";

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "red" | "indigo" | "slate"> = {
  pending: "amber",
  confirmed: "blue",
  processing: "blue",
  shipped: "indigo",
  delivered: "green",
  cancelled: "red",
  returned: "red",
};

const CHANNEL_TONE: Record<string, "green" | "brand" | "indigo"> = {
  online: "green",
  corporate: "brand",
  direct: "indigo",
};

const CHANNEL_LABEL: Record<string, string> = {
  online: "Online",
  corporate: "Corporate",
  direct: "Direct",
};

type Stats = {
  total?: number;
  pending?: number;
  delivered?: number;
  totalRevenue?: number;
  totalDue?: number;
  byChannel?: Record<SalesChannel, { count: number; revenue: number }>;
};

export default function AdminOrdersPage() {
  const toast = useToast();

  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, paid: 0, count: 0 });
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminGetOrders({
      page, limit: 20,
      searchTerm: debounced || undefined,
      salesChannel: channel,
      status,
      paymentStatus,
      from: from || undefined,
      to: to || undefined,
    });
    setRows(res.rows);
    setSummary(res.summary);
    setMeta(res.meta);
    setLoading(false);
  }, [page, debounced, channel, status, paymentStatus, from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);
  useEffect(() => { adminOrderStats().then((s) => setStats((s as Stats) || {})); }, []);

  async function quickStatus(o: AdminOrder, next: string) {
    const res = await adminUpdateOrderStatus(o._id, next);
    if (res.ok) { toast.ok(`Order ${o.orderId} → ${next}`); load(); }
    else toast.fail(res.message || "Could not update status.");
  }

  async function remove(o: AdminOrder) {
    if (!confirm(`Delete order ${o.orderId}? The record is kept but hidden from this list.`)) return;
    const res = await adminDeleteOrder(o._id);
    if (res.ok) { toast.ok("Order deleted."); load(); }
    else toast.fail(res.message || "Delete failed.");
  }

  function exportCsv() {
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Invoice", "Order ID", "Date", "Customer", "Phone", "Channel", "Items", "Subtotal", "Delivery", "Discount", "Total", "Paid", "Due", "Status", "Payment"],
      ...rows.map((o) => [
        o.invoiceNo || "", o.orderId, shortDate(o.createdAt),
        o.shippingAddress?.fullName || "", o.shippingAddress?.phone || "",
        CHANNEL_LABEL[o.salesChannel || "online"],
        o.items?.length ?? 0, o.subtotal, o.shippingCost,
        (o.discount || 0) + (o.manualDiscount || 0), o.total, o.paidAmount ?? 0,
        Math.max(0, o.total - (o.paidAmount ?? 0)), o.status, o.paymentStatus,
      ]),
    ]);
  }

  function resetFilters() {
    setSearch(""); setChannel("all"); setStatus("all"); setPaymentStatus("all");
    setFrom(""); setTo(""); setPage(1);
  }

  const ch = stats.byChannel;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders & Invoices"
        desc="Every sale — online, corporate and direct — in one place."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Icon d={ICONS.download} /> Export CSV
            </Button>
            <Link href="/admin/orders/new">
              <Button><Icon d={ICONS.plus} /> Create invoice</Button>
            </Link>
          </>
        }
      />

      {/* Channel stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total orders" value={String(stats.total ?? 0)} hint={`${stats.pending ?? 0} pending`} />
        <Stat label="Online sales" value={String(ch?.online?.count ?? 0)} tone="green" hint={bdt(ch?.online?.revenue ?? 0)} />
        <Stat label="Corporate sales" value={String(ch?.corporate?.count ?? 0)} tone="brand" hint={bdt(ch?.corporate?.revenue ?? 0)} />
        <Stat label="Direct sales" value={String(ch?.direct?.count ?? 0)} tone="blue" hint={bdt(ch?.direct?.revenue ?? 0)} />
        <Stat label="Outstanding due" value={bdt(stats.totalDue ?? 0)} tone="red" hint="Unpaid invoice balance" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"><Icon d={ICONS.search} /></span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice no, order ID, name, phone or company…" className="pl-9" />
          </div>
          <Select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}>
            <option value="all">All sales channels</option>
            {SALES_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </Select>
          <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
            <option value="all">Any payment status</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          <Button variant="outline" onClick={resetFilters}><Icon d={ICONS.refresh} /> Reset filters</Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-page px-4 py-2.5 text-sm">
          <span className="text-ink-soft">Filtered: <b className="text-ink">{summary.count}</b> orders</span>
          <span className="text-ink-soft">Value: <b className="text-ink">{bdt(summary.revenue)}</b></span>
          <span className="text-ink-soft">Collected: <b className="text-green-700">{bdt(summary.paid)}</b></span>
          <span className="text-ink-soft">Due: <b className="text-red-600">{bdt(Math.max(0, summary.revenue - summary.paid))}</b></span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-line bg-white">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState
            Icon={ReceiptText}
            title="No orders found"
            desc="Try clearing the filters, or create a manual invoice for a corporate / direct sale."
            action={<Link href="/admin/orders/new"><Button><Icon d={ICONS.plus} /> Create invoice</Button></Link>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3 font-semibold">Invoice / Order</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Channel</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => {
                    const due = Math.max(0, o.total - (o.paidAmount ?? 0));
                    return (
                      <tr key={o._id} className="border-b border-line last:border-0 hover:bg-page/60">
                        <td className="px-4 py-3">
                          <Link href={`/admin/orders/${o._id}`} className="font-semibold text-ink hover:text-brand">
                            {o.invoiceNo || o.orderId}
                          </Link>
                          <p className="text-xs text-ink-soft">{o.orderId} · {shortDate(o.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{o.shippingAddress?.fullName || "—"}</p>
                          <p className="text-xs text-ink-soft">
                            {o.corporate?.companyName || o.shippingAddress?.phone || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={CHANNEL_TONE[o.salesChannel || "online"]}>
                            {CHANNEL_LABEL[o.salesChannel || "online"]}
                          </Badge>
                          {o.orderSource === "admin" && <p className="mt-0.5 text-[10px] text-ink-soft">manual</p>}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{o.items?.length ?? 0}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{bdt(o.total)}</td>
                        <td className={`px-4 py-3 font-semibold ${due > 0 ? "text-red-600" : "text-green-600"}`}>
                          {due > 0 ? bdt(due) : "Paid"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={o.paymentStatus === "paid" ? "green" : o.paymentStatus === "pending" ? "amber" : "red"}>
                            {o.paymentStatus}
                          </Badge>
                          <p className="mt-0.5 text-[10px] uppercase text-ink-soft">{o.paymentMethod}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={o.status}
                            onChange={(e) => quickStatus(o, e.target.value)}
                            className="!w-auto !py-1.5 !text-xs"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </Select>
                          <div className="mt-1"><Badge tone={STATUS_TONE[o.status] ?? "slate"}>{o.status}</Badge></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/admin/orders/${o._id}`} title="Details" className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-ink">
                              <Icon d={ICONS.eye} />
                            </Link>
                            <Link href={`/admin/orders/${o._id}/invoice`} title="Invoice" className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-brand">
                              <Icon d={ICONS.print} />
                            </Link>
                            <button onClick={() => remove(o)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                              <Icon d={ICONS.trash} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />
          </>
        )}
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
}

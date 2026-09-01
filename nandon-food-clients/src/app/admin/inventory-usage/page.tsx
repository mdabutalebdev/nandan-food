"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TrendingDown } from "lucide-react";
import {
  invGetItems, invGetTransactions, invCreateTxn, invDeleteTxn, type InventoryItem, type InventoryTxn,
} from "@/lib/admin";
import ProductPicker from "@/components/admin/inventory/ProductPicker";
import {
  Button, Card, EmptyState, Field, Icon, ICONS, Input, PageHeader, Pagination, Select, Stat,
  Toast, useToast, bdt, downloadCsv, isoDate, num, shortDate,
} from "@/components/admin/ui";

function UsageInner() {
  const sp = useSearchParams();
  const toast = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);

  // Record form
  const [item, setItem] = useState(sp.get("item") || "");
  const [date, setDate] = useState(isoDate());
  const [qty, setQty] = useState("");
  const [purpose, setPurpose] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Ledger
  const [txns, setTxns] = useState<InventoryTxn[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [itemFilter, setItemFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const d = await invGetItems({});
    setItems(Array.isArray(d) ? d : []);
  }, []);

  const loadTxns = useCallback(async () => {
    setLoading(true);
    const res = await invGetTransactions({ type: "consume", item: itemFilter, from: from || undefined, to: to || undefined, page, limit: 25 });
    setTxns(res.rows);
    setMeta(res.meta);
    setSummary(res.summary);
    setLoading(false);
  }, [itemFilter, from, to, page]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadTxns(); }, [loadTxns]);

  const sel = items.find((i) => i._id === item) || null;
  const q = Number(qty) || 0;
  const over = sel ? q > sel.stock : false;

  async function save() {
    if (!item) return setErr("Choose a product.");
    if (q <= 0) return setErr("Enter a quantity greater than 0.");
    if (over && sel) return setErr(`Only ${num(sel.stock)} ${sel.unit} in stock.`);
    setErr("");
    setSaving(true);
    const res = await invCreateTxn({ item, type: "consume", quantity: q, date, purpose, note });
    setSaving(false);
    if (res.ok) {
      toast.ok("Usage recorded.");
      setQty(""); setPurpose(""); setNote("");
      loadItems(); loadTxns();
    } else toast.fail(res.message || "Could not save the usage.");
  }

  async function remove(t: InventoryTxn) {
    if (!confirm("Delete this usage entry? The product's stock will be recalculated.")) return;
    const res = await invDeleteTxn(t._id);
    if (res.ok) { toast.ok("Entry deleted."); loadItems(); loadTxns(); }
    else toast.fail(res.message || "Delete failed.");
  }

  function exportCsv() {
    downloadCsv(`usage-${isoDate()}.csv`, [
      ["Date", "Product", "Used", "Unit", "Stock before", "Stock after", "Value", "Used for", "Note"],
      ...txns.map((t) => {
        const after = t.stockAfter ?? 0;
        return [shortDate(t.date), t.itemName, t.quantity, t.unit, after + t.quantity, after, t.totalCost, t.purpose ?? "", t.note ?? ""];
      }),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Usage" desc="Record what you use — stock goes down, valued at the average cost." />

      {/* Record form */}
      <Card title="Record usage">
        {!items.length ? (
          <p className="text-sm text-ink-soft">Create a product first in <b>Products</b>, then record its usage here.</p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Which product?" required>
                <ProductPicker items={items} value={item} onChange={setItem} />
              </Field>
              <Field label="Date" required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label={`How much used${sel ? ` (${sel.unit})` : ""}`} required>
                <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="2" />
              </Field>
              <Field label="Used for" hint="Production batch, outlet, wastage… Optional.">
                <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Paratha production — batch 14" />
              </Field>
              <Field label="Note" className="sm:col-span-2" hint="Optional.">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </div>

            {sel && q > 0 && (
              <div className={`rounded-lg px-4 py-3 text-sm ${over ? "bg-red-50 text-red-700" : "bg-brand-tint text-brand-dark"}`}>
                {over ? (
                  <>Only <b>{num(sel.stock)} {sel.unit}</b> of <b>{sel.name}</b> in stock — can’t use {num(q)}.</>
                ) : (
                  <>
                    <b>{sel.name}</b>: had <b>{num(sel.stock)} {sel.unit}</b> → using <b>{num(q)} {sel.unit}</b> → left <b>{num(sel.stock - q)} {sel.unit}</b>
                    {sel.avgCost > 0 && <> (worth {bdt(q * sel.avgCost)})</>}.
                  </>
                )}
              </div>
            )}
            {err && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}

            <div className="flex justify-end">
              <Button variant="dark" onClick={save} disabled={saving}>− {saving ? "Saving…" : "Save usage"}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Stat label="Usage value (filtered)" value={bdt(summary.consumeValue ?? 0)} tone="amber" hint={`${summary.consumeCount ?? 0} entries`} />
        <Stat label="Quantity out" value={`${num(summary.consumeQty ?? 0)}`} tone="blue" hint="units used in range" />
        <Stat label="Entries" value={String(meta.total)} hint="in this range" />
      </div>

      <div className="rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h3 className="font-display font-bold text-ink">Usage history</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={itemFilter} onChange={(e) => { setItemFilter(e.target.value); setPage(1); }} className="!w-auto">
              <option value="all">All products</option>
              {items.map((i) => (<option key={i._id} value={i._id}>{i.name}</option>))}
            </Select>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="!w-auto" />
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="!w-auto" />
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!txns.length}><Icon d={ICONS.download} /> CSV</Button>
          </div>
        </div>

        {loading ? (
          <div className="p-4"><div className="h-40 animate-pulse rounded bg-page" /></div>
        ) : txns.length === 0 ? (
          <EmptyState Icon={TrendingDown} title="No usage in this range" desc="Record a usage entry above to start the history." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Had</th>
                    <th className="px-4 py-3 font-semibold">Used</th>
                    <th className="px-4 py-3 font-semibold">Left</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                    <th className="px-4 py-3 font-semibold">Used for</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => {
                    const after = t.stockAfter ?? 0;
                    const before = after + t.quantity;
                    return (
                      <tr key={t._id} className="border-b border-line last:border-0 hover:bg-page/60">
                        <td className="px-4 py-3 text-ink-soft">{shortDate(t.date)}</td>
                        <td className="px-4 py-3 font-medium text-ink">{t.itemName}</td>
                        <td className="px-4 py-3 text-ink-soft">{num(before)} {t.unit}</td>
                        <td className="px-4 py-3 font-semibold text-amber-700">− {num(t.quantity)} {t.unit}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{num(after)} {t.unit}</td>
                        <td className="px-4 py-3 text-ink-soft">{t.totalCost ? bdt(t.totalCost) : "—"}</td>
                        <td className="px-4 py-3 text-xs text-ink-soft">
                          {t.purpose || (t.note ? <span className="italic">{t.note}</span> : "—")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => remove(t)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"><Icon d={ICONS.trash} /></button>
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

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-ink-soft">Loading…</div>}>
      <UsageInner />
    </Suspense>
  );
}

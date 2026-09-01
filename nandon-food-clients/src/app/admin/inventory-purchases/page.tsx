"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReceiptText } from "lucide-react";
import {
  invGetItems, invGetTransactions, invCreateTxn, invDeleteTxn, invUpdateItem,
  INVENTORY_UNITS, type InventoryItem, type InventoryTxn,
} from "@/lib/admin";
import ProductPicker from "@/components/admin/inventory/ProductPicker";
import {
  Button, Card, EmptyState, Field, Icon, ICONS, Input, PageHeader, Pagination, Select, Stat,
  Toast, useToast, bdt, downloadCsv, isoDate, num, shortDate,
} from "@/components/admin/ui";

function PurchasesInner() {
  const sp = useSearchParams();
  const toast = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);

  // Record form
  const [item, setItem] = useState(sp.get("item") || "");
  const [unit, setUnit] = useState("kg");
  const [date, setDate] = useState(isoDate());
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const [rate, setRate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [bill, setBill] = useState("");
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
    const res = await invGetTransactions({ type: "purchase", item: itemFilter, from: from || undefined, to: to || undefined, page, limit: 25 });
    setTxns(res.rows);
    setMeta(res.meta);
    setSummary(res.summary);
    setLoading(false);
  }, [itemFilter, from, to, page]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadTxns(); }, [loadTxns]);

  // When a product is picked, start from its current unit (kg for a brand-new one).
  useEffect(() => {
    const p = items.find((i) => i._id === item);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the unit selector to the chosen product
    if (p) setUnit(p.unit || "kg");
  }, [item, items]);

  const sel = items.find((i) => i._id === item) || null;
  const q = Number(qty) || 0;
  const computedTotal = total !== "" ? Number(total) : q * (Number(rate) || 0);
  const computedRate = rate !== "" ? Number(rate) : (q > 0 ? computedTotal / q : 0);

  async function save() {
    if (!item) return setErr("Choose a product.");
    if (q <= 0) return setErr("Enter a quantity greater than 0.");
    if (computedTotal <= 0) return setErr("Enter the total amount or the rate.");
    setErr("");
    setSaving(true);
    // The unit is set here at buy time — save it onto the product if it changed.
    if (sel && unit && unit !== sel.unit) await invUpdateItem(item, { unit });
    const payload: Record<string, unknown> = { item, type: "purchase", quantity: q, date, supplier, invoiceNo: bill, note };
    if (rate !== "") payload.unitPrice = Number(rate);
    if (total !== "") payload.totalCost = Number(total);
    const res = await invCreateTxn(payload);
    setSaving(false);
    if (res.ok) {
      toast.ok("Purchase recorded.");
      setQty(""); setTotal(""); setRate(""); setBill(""); setNote("");
      loadItems(); loadTxns();
    } else toast.fail(res.message || "Could not save the purchase.");
  }

  async function remove(t: InventoryTxn) {
    if (!confirm("Delete this purchase? The product's stock will be recalculated.")) return;
    const res = await invDeleteTxn(t._id);
    if (res.ok) { toast.ok("Purchase deleted."); loadItems(); loadTxns(); }
    else toast.fail(res.message || "Delete failed.");
  }

  function exportCsv() {
    downloadCsv(`purchases-${isoDate()}.csv`, [
      ["Date", "Product", "Quantity", "Unit", "Rate", "Total", "Supplier", "Bill no", "Stock before", "Stock after", "Note"],
      ...txns.map((t) => [shortDate(t.date), t.itemName, t.quantity, t.unit, t.unitPrice, t.totalCost, t.supplier ?? "", t.invoiceNo ?? "", (t.stockAfter ?? 0) - t.quantity, t.stockAfter ?? 0, t.note ?? ""]),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Purchases" desc="Record what you buy — stock goes up and the cost is saved." />

      {/* Record form */}
      <Card title="Record a purchase">
        {!items.length ? (
          <p className="text-sm text-ink-soft">Create a product first in <b>Products</b>, then buy it here.</p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What are you buying?" required>
                <ProductPicker items={items} value={item} onChange={setItem} />
              </Field>
              <Field label="Date" required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Unit" required hint="kg, litre, gram, pcs… choose how you bought it.">
                <Select value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!item}>
                  {INVENTORY_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
                </Select>
              </Field>
              <Field label={`Quantity${item ? ` (${unit})` : ""}`} required>
                <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="50" />
              </Field>
              <Field label="Total amount (৳)" hint="Or fill the rate below — we work out the other.">
                <Input type="number" step="any" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="4000" />
              </Field>
              <Field label="Rate (৳ per unit)" hint="Optional if you gave the total.">
                <Input type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="80" />
              </Field>
              <Field label="Supplier" hint="Optional.">
                <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Karim Traders" />
              </Field>
              <Field label="Supplier bill / memo no" hint="Optional.">
                <Input value={bill} onChange={(e) => setBill(e.target.value)} />
              </Field>
              <Field label="Note" hint="Optional.">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </div>

            {sel && (
              <div className="rounded-lg bg-brand-tint px-4 py-3 text-sm text-brand-dark">
                <b>{sel.name}</b> — you currently have <b>{num(sel.stock)} {sel.unit}</b> in stock.
                {q > 0 && (
                  <> Buying <b>{num(q)} {unit}</b> for <b>{bdt(computedTotal)}</b>
                  {computedRate > 0 && <> ({bdt(computedRate)} per {unit})</>} → stock becomes <b>{num(sel.stock + q)} {unit}</b>.</>
                )}
              </div>
            )}
            {err && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}><Icon d={ICONS.plus} /> {saving ? "Saving…" : "Save purchase"}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Filters + stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Stat label="Purchases (filtered)" value={bdt(summary.purchaseValue ?? 0)} tone="green" hint={`${summary.purchaseCount ?? 0} entries`} />
        <Stat label="Quantity in" value={`${num(summary.purchaseQty ?? 0)}`} tone="blue" hint="units bought in range" />
        <Stat label="Entries" value={String(meta.total)} hint="in this range" />
      </div>

      <div className="rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h3 className="font-display font-bold text-ink">Purchase history</h3>
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
          <EmptyState Icon={ReceiptText} title="No purchases in this range" desc="Record a purchase above to start the history." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Quantity</th>
                    <th className="px-4 py-3 font-semibold">Rate</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Supplier / bill</th>
                    <th className="px-4 py-3 font-semibold">Stock before</th>
                    <th className="px-4 py-3 font-semibold">Stock after</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t._id} className="border-b border-line last:border-0 hover:bg-page/60">
                      <td className="px-4 py-3 text-ink-soft">{shortDate(t.date)}</td>
                      <td className="px-4 py-3 font-medium text-ink">{t.itemName}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">+ {num(t.quantity)} {t.unit}</td>
                      <td className="px-4 py-3 text-ink-soft">{t.unitPrice ? bdt(t.unitPrice) : "—"}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{t.totalCost ? bdt(t.totalCost) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {t.supplier && <div>{t.supplier}</div>}
                        {t.invoiceNo && <div>Bill: {t.invoiceNo}</div>}
                        {t.note && <div className="italic">{t.note}</div>}
                        {!t.supplier && !t.invoiceNo && !t.note && "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{num((t.stockAfter ?? 0) - t.quantity)} {t.unit}</td>
                      <td className="px-4 py-3 font-medium text-ink">{num(t.stockAfter ?? 0)} {t.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => remove(t)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"><Icon d={ICONS.trash} /></button>
                      </td>
                    </tr>
                  ))}
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
      <PurchasesInner />
    </Suspense>
  );
}

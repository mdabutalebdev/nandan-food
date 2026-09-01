"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Tags } from "lucide-react";
import {
  invGetItems, invCreateItem, invUpdateItem, invDeleteItem, type InventoryItem,
} from "@/lib/admin";
import ItemEditor, {
  INVENTORY_GROUPS, blankItem, itemToForm, formToPayload, type ItemForm,
} from "@/components/admin/inventory/ItemEditor";
import {
  Badge, Button, EmptyState, Icon, ICONS, Input, PageHeader, Select, TableSkeleton, Toast, useToast, bdt, num,
} from "@/components/admin/ui";

export default function InventoryProductsPage() {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<ItemForm | null>(null);

  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await invGetItems({ searchTerm: search || undefined, group });
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search, group]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch from API
    load();
  }, [load]);

  async function saveItem(f: ItemForm) {
    setSaving(true);
    const payload = formToPayload(f);
    const res = f._id ? await invUpdateItem(f._id, payload) : await invCreateItem(payload);
    setSaving(false);
    if (res.ok) { toast.ok(f._id ? "Product updated." : "Product created."); setEditor(null); load(); }
    else toast.fail(res.message || "Save failed.");
  }

  async function remove(i: InventoryItem) {
    if (!confirm(`Delete "${i.name}"? Its purchase & usage history stays on record.`)) return;
    const res = await invDeleteItem(i._id);
    if (res.ok) { toast.ok("Product deleted."); load(); }
    else toast.fail(res.message || "Delete failed.");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        desc="Every item you buy — create it here once, then record purchases & usage."
        actions={<Button onClick={() => setEditor({ ...blankItem })}><Icon d={ICONS.plus} /> New product</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"><Icon d={ICONS.search} /></span>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, code, supplier…" className="pl-9" />
        </div>
        <Select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="all">All categories</option>
          {INVENTORY_GROUPS.map((g) => (<option key={g} value={g}>{g}</option>))}
        </Select>
      </div>

      <div className="rounded-xl border border-line bg-white">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : items.length === 0 ? (
          <EmptyState
            Icon={Tags}
            title="No products yet"
            desc="Create your first product — like “Flour (kg)” or “Potato (kg)”. Then record what you buy and use."
            action={<Button onClick={() => setEditor({ ...blankItem })}><Icon d={ICONS.plus} /> New product</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">In stock</th>
                  <th className="px-4 py-3 font-semibold">Avg cost</th>
                  <th className="px-4 py-3 font-semibold">Stock value</th>
                  <th className="px-4 py-3 font-semibold">Quick</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const low = (i.lowStockAlert || 0) > 0 && i.stock <= (i.lowStockAlert || 0);
                  return (
                    <tr key={i._id} className="border-b border-line last:border-0 hover:bg-page/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{i.name}{!i.isActive && <span className="ml-2 text-xs font-normal text-ink-soft">(retired)</span>}</p>
                        <p className="text-xs text-ink-soft">
                          {i.group} · {i.unit}{i.code ? ` · ${i.code}` : ""}{i.supplier ? ` · ${i.supplier}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${low ? "text-red-600" : "text-ink"}`}>{num(i.stock)} {i.unit}</span>
                        {low && <div className="mt-0.5"><Badge tone="red">Low</Badge></div>}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{bdt(i.avgCost)}<span className="text-xs"> /{i.unit}</span></td>
                      <td className="px-4 py-3 font-semibold text-ink">{bdt(i.stock * i.avgCost)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/inventory-purchases?item=${i._id}`} className="rounded-md px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-50">+ Buy</Link>
                          <Link href={`/admin/inventory-usage?item=${i._id}`} className="rounded-md px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50">− Use</Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditor(itemToForm(i))} title="Edit" className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-brand"><Icon d={ICONS.edit} /></button>
                          <button onClick={() => remove(i)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"><Icon d={ICONS.trash} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && <ItemEditor initial={editor} saving={saving} onSave={saveItem} onClose={() => setEditor(null)} />}
      <Toast msg={toast.msg} />
    </div>
  );
}

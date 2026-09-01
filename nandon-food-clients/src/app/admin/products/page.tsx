"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageOpen } from "lucide-react";
import Link from "next/link";
import {
  adminGetProducts, adminDeleteProduct, adminGetCategories, adminBulkProductStatus, adminBulkDeleteProducts,
  type AdminCategory,
} from "@/lib/admin";
import type { Product } from "@/lib/types";
import {
  Badge, Button, EmptyState, Icon, ICONS, Input, Pagination, PageHeader, Select, Stat,
  TableSkeleton, Toast, useToast, bdt, downloadCsv, shortDate,
} from "@/components/admin/ui";

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  active: "green",
  draft: "amber",
  "out-of-stock": "red",
};

function catName(c: unknown): string {
  if (!c) return "—";
  if (typeof c === "string") return "—";
  return (c as { name?: string }).name || "—";
}

/** Total stock across variants, or the base stock for a simple product. */
function stockOf(p: Product): number {
  if (p.variants && p.variants.length) return p.variants.reduce((n, v) => n + (v.stock || 0), 0);
  return p.stock ?? 0;
}

export default function AdminProductsPage() {
  const toast = useToast();

  const [rows, setRows] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    adminGetCategories().then((c) => setCats(Array.isArray(c) ? c : []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminGetProducts({
      page,
      limit: 20,
      sort,
      searchTerm: debounced || undefined,
      category: category === "all" ? undefined : category,
      status: status === "all" ? undefined : status,
    });
    setRows(res.rows);
    setMeta(res.meta);
    setSelected([]);
    setLoading(false);
  }, [page, sort, debounced, category, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);

  const stats = useMemo(() => {
    const active = rows.filter((p) => p.status === "active").length;
    const low = rows.filter((p) => stockOf(p) <= 5).length;
    const value = rows.reduce((n, p) => n + (p.price || 0) * stockOf(p), 0);
    return { active, low, value };
  }, [rows]);

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This hides it from the storefront.`)) return;
    setBusy(true);
    const res = await adminDeleteProduct(p._id);
    setBusy(false);
    if (res.ok) { toast.ok("Product deleted."); load(); }
    else toast.fail(res.message || "Delete failed.");
  }

  async function bulkStatus(next: string) {
    if (!selected.length) return;
    setBusy(true);
    const res = await adminBulkProductStatus(selected, next);
    setBusy(false);
    if (res.ok) { toast.ok(`${selected.length} product(s) set to ${next}.`); load(); }
    else toast.fail(res.message || "Bulk update failed.");
  }

  async function bulkDelete() {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} selected product(s)?`)) return;
    setBusy(true);
    const res = await adminBulkDeleteProducts(selected);
    setBusy(false);
    if (res.ok) { toast.ok("Products deleted."); load(); }
    else toast.fail(res.message || "Bulk delete failed.");
  }

  function exportCsv() {
    downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Name", "SKU", "Category", "Price", "Original", "Stock", "Sold", "Status", "Created"],
      ...rows.map((p) => [
        p.name, p.sku || "", catName(p.category), p.price, p.originalPrice ?? "",
        stockOf(p), p.totalSold ?? 0, p.status ?? "", shortDate((p as unknown as { createdAt?: string }).createdAt),
      ]),
    ]);
  }

  const allChecked = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        desc="Your full catalogue — add, edit, organise and publish."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Icon d={ICONS.download} /> Export CSV
            </Button>
            <Link href="/admin/products/new">
              <Button><Icon d={ICONS.plus} /> Add product</Button>
            </Link>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total products" value={String(meta.total)} hint="Across all categories" />
        <Stat label="Active on page" value={String(stats.active)} tone="green" hint={`of ${rows.length} shown`} />
        <Stat label="Low stock" value={String(stats.low)} tone="red" hint="5 or fewer left" />
        <Stat label="Stock value" value={bdt(stats.value)} tone="blue" hint="Price × stock (this page)" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
              <Icon d={ICONS.search} />
            </span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="pl-9" />
          </div>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="all">All categories</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.parent ? "— " : ""}{c.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="out-of-stock">Out of stock</option>
          </Select>
          <Select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="-name">Name Z–A</option>
            <option value="price">Price low → high</option>
            <option value="-price">Price high → low</option>
            <option value="-totalSold">Best selling</option>
          </Select>
        </div>

        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-brand-tint px-3 py-2">
            <span className="text-sm font-semibold text-brand-dark">{selected.length} selected</span>
            <Button size="sm" variant="outline" onClick={() => bulkStatus("active")} disabled={busy}>Set active</Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatus("draft")} disabled={busy}>Set draft</Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatus("out-of-stock")} disabled={busy}>Out of stock</Button>
            <Button size="sm" variant="danger" onClick={bulkDelete} disabled={busy}>Delete</Button>
            <button onClick={() => setSelected([])} className="ml-auto text-xs font-semibold text-brand-dark underline">
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-line bg-white">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            Icon={PackageOpen}
            title="No products found"
            desc={debounced || category !== "all" || status !== "all" ? "Try clearing the filters." : "Add your first product to start selling."}
            action={<Link href="/admin/products/new"><Button><Icon d={ICONS.plus} /> Add product</Button></Link>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r._id) : [])}
                        className="h-4 w-4 accent-[var(--color-brand)]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Sold</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const stock = stockOf(p);
                    return (
                      <tr key={p._id} className="border-b border-line last:border-0 hover:bg-page/60">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(p._id)}
                            onChange={(e) =>
                              setSelected((s) => (e.target.checked ? [...s, p._id] : s.filter((x) => x !== p._id)))
                            }
                            className="h-4 w-4 accent-[var(--color-brand)]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.thumbnail} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover" />
                            <div className="min-w-0">
                              <Link href={`/admin/products/${p._id}`} className="line-clamp-1 font-semibold text-ink hover:text-brand">
                                {p.name}
                              </Link>
                              <p className="text-xs text-ink-soft">{p.sku || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{catName(p.category)}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-ink">{bdt(p.price)}</span>
                          {p.originalPrice && p.originalPrice > p.price ? (
                            <span className="ml-1.5 text-xs text-ink-soft line-through">{bdt(p.originalPrice)}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${stock <= 0 ? "text-red-600" : stock <= 5 ? "text-amber-600" : "text-ink"}`}>
                            {stock}
                          </span>
                          {p.variants && p.variants.length > 0 && (
                            <span className="ml-1 text-xs text-ink-soft">({p.variants.length} var.)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{p.totalSold ?? 0}</td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[p.status ?? ""] ?? "slate"}>{p.status ?? "—"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/admin/products/${p._id}`} title="Details" className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-ink">
                              <Icon d={ICONS.eye} />
                            </Link>
                            <Link href={`/admin/products/${p._id}/edit`} title="Edit" className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-brand">
                              <Icon d={ICONS.edit} />
                            </Link>
                            <button onClick={() => remove(p)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
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

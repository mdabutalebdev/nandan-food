"use client";

import { useEffect, useState } from "react";
import { PackageX } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adminGetProduct, adminDeleteProduct } from "@/lib/admin";
import type { Product } from "@/lib/types";
import {
  Badge, Button, Card, EmptyState, Icon, ICONS, PageHeader, Stat, TableSkeleton, Toast, useToast, bdt, longDate,
} from "@/components/admin/ui";

function catName(c: unknown): string {
  if (!c || typeof c === "string") return "—";
  return (c as { name?: string }).name || "—";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!id) return;
    adminGetProduct(id).then((data) => {
      setP(data);
      setLoading(false);
    });
  }, [id]);

  async function remove() {
    if (!p) return;
    if (!confirm(`Delete "${p.name}"?`)) return;
    const res = await adminDeleteProduct(p._id);
    if (res.ok) router.push("/admin/products");
    else toast.fail(res.message || "Delete failed.");
  }

  if (loading) return <div className="rounded-xl border border-line bg-white"><TableSkeleton rows={6} cols={3} /></div>;
  if (!p) return <EmptyState Icon={PackageX} title="Product not found" desc="It may have been deleted." />;

  const gallery = [p.thumbnail, ...(p.images || [])].filter(Boolean);
  const variantStock = (p.variants || []).reduce((n, v) => n + (v.stock || 0), 0);
  const stock = p.variants && p.variants.length ? variantStock : p.stock ?? 0;
  const created = (p as unknown as { createdAt?: string }).createdAt;

  return (
    <div className="space-y-5">
      <PageHeader
        title={p.name}
        desc={`SKU ${p.sku || "—"} · added ${longDate(created)}`}
        actions={
          <>
            <Link href="/admin/products"><Button variant="outline"><Icon d={ICONS.back} /> Back</Button></Link>
            <Link href={`/product/${p.slug}`} target="_blank"><Button variant="outline"><Icon d={ICONS.eye} /> View on site</Button></Link>
            <Link href={`/admin/products/${p._id}/edit`}><Button><Icon d={ICONS.edit} /> Edit</Button></Link>
            <Button variant="danger" onClick={remove}><Icon d={ICONS.trash} /> Delete</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Price" value={bdt(p.price)} hint={p.originalPrice ? `was ${bdt(p.originalPrice)}` : "no offer"} />
        <Stat label="Stock" value={String(stock)} tone={stock <= 5 ? "red" : "green"} hint={p.variants?.length ? `${p.variants.length} variants` : "base stock"} />
        <Stat label="Total sold" value={String(p.totalSold ?? 0)} tone="blue" />
        <Stat label="Rating" value={`${(p.rating ?? 0).toFixed(1)} ★`} tone="amber" hint={`${p.reviewCount ?? 0} reviews`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* Gallery */}
        <Card title="Images">
          <div className="overflow-hidden rounded-lg border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gallery[active] || p.thumbnail} alt={p.name} className="h-64 w-full object-cover" />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {gallery.map((g, i) => (
                <button
                  key={`${g}-${i}`}
                  onClick={() => setActive(i)}
                  className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${i === active ? "border-brand" : "border-line"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Details">
            <dl>
              <Row label="Category" value={catName(p.category)} />
              <Row label="Sub-category" value={catName(p.subcategory)} />
              <Row label="Brand" value={p.brand || "—"} />
              <Row label="Country" value={(p as unknown as { country?: string }).country || "—"} />
              <Row label="Status" value={<Badge tone={p.status === "active" ? "green" : p.status === "draft" ? "amber" : "red"}>{p.status}</Badge>} />
              <Row label="Visibility" value={<Badge tone={p.visibility === "visible" ? "green" : "slate"}>{p.visibility}</Badge>} />
              <Row label="Slug" value={<code className="rounded bg-page px-1.5 py-0.5 text-xs">{p.slug}</code>} />
              <Row
                label="Badges"
                value={
                  p.flags?.length ? (
                    <span className="flex flex-wrap justify-end gap-1">
                      {p.flags.map((f) => <Badge key={f} tone="brand">{f.replace("-", " ")}</Badge>)}
                    </span>
                  ) : "—"
                }
              />
            </dl>
          </Card>

          <Card title="Description">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{p.description}</p>
            {p.tagline && <p className="mt-3 rounded-lg bg-page px-3 py-2 text-sm text-ink">{p.tagline}</p>}
          </Card>

          {p.variants && p.variants.length > 0 && (
            <Card title={`Variants (${p.variants.length})`} bodyClass="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase text-ink-soft">
                      <th className="px-5 py-2.5 font-semibold">Variant</th>
                      <th className="px-5 py-2.5 font-semibold">Price</th>
                      <th className="px-5 py-2.5 font-semibold">Stock</th>
                      <th className="px-5 py-2.5 font-semibold">SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.variants.map((v, i) => (
                      <tr key={v._id || i} className="border-b border-line last:border-0">
                        <td className="px-5 py-3 font-medium text-ink">
                          {v.label || [v.color, v.size].filter(Boolean).join(" / ") || `Variant ${i + 1}`}
                        </td>
                        <td className="px-5 py-3">
                          {bdt(v.price)}
                          {v.originalPrice ? <span className="ml-1.5 text-xs text-ink-soft line-through">{bdt(v.originalPrice)}</span> : null}
                        </td>
                        <td className={`px-5 py-3 font-semibold ${(v.stock ?? 0) <= 5 ? "text-amber-600" : "text-ink"}`}>{v.stock ?? 0}</td>
                        <td className="px-5 py-3 text-ink-soft">{(v as { sku?: string }).sku || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {(p.deliveryInfo || p.paymentInfo || p.termsInfo) && (
            <Card title="Product page tabs">
              <div className="space-y-3 text-sm text-ink-soft">
                {p.deliveryInfo && <div><p className="font-semibold text-ink">Delivery</p><p className="whitespace-pre-wrap">{p.deliveryInfo}</p></div>}
                {p.paymentInfo && <div><p className="font-semibold text-ink">Payment</p><p className="whitespace-pre-wrap">{p.paymentInfo}</p></div>}
                {p.termsInfo && <div><p className="font-semibold text-ink">Terms</p><p className="whitespace-pre-wrap">{p.termsInfo}</p></div>}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
}

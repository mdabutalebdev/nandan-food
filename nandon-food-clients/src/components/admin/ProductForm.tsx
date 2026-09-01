"use client";

/**
 * The full product editor — used by both "Add product" and "Edit product".
 * Everything the storefront can show is editable here: pricing, images,
 * category, filters, stock, variants and the product-page content tabs.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadImage } from "@/lib/api";
import { adminGetCategories, adminCreateProduct, adminUpdateProduct, type AdminCategory } from "@/lib/admin";
import type { Product, ProductVariant } from "@/lib/types";
import {
  Button, Card, Checkbox, Field, Icon, ICONS, Input, PageHeader, Select, Textarea, Toast, useToast, bdt,
} from "./ui";

const COUNTRIES = ["", "Bangladesh", "Pakistan", "UAE", "USA", "China"];
const FLAGS = ["best-selling", "new-arrival", "featured", "on-sale", "combo"];

type FormVariant = ProductVariant & { key: string };

type FormState = {
  name: string;
  slug: string;
  description: string;
  tagline: string;
  priceType: "fixed" | "negotiable";
  price: string;
  originalPrice: string;
  thumbnail: string;
  images: string[];
  category: string;
  subcategory: string;
  country: string;
  brand: string;
  flags: string[];
  stock: string;
  status: string;
  visibility: string;
  tags: string;
  deliveryInfo: string;
  paymentInfo: string;
  termsInfo: string;
  variants: FormVariant[];
};

const uid = () => `v_${Math.random().toString(36).slice(2, 9)}`;

const blank: FormState = {
  name: "", slug: "", description: "", tagline: "", priceType: "fixed",
  price: "", originalPrice: "", thumbnail: "", images: [],
  category: "", subcategory: "", country: "", brand: "", flags: [],
  stock: "0", status: "active", visibility: "visible", tags: "",
  deliveryInfo: "", paymentInfo: "", termsInfo: "", variants: [],
};

function idOf(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return (v as { _id?: string })._id || "";
}

function fromProduct(p: Product): FormState {
  return {
    name: p.name || "",
    slug: p.slug || "",
    description: p.description || "",
    tagline: p.tagline || "",
    priceType: (p as { priceType?: "fixed" | "negotiable" }).priceType || "fixed",
    price: String(p.price ?? ""),
    originalPrice: p.originalPrice ? String(p.originalPrice) : "",
    thumbnail: p.thumbnail || "",
    images: p.images || [],
    category: idOf(p.category),
    subcategory: idOf(p.subcategory),
    country: (p as { country?: string }).country || "",
    brand: p.brand || "",
    flags: p.flags || [],
    stock: String(p.stock ?? 0),
    status: p.status || "active",
    visibility: p.visibility || "visible",
    tags: ((p as { tags?: string[] }).tags || []).join(", "),
    deliveryInfo: p.deliveryInfo || "",
    paymentInfo: p.paymentInfo || "",
    termsInfo: p.termsInfo || "",
    variants: (p.variants || []).map((v) => ({ ...v, key: uid() })),
  };
}

/* ── Image uploader ───────────────────────────────────────────────── */
function ImageBox({
  url,
  onPick,
  onClear,
  label,
  aspect = "h-40",
}: {
  url: string;
  onPick: (u: string) => void;
  onClear?: () => void;
  label: string;
  aspect?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const u = await uploadImage(f);
    setBusy(false);
    if (u) onPick(u);
    e.target.value = "";
  }

  if (url) {
    return (
      <div className={`group relative overflow-hidden rounded-lg border border-line ${aspect}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100">
          <label className="cursor-pointer rounded bg-white/90 px-3 py-1 text-xs font-bold text-ink">
            {busy ? "…" : "Change"}
            <input type="file" accept="image/*" className="hidden" onChange={pick} />
          </label>
          {onClear && (
            <button onClick={onClear} className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white">
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <label
      className={`flex ${aspect} cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint/40`}
    >
      {busy ? (
        <span className="text-sm font-semibold text-brand">Uploading…</span>
      ) : (
        <>
          <Icon d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" className="h-7 w-7" />
          <span className="text-xs font-semibold">{label}</span>
        </>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={pick} />
    </label>
  );
}

/* ── Variant row ──────────────────────────────────────────────────── */
function VariantRow({
  v,
  onChange,
  onRemove,
}: {
  v: FormVariant;
  onChange: (patch: Partial<FormVariant>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Colour / Type">
          <Input value={v.color || ""} onChange={(e) => onChange({ color: e.target.value })} placeholder="Red" />
        </Field>
        <Field label="Size / Weight">
          <Input value={v.size || ""} onChange={(e) => onChange({ size: e.target.value })} placeholder="1 kg" />
        </Field>
        <Field label="Price" required>
          <Input
            type="number"
            value={v.price ?? ""}
            onChange={(e) => onChange({ price: Number(e.target.value) })}
            placeholder="0"
          />
        </Field>
        <Field label="Original price">
          <Input
            type="number"
            value={v.originalPrice ?? ""}
            onChange={(e) => onChange({ originalPrice: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="0"
          />
        </Field>
        <Field label="Stock">
          <Input type="number" value={v.stock ?? 0} onChange={(e) => onChange({ stock: Number(e.target.value) })} />
        </Field>
        <Field label="SKU">
          <Input value={(v as { sku?: string }).sku || ""} onChange={(e) => onChange({ sku: e.target.value } as Partial<FormVariant>)} />
        </Field>
        <Field label="Note" className="lg:col-span-2">
          <Input value={v.note || ""} onChange={(e) => onChange({ note: e.target.value })} placeholder="Shown under the variant" />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="w-32">
          <ImageBox
            url={v.images?.[0] || ""}
            label="Variant image"
            aspect="h-24"
            onPick={(u) => onChange({ images: [u, ...(v.images || []).slice(1)] })}
            onClear={() => onChange({ images: (v.images || []).slice(1) })}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 hover:bg-red-50">
          <Icon d={ICONS.trash} /> Remove variant
        </Button>
      </div>
    </div>
  );
}

/* ── Main form ────────────────────────────────────────────────────── */
export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(product?._id);

  const [f, setF] = useState<FormState>(product ? fromProduct(product) : blank);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [galleryBusy, setGalleryBusy] = useState(false);

  useEffect(() => {
    adminGetCategories().then((c) => setCats(Array.isArray(c) ? c : []));
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const rootCats = useMemo(() => cats.filter((c) => !c.parent || idOf(c.parent) === ""), [cats]);
  const subCats = useMemo(
    () => cats.filter((c) => idOf(c.parent) === f.category),
    [cats, f.category],
  );

  const discountPct = useMemo(() => {
    const p = Number(f.price) || 0;
    const o = Number(f.originalPrice) || 0;
    return o > p && o > 0 ? Math.round(((o - p) / o) * 100) : 0;
  }, [f.price, f.originalPrice]);

  async function addGalleryImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGalleryBusy(true);
    const urls: string[] = [];
    for (const file of files) {
      const u = await uploadImage(file);
      if (u) urls.push(u);
    }
    setGalleryBusy(false);
    set("images", [...f.images, ...urls]);
    e.target.value = "";
  }

  function toggleFlag(flag: string) {
    set("flags", f.flags.includes(flag) ? f.flags.filter((x) => x !== flag) : [...f.flags, flag]);
  }

  async function save(goBack = true) {
    setErr("");
    if (!f.name.trim()) return setErr("Product name is required.");
    if (!f.description.trim()) return setErr("Description is required.");
    if (!f.thumbnail) return setErr("Please upload a thumbnail image.");
    if (!f.category) return setErr("Please choose a category.");
    if (f.price === "" || Number.isNaN(Number(f.price))) return setErr("Please enter a valid price.");

    const payload: Record<string, unknown> = {
      name: f.name.trim(),
      description: f.description.trim(),
      tagline: f.tagline.trim() || undefined,
      priceType: f.priceType,
      price: Number(f.price),
      originalPrice: f.originalPrice === "" ? null : Number(f.originalPrice),
      thumbnail: f.thumbnail,
      images: f.images,
      category: f.category,
      subcategory: f.subcategory || null,
      country: f.country,
      brand: f.brand.trim(),
      flags: f.flags,
      stock: Number(f.stock) || 0,
      status: f.status,
      visibility: f.visibility,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      deliveryInfo: f.deliveryInfo,
      paymentInfo: f.paymentInfo,
      termsInfo: f.termsInfo,
      variants: f.variants.map((v) => ({
        color: v.color || "",
        colorHex: v.colorHex || "",
        size: v.size || "",
        price: Number(v.price) || 0,
        originalPrice: v.originalPrice === null || v.originalPrice === undefined ? null : Number(v.originalPrice),
        stock: Number(v.stock) || 0,
        sku: (v as { sku?: string }).sku || "",
        images: v.images || [],
        note: v.note || "",
      })),
    };
    if (isEdit && f.slug) payload.slug = f.slug;

    setSaving(true);
    const res = isEdit
      ? await adminUpdateProduct(product!._id, payload)
      : await adminCreateProduct(payload);
    setSaving(false);

    if (!res.ok) return setErr(res.message || "Could not save the product.");
    toast.ok(isEdit ? "Product updated." : "Product created.");
    if (goBack) setTimeout(() => router.push("/admin/products"), 500);
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={isEdit ? "Edit product" : "Add product"}
        desc={isEdit ? f.name : "Fill in the details below — the product goes live as soon as you save."}
        actions={
          <>
            <Link href="/admin/products">
              <Button variant="outline">
                <Icon d={ICONS.back} /> Back to list
              </Button>
            </Link>
            <Button onClick={() => save(true)} disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      />

      {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-medium text-brand-dark">{err}</div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── Main column ─────────────────────────────────── */}
        <div className="space-y-5">
          <Card title="Basic information">
            <div className="grid gap-4">
              <Field label="Product name" required>
                <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Frozen Paratha (Family Pack)" />
              </Field>
              {isEdit && (
                <Field label="Slug" hint="Used in the storefront URL. Leave as-is unless you know what you're doing.">
                  <Input value={f.slug} onChange={(e) => set("slug", e.target.value)} />
                </Field>
              )}
              <Field label="Short tagline" hint="Small line under the product name on the card.">
                <Input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="100% halal · no preservatives" />
              </Field>
              <Field label="Description" required>
                <Textarea rows={6} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the product…" />
              </Field>
            </div>
          </Card>

          <Card title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Selling price (৳)" required>
                <Input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="0" />
              </Field>
              <Field label="Original price (৳)" hint="Shown struck-through">
                <Input type="number" value={f.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} placeholder="0" />
              </Field>
              <Field label="Price type">
                <Select value={f.priceType} onChange={(e) => set("priceType", e.target.value as "fixed" | "negotiable")}>
                  <option value="fixed">Fixed</option>
                  <option value="negotiable">Negotiable</option>
                </Select>
              </Field>
            </div>
            {discountPct > 0 && (
              <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                Customers see a <b>{discountPct}% OFF</b> badge — saving {bdt(Number(f.originalPrice) - Number(f.price))}.
              </p>
            )}
          </Card>

          <Card title="Images" desc="The thumbnail is the main card image; gallery images show on the product page.">
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <Field label="Thumbnail" required>
                <ImageBox url={f.thumbnail} label="Upload thumbnail" onPick={(u) => set("thumbnail", u)} onClear={() => set("thumbnail", "")} />
              </Field>
              <Field label="Gallery images">
                <div className="flex flex-wrap gap-3">
                  {f.images.map((img, i) => (
                    <div key={`${img}-${i}`} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => set("images", f.images.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 hidden rounded bg-red-600 px-1.5 text-xs font-bold text-white group-hover:block"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-ink-soft hover:border-brand">
                    {galleryBusy ? <span className="text-xs font-semibold text-brand">…</span> : <Icon d={ICONS.plus} className="h-5 w-5" />}
                    <span className="text-[10px] font-semibold">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={addGalleryImages} />
                  </label>
                </div>
              </Field>
            </div>
          </Card>

          <Card
            title="Variants"
            desc="Different sizes/weights with their own price and stock. Leave empty for a simple product."
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => set("variants", [...f.variants, { key: uid(), color: "", size: "", price: Number(f.price) || 0, stock: 0, images: [] }])}
              >
                <Icon d={ICONS.plus} /> Add variant
              </Button>
            }
          >
            {f.variants.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">
                No variants — the product sells at a single price with the base stock below.
              </p>
            ) : (
              <div className="space-y-4">
                {f.variants.map((v, i) => (
                  <VariantRow
                    key={v.key}
                    v={v}
                    onChange={(patch) => set("variants", f.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
                    onRemove={() => set("variants", f.variants.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title="Product page tabs" desc="Optional content shown in the tabs on the product detail page.">
            <div className="grid gap-4">
              <Field label="Delivery information">
                <Textarea rows={3} value={f.deliveryInfo} onChange={(e) => set("deliveryInfo", e.target.value)} />
              </Field>
              <Field label="Payment information">
                <Textarea rows={3} value={f.paymentInfo} onChange={(e) => set("paymentInfo", e.target.value)} />
              </Field>
              <Field label="Terms / return policy">
                <Textarea rows={3} value={f.termsInfo} onChange={(e) => set("termsInfo", e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        {/* ── Side column ─────────────────────────────────── */}
        <div className="space-y-5">
          <Card title="Organise">
            <div className="grid gap-4">
              <Field label="Category" required>
                <Select value={f.category} onChange={(e) => { set("category", e.target.value); set("subcategory", ""); }}>
                  <option value="">Choose a category…</option>
                  {rootCats.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              {subCats.length > 0 && (
                <Field label="Sub-category">
                  <Select value={f.subcategory} onChange={(e) => set("subcategory", e.target.value)}>
                    <option value="">None</option>
                    {subCats.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Brand">
                <Input value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Nandon" />
              </Field>
              <Field label="Country of origin">
                <Select value={f.country} onChange={(e) => set("country", e.target.value)}>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c || "Not set"}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tags" hint="Comma separated — helps search.">
                <Input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="frozen, paratha, breakfast" />
              </Field>
            </div>
          </Card>

          <Card title="Badges">
            <div className="grid gap-2.5">
              {FLAGS.map((flag) => (
                <Checkbox
                  key={flag}
                  checked={f.flags.includes(flag)}
                  onChange={() => toggleFlag(flag)}
                  label={flag.replace("-", " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                />
              ))}
            </div>
          </Card>

          <Card title="Stock & visibility">
            <div className="grid gap-4">
              <Field label="Stock quantity" hint="Used when the product has no variants.">
                <Input type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="out-of-stock">Out of stock</option>
                </Select>
              </Field>
              <Field label="Visibility">
                <Select value={f.visibility} onChange={(e) => set("visibility", e.target.value)}>
                  <option value="visible">Visible</option>
                  <option value="hidden">Hidden</option>
                </Select>
              </Field>
            </div>
          </Card>

          <div className="sticky bottom-4 rounded-xl border border-line bg-white p-4 shadow-lg">
            <Button onClick={() => save(true)} disabled={saving} className="w-full">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
            </Button>
            {isEdit && (
              <Button variant="outline" onClick={() => save(false)} disabled={saving} className="mt-2 w-full">
                Save &amp; stay
              </Button>
            )}
          </div>
        </div>
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
}

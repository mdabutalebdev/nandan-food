"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderTree } from "lucide-react";
import Link from "next/link";
import { uploadImage } from "@/lib/api";
import {
  adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory, type AdminCategory,
} from "@/lib/admin";
import {
  Badge, Button, Checkbox, EmptyState, Field, Icon, ICONS, Input, Modal, PageHeader, Select, Stat,
  TableSkeleton, Textarea, Toast, useToast, downloadCsv, shortDate,
} from "@/components/admin/ui";

type FormState = {
  _id?: string;
  name: string;
  description: string;
  parent: string;
  order: number;
  image: string;
  icon: string;
  banner: string;
  isActive: boolean;
  isFeatured: boolean;
  showInMenu: boolean;
  showInHome: boolean;
  metaTitle: string;
  metaDescription: string;
};

const blank: FormState = {
  name: "", description: "", parent: "", order: 0, image: "", icon: "", banner: "",
  isActive: true, isFeatured: false, showInMenu: true, showInHome: true,
  metaTitle: "", metaDescription: "",
};

const parentId = (c: AdminCategory): string => {
  const p = c.parent;
  if (!p) return "";
  return typeof p === "string" ? p : p._id || "";
};

/** Flatten the category list into display order: root → child → grandchild. */
function buildTree(cats: AdminCategory[]): { cat: AdminCategory; depth: number }[] {
  const byParent = new Map<string, AdminCategory[]>();
  for (const c of cats) {
    const key = parentId(c);
    byParent.set(key, [...(byParent.get(key) || []), c]);
  }
  const sortFn = (a: AdminCategory, b: AdminCategory) =>
    (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);

  const out: { cat: AdminCategory; depth: number }[] = [];
  const walk = (key: string, depth: number) => {
    for (const c of (byParent.get(key) || []).sort(sortFn)) {
      out.push({ cat: c, depth });
      walk(c._id, depth + 1);
    }
  };
  walk("", 0);

  // Any category whose parent was deleted still deserves a row.
  const seen = new Set(out.map((o) => o.cat._id));
  for (const c of cats) if (!seen.has(c._id)) out.push({ cat: c, depth: 0 });
  return out;
}

/* ── Editor modal ─────────────────────────────────────────────────── */
function CategoryEditor({
  initial,
  cats,
  onSave,
  onClose,
  saving,
}: {
  initial: FormState;
  cats: AdminCategory[];
  onSave: (f: FormState) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  // A category may not be parented to itself or to one of its own children.
  const parentOptions = useMemo(() => {
    const childIds = new Set(cats.filter((c) => parentId(c) === f._id).map((c) => c._id));
    return buildTree(cats)
      .filter(({ cat, depth }) => cat._id !== f._id && !childIds.has(cat._id) && depth < 2)
      .map(({ cat, depth }) => ({ id: cat._id, label: `${"— ".repeat(depth)}${cat.name}` }));
  }, [cats, f._id]);

  async function pick(field: "image" | "icon" | "banner", file?: File) {
    if (!file) return;
    setBusy(field);
    const u = await uploadImage(file);
    setBusy("");
    if (u) set(field, u);
    else setErr("Upload failed — check you are logged in as admin.");
  }

  function submit() {
    if (!f.name.trim()) return setErr("Category name is required.");
    setErr("");
    onSave(f);
  }

  return (
    <Modal
      title={f._id ? "Edit category" : "Add category"}
      desc="Categories build the storefront menu — up to three levels deep."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : f._id ? "Save changes" : "Add category"}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Frozen Products" />
          </Field>
          <Field label="Parent category" hint="Leave empty to make it a top-level menu item.">
            <Select value={f.parent} onChange={(e) => set("parent", e.target.value)}>
              <option value="">— None (top level) —</option>
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Description">
          <Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          {(["image", "icon", "banner"] as const).map((field) => (
            <Field key={field} label={field[0].toUpperCase() + field.slice(1)}>
              {f[field] ? (
                <div className="group relative h-24 overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f[field]} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => set(field, "")}
                    className="absolute right-1 top-1 hidden rounded bg-red-600 px-1.5 text-xs font-bold text-white group-hover:block"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-ink-soft hover:border-brand">
                  {busy === field ? <span className="text-xs font-semibold text-brand">…</span> : <Icon d={ICONS.plus} className="h-5 w-5" />}
                  <span className="text-[10px] font-semibold">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(field, e.target.files?.[0])} />
                </label>
              )}
            </Field>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sort order" hint="Lower numbers appear first.">
            <Input type="number" value={f.order} onChange={(e) => set("order", Number(e.target.value))} />
          </Field>
          <div className="grid content-end gap-2.5">
            <Checkbox checked={f.isActive} onChange={(v) => set("isActive", v)} label="Active" hint="visible on the site" />
            <Checkbox checked={f.showInMenu} onChange={(v) => set("showInMenu", v)} label="Show in header menu" />
            <Checkbox checked={f.showInHome} onChange={(v) => set("showInHome", v)} label="Show on homepage" />
            <Checkbox checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} label="Featured" />
          </div>
        </div>

        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">SEO (optional)</summary>
          <div className="mt-3 grid gap-4">
            <Field label="Meta title">
              <Input value={f.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
            </Field>
            <Field label="Meta description">
              <Textarea rows={2} value={f.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
            </Field>
          </div>
        </details>

        {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}
      </div>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function AdminCategoriesPage() {
  const toast = useToast();
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<FormState | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminGetCategories();
    setCats(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);

  const tree = useMemo(() => {
    let list = buildTree(cats);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(({ cat }) => cat.name.toLowerCase().includes(q) || (cat.slug || "").includes(q));
    }
    if (levelFilter !== "all") list = list.filter(({ depth }) => String(depth) === levelFilter);
    return list;
  }, [cats, search, levelFilter]);

  const counts = useMemo(() => {
    const all = buildTree(cats);
    return {
      total: cats.length,
      root: all.filter((x) => x.depth === 0).length,
      sub: all.filter((x) => x.depth === 1).length,
      deep: all.filter((x) => x.depth === 2).length,
      products: cats.reduce((n, c) => n + (c.productCount || 0), 0),
    };
  }, [cats]);

  async function save(f: FormState) {
    setSaving(true);
    const payload = {
      name: f.name.trim(),
      description: f.description,
      parent: f.parent || null,
      order: Number(f.order) || 0,
      image: f.image,
      icon: f.icon,
      banner: f.banner,
      isActive: f.isActive,
      isFeatured: f.isFeatured,
      showInMenu: f.showInMenu,
      showInHome: f.showInHome,
      metaTitle: f.metaTitle,
      metaDescription: f.metaDescription,
    };
    const res = f._id ? await adminUpdateCategory(f._id, payload) : await adminCreateCategory(payload);
    setSaving(false);
    if (res.ok) {
      toast.ok(f._id ? "Category updated." : "Category added.");
      setEditor(null);
      load();
    } else {
      toast.fail(res.message || "Save failed.");
    }
  }

  async function toggleActive(c: AdminCategory) {
    const res = await adminUpdateCategory(c._id, { isActive: !c.isActive });
    if (res.ok) load();
    else toast.fail(res.message || "Update failed.");
  }

  async function remove(c: AdminCategory) {
    const kids = cats.filter((x) => parentId(x) === c._id).length;
    const warn = kids ? `\n\nThis will also delete ${kids} sub-categor${kids === 1 ? "y" : "ies"}.` : "";
    if (!confirm(`Delete "${c.name}"?${warn}`)) return;
    const res = await adminDeleteCategory(c._id);
    if (res.ok) { toast.ok("Category deleted."); load(); }
    else toast.fail(res.message || "Delete failed.");
  }

  function exportCsv() {
    downloadCsv(`categories-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Level", "Name", "Slug", "Parent", "Products", "Order", "Active", "In menu"],
      ...tree.map(({ cat, depth }) => [
        depth, cat.name, cat.slug || "",
        typeof cat.parent === "object" && cat.parent ? cat.parent.name : "",
        cat.productCount ?? 0, cat.order ?? 0, cat.isActive ? "Yes" : "No", cat.showInMenu ? "Yes" : "No",
      ]),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories & Menu"
        desc="The nested category tree that builds your header menu and category pages."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!tree.length}>
              <Icon d={ICONS.download} /> Export CSV
            </Button>
            <Button onClick={() => setEditor({ ...blank })}><Icon d={ICONS.plus} /> Add category</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total categories" value={String(counts.total)} hint={`${counts.root} top level`} />
        <Stat label="Sub-categories" value={String(counts.sub)} tone="blue" hint={`${counts.deep} third level`} />
        <Stat label="Products mapped" value={String(counts.products)} tone="green" />
        <Stat label="Hidden" value={String(cats.filter((c) => !c.isActive).length)} tone="amber" hint="not shown on site" />
      </div>

      <div className="rounded-xl border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"><Icon d={ICONS.search} /></span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories…" className="pl-9" />
          </div>
          <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="all">All levels</option>
            <option value="0">Top level</option>
            <option value="1">Sub-category</option>
            <option value="2">Third level</option>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white">
        {loading ? (
          <TableSkeleton rows={7} cols={5} />
        ) : tree.length === 0 ? (
          <EmptyState
            Icon={FolderTree}
            title="No categories yet"
            desc="Create your first category to build the storefront menu."
            action={<Button onClick={() => setEditor({ ...blank })}><Icon d={ICONS.plus} /> Add category</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Slug</th>
                  <th className="px-4 py-3 font-semibold">Products</th>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Visibility</th>
                  <th className="px-4 py-3 font-semibold">Added</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tree.map(({ cat, depth }) => (
                  <tr key={cat._id} className="border-b border-line last:border-0 hover:bg-page/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3" style={{ paddingLeft: depth * 22 }}>
                        {depth > 0 && <span className="text-ink-soft">↳</span>}
                        {cat.image || cat.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cat.image || cat.icon} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-line object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-page text-xs font-bold text-ink-soft">
                            {cat.name[0]?.toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{cat.name}</p>
                          <p className="text-xs text-ink-soft">
                            {depth === 0 ? "Top level" : depth === 1 ? "Sub-category" : "Third level"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-page px-1.5 py-0.5 text-xs text-ink-soft">{cat.slug}</code>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products?category=${cat._id}`} className="font-semibold text-ink hover:text-brand">
                        {cat.productCount ?? 0}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{cat.order ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={cat.isActive ? "green" : "slate"}>{cat.isActive ? "Active" : "Hidden"}</Badge>
                        {cat.showInMenu && <Badge tone="blue">Menu</Badge>}
                        {cat.isFeatured && <Badge tone="brand">Featured</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{shortDate(cat.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleActive(cat)}
                          title={cat.isActive ? "Hide" : "Show"}
                          className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-ink"
                        >
                          <Icon d={ICONS.eye} />
                        </button>
                        <button
                          onClick={() =>
                            setEditor({
                              _id: cat._id,
                              name: cat.name,
                              description: cat.description || "",
                              parent: parentId(cat),
                              order: cat.order ?? 0,
                              image: cat.image || "",
                              icon: cat.icon || "",
                              banner: cat.banner || "",
                              isActive: cat.isActive !== false,
                              isFeatured: Boolean(cat.isFeatured),
                              showInMenu: cat.showInMenu !== false,
                              showInHome: cat.showInHome !== false,
                              metaTitle: cat.metaTitle || "",
                              metaDescription: cat.metaDescription || "",
                            })
                          }
                          title="Edit"
                          className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-brand"
                        >
                          <Icon d={ICONS.edit} />
                        </button>
                        <button onClick={() => remove(cat)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                          <Icon d={ICONS.trash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && (
        <CategoryEditor
          initial={editor}
          cats={cats}
          saving={saving}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
      <Toast msg={toast.msg} />
    </div>
  );
}

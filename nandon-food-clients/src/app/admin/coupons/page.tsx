"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TicketPercent } from "lucide-react";
import {
  adminGetCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon, type Coupon,
} from "@/lib/admin";
import {
  Badge, Button, Card, Checkbox, EmptyState, Field, Icon, ICONS, Input, Modal, PageHeader,
  Select, Stat, TableSkeleton, Textarea, Toast, useToast, bdt, downloadCsv, isoDate, shortDate,
} from "@/components/admin/ui";

type FormState = {
  _id?: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  maxDiscount: string;
  minOrderAmount: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
};

const blank: FormState = {
  code: "", description: "", discountType: "percentage", discountValue: "",
  maxDiscount: "", minOrderAmount: "0", usageLimit: "", expiresAt: "", isActive: true,
};

function statusOf(c: Coupon): { label: string; tone: "green" | "amber" | "red" | "slate" } {
  if (!c.isActive) return { label: "Disabled", tone: "slate" };
  if (new Date(c.expiresAt) < new Date()) return { label: "Expired", tone: "red" };
  if (c.usageLimit && (c.usedCount ?? 0) >= c.usageLimit) return { label: "Limit reached", tone: "amber" };
  return { label: "Active", tone: "green" };
}

/* ── Editor ───────────────────────────────────────────────────────── */
function CouponEditor({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [err, setErr] = useState("");
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.code.trim()) return setErr("Coupon code is required.");
    if (f.discountValue === "" || Number(f.discountValue) <= 0) return setErr("Enter a discount value greater than 0.");
    if (f.discountType === "percentage" && Number(f.discountValue) > 100) return setErr("Percentage cannot be more than 100.");
    if (!f.expiresAt) return setErr("Please choose an expiry date.");
    setErr("");
    onSave(f);
  }

  const preview =
    f.discountType === "percentage"
      ? `${f.discountValue || 0}% off${f.maxDiscount ? `, up to ${bdt(Number(f.maxDiscount))}` : ""}`
      : `${bdt(Number(f.discountValue) || 0)} off`;

  return (
    <Modal
      title={f._id ? "Edit coupon" : "Create coupon"}
      desc="Customers type this code at checkout — the discount applies instantly."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : f._id ? "Save changes" : "Create coupon"}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Coupon code" required hint="Case-insensitive — stored in capitals.">
            <Input
              value={f.code}
              onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
              placeholder="EIDSPECIAL"
              className="font-mono uppercase"
            />
          </Field>
          <Field label="Expiry date" required>
            <Input type="date" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} min={isoDate()} />
          </Field>
        </div>

        <Field label="Description" hint="Internal only — helps you remember what it was for.">
          <Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Eid campaign — 10% off orders above ৳1000" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount type">
            <Select value={f.discountType} onChange={(e) => set("discountType", e.target.value as "percentage" | "fixed")}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (৳)</option>
            </Select>
          </Field>
          <Field label={f.discountType === "percentage" ? "Discount %" : "Discount amount (৳)"} required>
            <Input type="number" value={f.discountValue} onChange={(e) => set("discountValue", e.target.value)} placeholder={f.discountType === "percentage" ? "10" : "200"} />
          </Field>
          {f.discountType === "percentage" && (
            <Field label="Maximum discount (৳)" hint="Caps a percentage coupon. Leave blank for no cap.">
              <Input type="number" value={f.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="500" />
            </Field>
          )}
          <Field label="Minimum order amount (৳)" hint="0 means any order qualifies.">
            <Input type="number" value={f.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} />
          </Field>
          <Field label="Usage limit" hint="Total times it can be used. Blank = unlimited.">
            <Input type="number" value={f.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="unlimited" />
          </Field>
        </div>

        <div className="rounded-lg bg-brand-tint px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-dark">Customers will see</p>
          <p className="mt-0.5 font-display text-lg font-extrabold text-brand-dark">
            {f.code || "CODE"} — {preview}
          </p>
          {Number(f.minOrderAmount) > 0 && (
            <p className="text-xs text-brand-dark">on orders of {bdt(Number(f.minOrderAmount))} or more</p>
          )}
        </div>

        <Checkbox checked={f.isActive} onChange={(v) => set("isActive", v)} label="Active" hint="uncheck to pause without deleting" />

        {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}
      </div>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function AdminCouponsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<FormState | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminGetCoupons();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);

  const list = useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((c) => c.code.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q));
    }
    if (filter !== "all") out = out.filter((c) => statusOf(c).label.toLowerCase().replace(" ", "-") === filter);
    return out;
  }, [rows, search, filter]);

  const stats = useMemo(() => {
    const active = rows.filter((c) => statusOf(c).label === "Active").length;
    const used = rows.reduce((n, c) => n + (c.usedCount ?? 0), 0);
    const expired = rows.filter((c) => statusOf(c).label === "Expired").length;
    return { active, used, expired };
  }, [rows]);

  async function save(f: FormState) {
    setSaving(true);
    const payload: Record<string, unknown> = {
      code: f.code.trim().toUpperCase(),
      description: f.description,
      discountType: f.discountType,
      discountValue: Number(f.discountValue),
      minOrderAmount: Number(f.minOrderAmount) || 0,
      expiresAt: new Date(f.expiresAt).toISOString(),
      isActive: f.isActive,
    };
    if (f.discountType === "percentage" && f.maxDiscount !== "") payload.maxDiscount = Number(f.maxDiscount);
    if (f.usageLimit !== "") payload.usageLimit = Number(f.usageLimit);

    const res = f._id ? await adminUpdateCoupon(f._id, payload) : await adminCreateCoupon(payload);
    setSaving(false);
    if (res.ok) { toast.ok(f._id ? "Coupon updated." : "Coupon created."); setEditor(null); load(); }
    else toast.fail(res.message || "Save failed.");
  }

  async function toggle(c: Coupon) {
    const res = await adminUpdateCoupon(c._id!, { isActive: !c.isActive });
    if (res.ok) load();
    else toast.fail(res.message || "Update failed.");
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}? Orders that already used it are unaffected.`)) return;
    const res = await adminDeleteCoupon(c._id!);
    if (res.ok) { toast.ok("Coupon deleted."); load(); }
    else toast.fail(res.message || "Delete failed.");
  }

  function exportCsv() {
    downloadCsv(`coupons-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Code", "Type", "Value", "Max discount", "Min order", "Used", "Limit", "Expires", "Status"],
      ...list.map((c) => [
        c.code, c.discountType, c.discountValue, c.maxDiscount ?? "", c.minOrderAmount ?? 0,
        c.usedCount ?? 0, c.usageLimit ?? "unlimited", shortDate(c.expiresAt), statusOf(c).label,
      ]),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coupons"
        desc="Discount codes customers can apply at checkout."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!list.length}><Icon d={ICONS.download} /> Export CSV</Button>
            <Button onClick={() => setEditor({ ...blank })}><Icon d={ICONS.plus} /> Create coupon</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total coupons" value={String(rows.length)} />
        <Stat label="Active now" value={String(stats.active)} tone="green" hint="usable at checkout" />
        <Stat label="Times used" value={String(stats.used)} tone="blue" />
        <Stat label="Expired" value={String(stats.expired)} tone="red" />
      </div>

      <div className="rounded-xl border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"><Icon d={ICONS.search} /></span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search coupon code…" className="pl-9" />
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All coupons</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="limit-reached">Limit reached</option>
            <option value="disabled">Disabled</option>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : list.length === 0 ? (
          <EmptyState
            Icon={TicketPercent}
            title="No coupons yet"
            desc="Create a discount code and it works on the checkout page right away."
            action={<Button onClick={() => setEditor({ ...blank })}><Icon d={ICONS.plus} /> Create coupon</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Discount</th>
                  <th className="px-4 py-3 font-semibold">Min order</th>
                  <th className="px-4 py-3 font-semibold">Usage</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const st = statusOf(c);
                  const usedPct = c.usageLimit ? Math.min(100, Math.round(((c.usedCount ?? 0) / c.usageLimit) * 100)) : 0;
                  return (
                    <tr key={c._id} className="border-b border-line last:border-0 hover:bg-page/60">
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm font-bold tracking-wide text-ink">{c.code}</p>
                        {c.description && <p className="line-clamp-1 text-xs text-ink-soft">{c.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-ink">
                          {c.discountType === "percentage" ? `${c.discountValue}%` : bdt(c.discountValue)}
                        </span>
                        {c.discountType === "percentage" && c.maxDiscount ? (
                          <p className="text-xs text-ink-soft">max {bdt(c.maxDiscount)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{c.minOrderAmount ? bdt(c.minOrderAmount) : "—"}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">
                          {c.usedCount ?? 0}{c.usageLimit ? ` / ${c.usageLimit}` : ""}
                        </p>
                        {c.usageLimit ? (
                          <span className="mt-1 block h-1.5 w-20 overflow-hidden rounded-full bg-page">
                            <span className="block h-full rounded-full bg-brand" style={{ width: `${usedPct}%` }} />
                          </span>
                        ) : (
                          <p className="text-xs text-ink-soft">unlimited</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{shortDate(c.expiresAt)}</td>
                      <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggle(c)} title={c.isActive ? "Disable" : "Enable"} className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-ink">
                            <Icon d={ICONS.eye} />
                          </button>
                          <button
                            onClick={() =>
                              setEditor({
                                _id: c._id,
                                code: c.code,
                                description: c.description || "",
                                discountType: c.discountType,
                                discountValue: String(c.discountValue),
                                maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : "",
                                minOrderAmount: String(c.minOrderAmount ?? 0),
                                usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
                                expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
                                isActive: c.isActive !== false,
                              })
                            }
                            title="Edit"
                            className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-brand"
                          >
                            <Icon d={ICONS.edit} />
                          </button>
                          <button onClick={() => remove(c)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
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
        )}
      </div>

      <Card title="How coupons work" desc="For reference.">
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-soft">
          <li>Shoppers enter the code in the <b>Coupon code</b> box on the checkout page — it validates live against these rules.</li>
          <li>Admins can also apply a coupon when raising a manual invoice under <b>Orders → Create invoice</b>.</li>
          <li>The usage counter goes up only when an order is actually placed, not when the code is merely checked.</li>
          <li>Percentage coupons never discount more than the cap, and never more than the order subtotal.</li>
        </ul>
      </Card>

      {editor && <CouponEditor initial={editor} saving={saving} onSave={save} onClose={() => setEditor(null)} />}
      <Toast msg={toast.msg} />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { FileQuestion } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminGetOrder, adminUpdateOrder, adminUpdateOrderStatus, adminUpdatePaymentStatus,
  adminAddOrderNote, adminDeleteOrder,
  ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, SALES_CHANNELS,
  type AdminOrder, type SalesChannel,
} from "@/lib/admin";
import {
  Badge, Button, Card, EmptyState, Field, Icon, ICONS, Input, PageHeader, Select, Stat,
  TableSkeleton, Textarea, Toast, useToast, bdt, longDate, shortDate,
} from "@/components/admin/ui";

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "red" | "indigo" | "slate"> = {
  pending: "amber", confirmed: "blue", processing: "blue",
  shipped: "indigo", delivered: "green", cancelled: "red", returned: "red",
};

const CHANNEL_LABEL: Record<string, string> = { online: "Online Sales", corporate: "Corporate Sales", direct: "Direct Sales" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [o, setO] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [status, setStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [note, setNote] = useState("");

  // Invoice-level editable fields
  const [edit, setEdit] = useState({
    salesChannel: "online" as SalesChannel,
    paymentMethod: "cod",
    paymentStatus: "pending",
    paidAmount: "0",
    shippingCost: "0",
    manualDiscount: "0",
    vat: "0",
    transactionId: "",
    trackingNumber: "",
    carrier: "",
  });
  const [corporate, setCorporate] = useState({ companyName: "", contactPerson: "", designation: "", binNo: "", tinNo: "", poNumber: "" });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await adminGetOrder(id);
    setO(data);
    if (data) {
      setStatus(data.status);
      setEdit({
        salesChannel: (data.salesChannel || "online") as SalesChannel,
        paymentMethod: data.paymentMethod || "cod",
        paymentStatus: data.paymentStatus || "pending",
        paidAmount: String(data.paidAmount ?? 0),
        shippingCost: String(data.shippingCost ?? 0),
        manualDiscount: String(data.manualDiscount ?? 0),
        vat: String(data.vat ?? 0),
        transactionId: data.transactionId || "",
        trackingNumber: data.trackingNumber || "",
        carrier: data.carrier || "",
      });
      setCorporate({
        companyName: data.corporate?.companyName || "",
        contactPerson: data.corporate?.contactPerson || "",
        designation: data.corporate?.designation || "",
        binNo: data.corporate?.binNo || "",
        tinNo: data.corporate?.tinNo || "",
        poNumber: data.corporate?.poNumber || "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);

  async function saveStatus() {
    if (!o) return;
    setBusy(true);
    const res = await adminUpdateOrderStatus(o._id, status, statusNote);
    setBusy(false);
    if (res.ok) { toast.ok(`Status set to ${status}.`); setStatusNote(""); load(); }
    else toast.fail(res.message || "Could not update status.");
  }

  async function saveInvoice() {
    if (!o) return;
    setBusy(true);
    const res = await adminUpdateOrder(o._id, {
      salesChannel: edit.salesChannel,
      paymentMethod: edit.paymentMethod,
      paymentStatus: edit.paymentStatus,
      paidAmount: Number(edit.paidAmount) || 0,
      shippingCost: Number(edit.shippingCost) || 0,
      manualDiscount: Number(edit.manualDiscount) || 0,
      vat: Number(edit.vat) || 0,
      transactionId: edit.transactionId,
      trackingNumber: edit.trackingNumber,
      carrier: edit.carrier,
      corporate: edit.salesChannel === "corporate" ? corporate : undefined,
    });
    setBusy(false);
    if (res.ok) { toast.ok("Invoice updated."); load(); }
    else toast.fail(res.message || "Update failed.");
  }

  async function markPaid() {
    if (!o) return;
    setBusy(true);
    const res = await adminUpdatePaymentStatus(o._id, "paid");
    if (res.ok) await adminUpdateOrder(o._id, { paidAmount: o.total });
    setBusy(false);
    if (res.ok) { toast.ok("Marked as fully paid."); load(); }
    else toast.fail(res.message || "Update failed.");
  }

  async function addNote() {
    if (!o || !note.trim()) return;
    setBusy(true);
    const res = await adminAddOrderNote(o._id, note.trim());
    setBusy(false);
    if (res.ok) { toast.ok("Note added."); setNote(""); load(); }
    else toast.fail(res.message || "Could not add note.");
  }

  async function remove() {
    if (!o) return;
    if (!confirm(`Delete order ${o.orderId}?`)) return;
    const res = await adminDeleteOrder(o._id);
    if (res.ok) router.push("/admin/orders");
    else toast.fail(res.message || "Delete failed.");
  }

  if (loading) return <div className="rounded-xl border border-line bg-white"><TableSkeleton rows={7} cols={4} /></div>;
  if (!o) return <EmptyState Icon={FileQuestion} title="Order not found" desc="It may have been deleted." />;

  const due = Math.max(0, o.total - (o.paidAmount ?? 0));
  const addr = o.shippingAddress;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={o.invoiceNo || o.orderId}
        desc={`${o.orderId} · placed ${longDate(o.createdAt)} · ${CHANNEL_LABEL[o.salesChannel || "online"]}`}
        actions={
          <>
            <Link href="/admin/orders"><Button variant="outline"><Icon d={ICONS.back} /> Back</Button></Link>
            <Link href={`/admin/orders/${o._id}/invoice`}><Button variant="outline"><Icon d={ICONS.print} /> Invoice</Button></Link>
            <Button variant="danger" onClick={remove}><Icon d={ICONS.trash} /> Delete</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Order total" value={bdt(o.total)} hint={`${o.items?.length ?? 0} items`} />
        <Stat label="Received" value={bdt(o.paidAmount ?? 0)} tone="green" hint={o.paymentMethod?.toUpperCase()} />
        <Stat label="Due" value={bdt(due)} tone={due > 0 ? "red" : "green"} hint={due > 0 ? "outstanding" : "settled"} />
        <Stat label="Status" value={o.status} tone={due > 0 ? "amber" : "green"} hint={o.paymentStatus} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Items */}
          <Card title="Items" bodyClass="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase text-ink-soft">
                    <th className="px-5 py-2.5 font-semibold">Product</th>
                    <th className="px-5 py-2.5 font-semibold">Unit price</th>
                    <th className="px-5 py-2.5 font-semibold">Qty</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items?.map((it, i) => (
                    <tr key={it._id || i} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={it.thumbnail} alt="" className="h-10 w-10 rounded-lg border border-line object-cover" />
                          <div>
                            <p className="font-medium text-ink">{it.name}</p>
                            {(it.color || it.size) && (
                              <p className="text-xs text-ink-soft">{[it.color, it.size].filter(Boolean).join(" / ")}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{bdt(it.price)}</td>
                      <td className="px-5 py-3 text-ink-soft">{it.quantity}</td>
                      <td className="px-5 py-3 text-right font-semibold text-ink">{bdt(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line px-5 py-4">
              <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-semibold text-ink">{bdt(o.subtotal)}</dd></div>
                {o.discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Coupon {o.couponCode ? `(${o.couponCode})` : ""}</dt><dd className="font-semibold text-green-600">− {bdt(o.discount)}</dd></div>}
                {(o.manualDiscount ?? 0) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Extra discount</dt><dd className="font-semibold text-green-600">− {bdt(o.manualDiscount)}</dd></div>}
                <div className="flex justify-between"><dt className="text-ink-soft">Delivery{o.deliveryZone ? ` (${o.deliveryZone})` : ""}</dt><dd className="font-semibold text-ink">{bdt(o.shippingCost)}</dd></div>
                {(o.vat ?? 0) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">VAT / Tax</dt><dd className="font-semibold text-ink">{bdt(o.vat)}</dd></div>}
                <div className="flex justify-between border-t border-line pt-1.5 text-base"><dt className="font-bold text-ink">Total</dt><dd className="font-display font-extrabold text-brand">{bdt(o.total)}</dd></div>
              </dl>
            </div>
          </Card>

          {/* Customer */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Card title="Customer">
              <dl>
                <Row label="Name" value={addr?.fullName || "—"} />
                <Row label="Phone" value={addr?.phone || "—"} />
                <Row label="Email" value={addr?.email || "—"} />
                <Row label="Account" value={o.user ? `${o.user.firstName ?? ""} ${o.user.lastName ?? ""}`.trim() || o.user.email : "Guest / walk-in"} />
              </dl>
            </Card>
            <Card title="Delivery address">
              <p className="text-sm leading-relaxed text-ink">
                {addr?.address}
                {addr?.area ? <><br />{addr.area}</> : null}
                {addr?.city ? <><br />{addr.city}</> : null}
                {addr?.postalCode ? ` - ${addr.postalCode}` : ""}
              </p>
              {(o.trackingNumber || o.carrier) && (
                <p className="mt-3 rounded-lg bg-page px-3 py-2 text-xs text-ink-soft">
                  Tracking: <b className="text-ink">{o.trackingNumber || "—"}</b> · {o.carrier || "—"}
                </p>
              )}
            </Card>
          </div>

          {/* Timeline */}
          <Card title="Timeline" desc="Everything that happened to this order.">
            {!o.timeline?.length ? (
              <p className="py-4 text-center text-sm text-ink-soft">No activity recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {[...o.timeline].reverse().map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0 flex-1 border-b border-line pb-3 last:border-0">
                      <p className="text-sm font-semibold capitalize text-ink">{t.status?.replace(/_/g, " ")}</p>
                      {t.note && <p className="text-sm text-ink-soft">{t.note}</p>}
                      <p className="mt-0.5 text-xs text-ink-soft">{longDate(t.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-4 border-t border-line pt-4">
              <Field label="Add an internal note">
                <div className="flex gap-2">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Customer asked to deliver after 5pm…" />
                  <Button variant="dark" onClick={addNote} disabled={busy || !note.trim()}>Add</Button>
                </div>
              </Field>
            </div>
          </Card>
        </div>

        {/* Side actions */}
        <div className="space-y-5">
          <Card title="Order status">
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[o.status] ?? "slate"}>{o.status}</Badge>
                <Badge tone={o.paymentStatus === "paid" ? "green" : "amber"}>{o.paymentStatus}</Badge>
              </div>
              <Field label="Change status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </Select>
              </Field>
              <Field label="Note (optional)">
                <Textarea rows={2} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Handed to courier…" />
              </Field>
              <Button onClick={saveStatus} disabled={busy || status === o.status}>Update status</Button>
              {due > 0 && (
                <Button variant="outline" onClick={markPaid} disabled={busy}>Mark fully paid ({bdt(due)})</Button>
              )}
            </div>
          </Card>

          <Card title="Invoice settings" desc="Channel, payment and charges.">
            <div className="grid gap-3.5">
              <Field label="Sales channel">
                <Select value={edit.salesChannel} onChange={(e) => setEdit({ ...edit, salesChannel: e.target.value as SalesChannel })}>
                  {SALES_CHANNELS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment method">
                  <Select value={edit.paymentMethod} onChange={(e) => setEdit({ ...edit, paymentMethod: e.target.value })}>
                    {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </Select>
                </Field>
                <Field label="Payment status">
                  <Select value={edit.paymentStatus} onChange={(e) => setEdit({ ...edit, paymentStatus: e.target.value })}>
                    {PAYMENT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </Select>
                </Field>
                <Field label="Received (৳)">
                  <Input type="number" value={edit.paidAmount} onChange={(e) => setEdit({ ...edit, paidAmount: e.target.value })} />
                </Field>
                <Field label="Delivery (৳)">
                  <Input type="number" value={edit.shippingCost} onChange={(e) => setEdit({ ...edit, shippingCost: e.target.value })} />
                </Field>
                <Field label="Extra discount (৳)">
                  <Input type="number" value={edit.manualDiscount} onChange={(e) => setEdit({ ...edit, manualDiscount: e.target.value })} />
                </Field>
                <Field label="VAT (৳)">
                  <Input type="number" value={edit.vat} onChange={(e) => setEdit({ ...edit, vat: e.target.value })} />
                </Field>
              </div>
              <Field label="Transaction / cheque no">
                <Input value={edit.transactionId} onChange={(e) => setEdit({ ...edit, transactionId: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tracking no">
                  <Input value={edit.trackingNumber} onChange={(e) => setEdit({ ...edit, trackingNumber: e.target.value })} />
                </Field>
                <Field label="Carrier">
                  <Input value={edit.carrier} onChange={(e) => setEdit({ ...edit, carrier: e.target.value })} />
                </Field>
              </div>

              {edit.salesChannel === "corporate" && (
                <div className="grid gap-3 rounded-lg bg-page p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Corporate details</p>
                  <Field label="Company"><Input value={corporate.companyName} onChange={(e) => setCorporate({ ...corporate, companyName: e.target.value })} /></Field>
                  <Field label="Contact person"><Input value={corporate.contactPerson} onChange={(e) => setCorporate({ ...corporate, contactPerson: e.target.value })} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="BIN"><Input value={corporate.binNo} onChange={(e) => setCorporate({ ...corporate, binNo: e.target.value })} /></Field>
                    <Field label="TIN"><Input value={corporate.tinNo} onChange={(e) => setCorporate({ ...corporate, tinNo: e.target.value })} /></Field>
                  </div>
                  <Field label="PO number"><Input value={corporate.poNumber} onChange={(e) => setCorporate({ ...corporate, poNumber: e.target.value })} /></Field>
                </div>
              )}

              <Button onClick={saveInvoice} disabled={busy}>Save invoice details</Button>
            </div>
          </Card>

          {o.paymentDetails?.transactionId && (
            <Card title="Customer payment info">
              <dl>
                <Row label="Sender number" value={o.paymentDetails.senderNumber || "—"} />
                <Row label="Transaction ID" value={o.paymentDetails.transactionId || "—"} />
                <Row label="Paid at" value={o.paymentDetails.paymentTime || "—"} />
              </dl>
            </Card>
          )}

          {o.note && (
            <Card title="Customer note">
              <p className="text-sm text-ink-soft">{o.note}</p>
            </Card>
          )}

          <Card title="Meta">
            <dl>
              <Row label="Invoice no" value={o.invoiceNo || "—"} />
              <Row label="Invoice date" value={shortDate(o.invoiceDate || o.createdAt)} />
              <Row label="Source" value={o.orderSource === "admin" ? "Manual (admin)" : "Website"} />
              <Row label="Coupon" value={o.couponCode || "—"} />
            </dl>
          </Card>
        </div>
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
}

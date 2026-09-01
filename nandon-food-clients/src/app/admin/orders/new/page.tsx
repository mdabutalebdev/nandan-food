"use client";

/**
 * Manual invoice — the admin-side order book.
 * The sales channel picked at the top (Corporate / Online / Direct) decides
 * which invoice series the order lands in and what shows on the printed sheet.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminGetProducts, adminCreateManualOrder, adminGetSettings, SALES_CHANNELS, PAYMENT_METHODS, ORDER_STATUSES, PAYMENT_STATUSES, type SalesChannel, type DeliveryZone } from "@/lib/admin";
import { validateCoupon } from "@/lib/api";
import type { Product } from "@/lib/types";
import {
  Button, Card, Checkbox, Field, Icon, ICONS, Input, PageHeader, Select, Textarea, Toast, useToast, bdt, isoDate,
} from "@/components/admin/ui";

type Line = {
  key: string;
  productId: string;
  name: string;
  thumbnail: string;
  price: number;      // editable unit price
  listPrice: number;  // the catalogue price, for reference
  quantity: number;
  color: string;
  size: string;
};

const uid = () => `l_${Math.random().toString(36).slice(2, 9)}`;

export default function NewOrderPage() {
  const router = useRouter();
  const toast = useToast();

  const [channel, setChannel] = useState<SalesChannel>("direct");
  const [customer, setCustomer] = useState({ fullName: "", phone: "", email: "", address: "", area: "", city: "" });
  const [corporate, setCorporate] = useState({ companyName: "", contactPerson: "", designation: "", binNo: "", tinNo: "", poNumber: "" });
  const [lines, setLines] = useState<Line[]>([]);
  const [createAccount, setCreateAccount] = useState(false);

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [shippingCost, setShippingCost] = useState("0");
  const [manualDiscount, setManualDiscount] = useState("0");
  const [vat, setVat] = useState("0");

  const [coupon, setCoupon] = useState("");
  const [couponInfo, setCouponInfo] = useState<{ ok: boolean; text: string; discount: number } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paidAmount, setPaidAmount] = useState("0");
  const [transactionId, setTransactionId] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [invoiceDate, setInvoiceDate] = useState(isoDate());
  const [note, setNote] = useState("");

  // Product search
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminGetSettings().then((s) => {
      const z = (s?.deliveryZones as DeliveryZone[]) || [];
      const active = z.filter((x) => x.active !== false);
      setZones(active);
      const def = active.find((x) => x.isDefault) || active[0];
      if (def) { setZoneName(def.name); setShippingCost(String(def.charge ?? 0)); }
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await adminGetProducts({ searchTerm: q.trim(), limit: 8 });
      setResults(res.rows);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  function addLine(p: Product) {
    setLines((ls) => {
      const found = ls.find((l) => l.productId === p._id && !l.color && !l.size);
      if (found) return ls.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...ls,
        {
          key: uid(),
          productId: p._id,
          name: p.name,
          thumbnail: p.thumbnail,
          price: p.price,
          listPrice: p.price,
          quantity: 1,
          color: "",
          size: "",
        },
      ];
    });
    setQ("");
    setResults([]);
  }

  const patchLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const subtotal = useMemo(() => lines.reduce((n, l) => n + l.price * l.quantity, 0), [lines]);
  const couponDiscount = couponInfo?.ok ? couponInfo.discount : 0;
  const total = Math.max(
    0,
    subtotal - couponDiscount - (Number(manualDiscount) || 0) + (Number(shippingCost) || 0) + (Number(vat) || 0),
  );
  const due = Math.max(0, total - (Number(paidAmount) || 0));

  async function checkCoupon() {
    if (!coupon.trim()) return;
    setCouponBusy(true);
    const res = await validateCoupon(coupon.trim(), subtotal);
    setCouponBusy(false);
    if (res.ok && res.data) {
      setCouponInfo({ ok: true, text: `Applied — saves ${bdt(res.data.discount)}`, discount: res.data.discount });
    } else {
      setCouponInfo({ ok: false, text: res.message || "Invalid coupon.", discount: 0 });
    }
  }

  function pickZone(name: string) {
    setZoneName(name);
    const z = zones.find((x) => x.name === name);
    if (z) setShippingCost(String(z.charge ?? 0));
  }

  async function save() {
    setErr("");
    if (!customer.fullName.trim() || !customer.phone.trim()) return setErr("Customer name and phone are required.");
    if (!customer.address.trim()) return setErr("Delivery / billing address is required.");
    if (lines.length === 0) return setErr("Add at least one product to the invoice.");
    if (channel === "corporate" && !corporate.companyName.trim()) return setErr("Company name is required for a corporate sale.");

    const payload = {
      salesChannel: channel,
      shippingAddress: {
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim(),
        address: customer.address.trim(),
        area: customer.area.trim(),
        city: customer.city.trim() || zoneName,
      },
      corporate: channel === "corporate" ? corporate : undefined,
      items: lines.map((l) => ({
        product: l.productId,
        quantity: l.quantity,
        price: l.price,
        color: l.color,
        size: l.size,
      })),
      couponCode: couponInfo?.ok ? coupon.trim() : undefined,
      manualDiscount: Number(manualDiscount) || 0,
      vat: Number(vat) || 0,
      shippingCost: Number(shippingCost) || 0,
      deliveryZone: zoneName,
      paymentMethod,
      paymentStatus,
      paidAmount: Number(paidAmount) || 0,
      transactionId,
      status,
      invoiceDate,
      note,
      createAccount,
    };

    setSaving(true);
    const res = await adminCreateManualOrder(payload);
    setSaving(false);

    if (!res.ok) return setErr(res.message || "Could not create the invoice.");
    toast.ok("Invoice created.");
    const id = (res.data as { _id?: string })?._id;
    setTimeout(() => router.push(id ? `/admin/orders/${id}/invoice` : "/admin/orders"), 500);
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Create invoice"
        desc="Raise an order by hand — corporate, direct counter sale or a phone order."
        actions={
          <>
            <Link href="/admin/orders"><Button variant="outline"><Icon d={ICONS.back} /> Back to orders</Button></Link>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create invoice"}</Button>
          </>
        }
      />

      {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-medium text-brand-dark">{err}</div>}

      {/* Sales channel */}
      <Card title="Sales channel" desc="Decides the invoice series and how this sale is reported.">
        <div className="grid gap-3 sm:grid-cols-3">
          {SALES_CHANNELS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setChannel(c.value)}
              className={`rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                channel === c.value ? "border-brand bg-brand-tint" : "border-line hover:border-brand"
              }`}
            >
              <span className="block text-sm font-bold text-ink">{c.label}</span>
              <span className="mt-0.5 block text-xs text-ink-soft">{c.hint}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Customer */}
          <Card title="Customer details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <Input value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} placeholder="Rahim Uddin" />
              </Field>
              <Field label="Phone" required>
                <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="01XXXXXXXXX" />
              </Field>
              <Field label="Email">
                <Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="optional" />
              </Field>
              <Field label="City / District">
                <Input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="Dhaka" />
              </Field>
              <Field label="Address" required className="sm:col-span-2">
                <Textarea rows={2} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="House, road, area…" />
              </Field>
              <Field label="Area / Thana">
                <Input value={customer.area} onChange={(e) => setCustomer({ ...customer, area: e.target.value })} />
              </Field>
              <div className="flex items-end">
                <Checkbox
                  checked={createAccount}
                  onChange={setCreateAccount}
                  label="Create a customer account"
                  hint="lets them track the order online"
                />
              </div>
            </div>
          </Card>

          {/* Corporate block */}
          {channel === "corporate" && (
            <Card title="Corporate details" desc="Printed on the invoice header.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company name" required>
                  <Input value={corporate.companyName} onChange={(e) => setCorporate({ ...corporate, companyName: e.target.value })} />
                </Field>
                <Field label="Contact person">
                  <Input value={corporate.contactPerson} onChange={(e) => setCorporate({ ...corporate, contactPerson: e.target.value })} />
                </Field>
                <Field label="Designation">
                  <Input value={corporate.designation} onChange={(e) => setCorporate({ ...corporate, designation: e.target.value })} />
                </Field>
                <Field label="PO number">
                  <Input value={corporate.poNumber} onChange={(e) => setCorporate({ ...corporate, poNumber: e.target.value })} />
                </Field>
                <Field label="BIN">
                  <Input value={corporate.binNo} onChange={(e) => setCorporate({ ...corporate, binNo: e.target.value })} />
                </Field>
                <Field label="TIN">
                  <Input value={corporate.tinNo} onChange={(e) => setCorporate({ ...corporate, tinNo: e.target.value })} />
                </Field>
              </div>
            </Card>
          )}

          {/* Products */}
          <Card title="Products" desc="Search the catalogue, then adjust quantity or negotiate the unit price.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"><Icon d={ICONS.search} /></span>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products by name…" className="pl-9" />
              {(results.length > 0 || searching) && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
                  {searching && <p className="px-4 py-3 text-sm text-ink-soft">Searching…</p>}
                  {results.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => addLine(p)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-page"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumbnail} alt="" className="h-9 w-9 rounded border border-line object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                        <span className="block text-xs text-ink-soft">{bdt(p.price)} · stock {p.stock ?? 0}</span>
                      </span>
                      <Icon d={ICONS.plus} className="h-4 w-4 text-brand" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="mt-5 rounded-lg border border-dashed border-line py-8 text-center text-sm text-ink-soft">
                No products added yet — search above to build the invoice.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase text-ink-soft">
                      <th className="py-2 font-semibold">Product</th>
                      <th className="py-2 font-semibold">Variant</th>
                      <th className="py-2 font-semibold">Unit price</th>
                      <th className="py-2 font-semibold">Qty</th>
                      <th className="py-2 text-right font-semibold">Total</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.key} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l.thumbnail} alt="" className="h-9 w-9 rounded border border-line object-cover" />
                            <span className="text-sm font-medium text-ink">{l.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="flex gap-1.5">
                            <Input value={l.color} onChange={(e) => patchLine(l.key, { color: e.target.value })} placeholder="Colour" className="!w-24 !py-1.5 !text-xs" />
                            <Input value={l.size} onChange={(e) => patchLine(l.key, { size: e.target.value })} placeholder="Size" className="!w-20 !py-1.5 !text-xs" />
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Input
                            type="number"
                            value={l.price}
                            onChange={(e) => patchLine(l.key, { price: Number(e.target.value) })}
                            className="!w-24 !py-1.5 !text-xs"
                          />
                          {l.price !== l.listPrice && (
                            <span className="mt-0.5 block text-[10px] text-ink-soft">list {bdt(l.listPrice)}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Input
                            type="number"
                            min={1}
                            value={l.quantity}
                            onChange={(e) => patchLine(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className="!w-20 !py-1.5 !text-xs"
                          />
                        </td>
                        <td className="py-2.5 text-right font-semibold text-ink">{bdt(l.price * l.quantity)}</td>
                        <td className="py-2.5 pl-2 text-right">
                          <button
                            onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                            className="rounded-md p-1.5 text-ink-soft hover:bg-red-50 hover:text-red-600"
                          >
                            <Icon d={ICONS.trash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Payment & status">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Payment method">
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className="uppercase">{m}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Payment status">
                <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount received (৳)" hint="Leave 0 for a fully credit sale.">
                <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </Field>
              <Field label="Transaction / cheque no">
                <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
              </Field>
              <Field label="Order status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Invoice date">
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </Field>
              <Field label="Note" className="sm:col-span-2 lg:col-span-3">
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery instructions, terms…" />
              </Field>
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-5">
          <Card title="Charges">
            <div className="grid gap-4">
              <Field label="Delivery zone">
                <Select value={zoneName} onChange={(e) => pickZone(e.target.value)}>
                  <option value="">— none —</option>
                  {zones.map((z) => (
                    <option key={z.name} value={z.name}>{z.name} · {bdt(z.charge)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Delivery charge (৳)">
                <Input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
              </Field>
              <Field label="Extra discount (৳)">
                <Input type="number" value={manualDiscount} onChange={(e) => setManualDiscount(e.target.value)} />
              </Field>
              <Field label="VAT / Tax (৳)">
                <Input type="number" value={vat} onChange={(e) => setVat(e.target.value)} />
              </Field>
              <Field label="Coupon code">
                <div className="flex gap-2">
                  <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="SAVE10" />
                  <Button variant="dark" onClick={checkCoupon} disabled={couponBusy || !lines.length}>
                    {couponBusy ? "…" : "Apply"}
                  </Button>
                </div>
                {couponInfo && (
                  <p className={`mt-1.5 text-xs ${couponInfo.ok ? "text-green-600" : "text-brand-dark"}`}>{couponInfo.text}</p>
                )}
              </Field>
            </div>
          </Card>

          <Card title="Invoice summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-semibold text-ink">{bdt(subtotal)}</dd></div>
              {couponDiscount > 0 && (
                <div className="flex justify-between"><dt className="text-ink-soft">Coupon</dt><dd className="font-semibold text-green-600">− {bdt(couponDiscount)}</dd></div>
              )}
              {Number(manualDiscount) > 0 && (
                <div className="flex justify-between"><dt className="text-ink-soft">Extra discount</dt><dd className="font-semibold text-green-600">− {bdt(Number(manualDiscount))}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-ink-soft">Delivery{zoneName ? ` (${zoneName})` : ""}</dt><dd className="font-semibold text-ink">{bdt(Number(shippingCost) || 0)}</dd></div>
              {Number(vat) > 0 && (
                <div className="flex justify-between"><dt className="text-ink-soft">VAT / Tax</dt><dd className="font-semibold text-ink">{bdt(Number(vat))}</dd></div>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="font-display font-extrabold text-brand">{bdt(total)}</dd>
              </div>
              <div className="flex justify-between"><dt className="text-ink-soft">Received</dt><dd className="font-semibold text-green-700">{bdt(Number(paidAmount) || 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Due</dt><dd className={`font-semibold ${due > 0 ? "text-red-600" : "text-green-600"}`}>{bdt(due)}</dd></div>
            </dl>

            <Button onClick={save} disabled={saving} className="mt-5 w-full">
              {saving ? "Creating…" : "Create invoice"}
            </Button>
            <p className="mt-2 text-center text-xs text-ink-soft">
              Saves the order and opens the printable invoice.
            </p>
          </Card>
        </div>
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
}

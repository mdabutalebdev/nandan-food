"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, PartyPopper } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getSiteContent, validateCoupon, placeOrder } from "@/lib/api";
import { taka } from "@/lib/format";

type PayMethod = "cod" | "bkash" | "nagad" | "rocket";
/** One delivery zone as configured in Admin → Settings → Delivery charges. */
type Zone = { name: string; charge: number; note?: string; isDefault?: boolean; active?: boolean };
type PayCfg = {
  bkash?: { number?: string; accountType?: string };
  nagad?: { number?: string; accountType?: string };
  rocket?: { number?: string; accountType?: string };
  instructions?: string;
};

const field = "w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white";

function Stepper({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="inline-flex items-center rounded-md border border-line">
      <button onClick={onDec} className="flex h-7 w-7 items-center justify-center text-ink-soft hover:text-brand" aria-label="Decrease">
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 10h10" strokeLinecap="round" /></svg>
      </button>
      <span className="w-7 text-center text-xs font-bold text-ink">{value}</span>
      <button onClick={onInc} className="flex h-7 w-7 items-center justify-center text-ink-soft hover:text-brand" aria-label="Increase">
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 5v10M5 10h10" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, setQty, removeItem, clear } = useCart();

  const [form, setForm] = useState({ fullName: "", phone: "", email: "", address: "", area: "", city: "" });
  const [zoneName, setZoneName] = useState("");
  const [payment, setPayment] = useState<PayMethod>("cod");
  const [txn, setTxn] = useState({ senderNumber: "", transactionId: "" });
  const [note, setNote] = useState("");

  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const [zones, setZones] = useState<Zone[]>([]);
  const [freeAbove, setFreeAbove] = useState(0);
  const [payCfg, setPayCfg] = useState<PayCfg | null>(null);

  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getSiteContent().then((d) => {
      // Admin-managed zones first; fall back to the legacy inside/outside pair.
      const dz = (d?.deliveryZones as Zone[] | undefined)?.filter((z) => z.active !== false) ?? [];
      const list: Zone[] = dz.length
        ? dz
        : (() => {
            const dc = d?.deliveryCharge as { insideDhaka?: number; outsideDhaka?: number } | undefined;
            return [
              { name: "Inside Dhaka", charge: dc?.insideDhaka ?? 60, isDefault: true },
              { name: "Outside Dhaka", charge: dc?.outsideDhaka ?? 120 },
            ];
          })();
      setZones(list);
      const def = list.find((z) => z.isDefault) || list[0];
      if (def) setZoneName(def.name);
      setFreeAbove(Number(d?.freeDeliveryAbove) || 0);
      if (d?.payment) setPayCfg(d.payment as PayCfg);
    });
  }, []);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const discount = applied?.discount ?? 0;
  const payable = Math.max(0, subtotal - discount);
  const selectedZone = zones.find((z) => z.name === zoneName);
  const freeDelivery = freeAbove > 0 && payable >= freeAbove;
  const shipping = freeDelivery ? 0 : selectedZone?.charge ?? 0;
  const total = payable + shipping;

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setCouponBusy(true);
    setCouponMsg(null);
    const res = await validateCoupon(coupon.trim(), subtotal);
    setCouponBusy(false);
    if (res.ok && res.data) {
      setApplied({ code: res.data.coupon?.code || coupon.trim().toUpperCase(), discount: res.data.discount });
      setCouponMsg({ ok: true, text: `Coupon applied — you saved ${taka(res.data.discount)}.` });
    } else {
      setApplied(null);
      setCouponMsg({ ok: false, text: res.message || "Invalid coupon." });
    }
  }

  async function place() {
    setErr("");
    if (!form.fullName.trim() || !form.phone.trim() || !form.address.trim()) {
      return setErr("Please fill in your name, phone and address.");
    }
    if (zones.length > 0 && !zoneName) {
      return setErr("Please choose your delivery area.");
    }
    if (payment !== "cod" && !txn.transactionId.trim()) {
      return setErr("Please enter the transaction ID for your mobile payment.");
    }

    const payload = {
      shippingAddress: {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        area: form.area.trim(),
        city: form.city.trim() || zoneName,
      },
      deliveryZone: zoneName,
      items: items.map((i) => ({ product: i.productId, quantity: i.quantity, color: i.color, size: i.size })),
      paymentMethod: payment,
      paymentDetails: payment !== "cod" ? { senderNumber: txn.senderNumber.trim(), transactionId: txn.transactionId.trim() } : undefined,
      couponCode: applied?.code,
      note: note.trim(),
    };

    setPlacing(true);
    const res = await placeOrder(payload);
    setPlacing(false);

    if (res.ok) {
      const data = res.data as { order?: { orderId?: string }; orderId?: string; accessToken?: string; user?: unknown } | undefined;
      const orderId = data?.order?.orderId || data?.orderId || "";
      // Auto-login when the guest checkout created an account.
      if (data?.accessToken) {
        try {
          localStorage.setItem("nandon_token", data.accessToken);
          if (data.user) localStorage.setItem("nandon_user", JSON.stringify(data.user));
        } catch {}
      }
      clear();
      router.push(`/order-success?oid=${encodeURIComponent(orderId)}`);
    } else {
      setErr(res.message || "Could not place the order. Please try again.");
    }
  }

  if (items.length === 0) {
    return (
      <div className="frame py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-page text-ink-soft"><ShoppingCart size={34} strokeWidth={1.5} /></div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-1 text-ink-soft">Add some products before checking out.</p>
        <Link href="/products" className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
          Browse products
        </Link>
      </div>
    );
  }

  const mobileNumbers: Record<Exclude<PayMethod, "cod">, string | undefined> = {
    bkash: payCfg?.bkash?.number,
    nagad: payCfg?.nagad?.number,
    rocket: payCfg?.rocket?.number,
  };

  return (
    <div className="frame py-6">
      <h1 className="mb-5 font-display text-2xl font-extrabold text-ink sm:text-3xl">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ── Form ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Contact + shipping */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-ink">Delivery details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.fullName} onChange={upd("fullName")} placeholder="Full name *" className={field} />
              <input value={form.phone} onChange={upd("phone")} placeholder="Phone (01XXXXXXXXX) *" className={field} />
              <input value={form.email} onChange={upd("email")} placeholder="Email (optional)" className={`${field} sm:col-span-2`} />
              <textarea value={form.address} onChange={upd("address")} rows={2} placeholder="Full address *" className={`${field} resize-none sm:col-span-2`} />
              <input value={form.area} onChange={upd("area")} placeholder="Area / Thana (optional)" className={field} />
              <input value={form.city} onChange={upd("city")} placeholder="City / District" className={field} />
            </div>

            {/* Delivery zone — rates come from Admin → Settings → Delivery charges */}
            <p className="mb-2 mt-5 text-sm font-semibold text-ink">Delivery area</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {zones.map((z) => (
                <button
                  key={z.name}
                  type="button"
                  onClick={() => setZoneName(z.name)}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                    zoneName === z.name ? "border-brand bg-brand-tint" : "border-line hover:border-brand"
                  }`}
                >
                  <span className="text-left">
                    <span className="block font-semibold text-ink">{z.name}</span>
                    {z.note && <span className="block text-xs text-ink-soft">{z.note}</span>}
                  </span>
                  <span className="font-bold text-brand">
                    {freeDelivery ? <span className="text-green-600">Free</span> : taka(z.charge)}
                  </span>
                </button>
              ))}
            </div>
            {freeAbove > 0 && !freeDelivery && (
              <p className="mt-2 text-xs text-ink-soft">
                Add {taka(freeAbove - payable)} more to get <b className="text-green-600">free delivery</b>.
              </p>
            )}
            {freeDelivery && (
              <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                <PartyPopper size={14} strokeWidth={1.75} /> You have free delivery on this order.
              </p>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-ink">Payment method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { k: "cod", label: "Cash on Delivery", desc: "Pay when you receive" },
                { k: "bkash", label: "bKash", desc: "Send money & submit TrxID" },
                { k: "nagad", label: "Nagad", desc: "Send money & submit TrxID" },
                { k: "rocket", label: "Rocket", desc: "Send money & submit TrxID" },
              ] as const).map((p) => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setPayment(p.k)}
                  className={`flex flex-col rounded-lg border px-4 py-3 text-left transition-colors ${
                    payment === p.k ? "border-brand bg-brand-tint" : "border-line hover:border-brand"
                  }`}
                >
                  <span className="text-sm font-bold text-ink">{p.label}</span>
                  <span className="text-xs text-ink-soft">{p.desc}</span>
                </button>
              ))}
            </div>

            {payment !== "cod" && (
              <div className="mt-4 rounded-lg bg-page p-4">
                {mobileNumbers[payment] ? (
                  <p className="text-sm text-ink">
                    Send money to <b className="text-brand">{mobileNumbers[payment]}</b>
                    {payCfg?.[payment]?.accountType ? ` (${payCfg[payment]?.accountType})` : ""}, then enter the details below.
                  </p>
                ) : (
                  <p className="text-sm text-ink-soft">Enter your payment details below.</p>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input value={txn.senderNumber} onChange={(e) => setTxn((t) => ({ ...t, senderNumber: e.target.value }))} placeholder="Your number" className={field} />
                  <input value={txn.transactionId} onChange={(e) => setTxn((t) => ({ ...t, transactionId: e.target.value }))} placeholder="Transaction ID *" className={field} />
                </div>
              </div>
            )}
          </section>

          {/* Note */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-3 font-display text-lg font-bold text-ink">Order note (optional)</h2>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Any instructions for delivery…" className={`${field} resize-none`} />
          </section>
        </div>

        {/* ── Summary ──────────────────────────────────────── */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-ink">Order summary</h2>

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={`${it.productId}-${it.variantId || ""}`} className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.thumbnail} alt={it.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-ink">{it.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <Stepper value={it.quantity} onDec={() => setQty(it.productId, it.quantity - 1, it.variantId)} onInc={() => setQty(it.productId, it.quantity + 1, it.variantId)} />
                      <span className="text-sm font-bold text-ink">{taka(it.price * it.quantity)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeItem(it.productId, it.variantId)} aria-label="Remove" className="shrink-0 text-ink-soft hover:text-red-600">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="mt-4 border-t border-line pt-4">
              <div className="flex gap-2">
                <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className={`${field} flex-1`} />
                <button onClick={applyCoupon} disabled={couponBusy} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
                  {couponBusy ? "…" : "Apply"}
                </button>
              </div>
              {couponMsg && <p className={`mt-1.5 text-xs ${couponMsg.ok ? "text-green-600" : "text-brand-dark"}`}>{couponMsg.text}</p>}
            </div>

            {/* Totals */}
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-semibold text-ink">{taka(subtotal)}</dd></div>
              {discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="font-semibold text-green-600">− {taka(discount)}</dd></div>}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery{zoneName ? ` (${zoneName})` : ""}</dt>
                <dd className={`font-semibold ${freeDelivery ? "text-green-600" : "text-ink"}`}>
                  {freeDelivery ? "Free" : taka(shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base"><dt className="font-bold text-ink">Total</dt><dd className="font-display font-extrabold text-brand">{taka(total)}</dd></div>
            </dl>

            {err && <div className="mt-4 rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}

            <button
              onClick={place}
              disabled={placing}
              className="mt-4 w-full rounded-full bg-brand py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {placing ? "Placing order…" : `Place order · ${taka(total)}`}
            </button>
            <p className="mt-2 text-center text-xs text-ink-soft">100% Halal · Fresh & frozen · Delivered with care</p>
          </div>
        </div>
      </div>
    </div>
  );
}

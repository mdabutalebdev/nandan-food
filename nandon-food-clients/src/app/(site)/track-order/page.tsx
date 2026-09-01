"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Truck, Search, Phone, MessageCircle } from "lucide-react";
import { trackOrder } from "@/lib/api";
import { taka } from "@/lib/format";
import { statusMeta, TRACK_STEPS, stepIndex, type StoreOrder } from "@/lib/order-ui";

const field = "w-full rounded-lg border border-line bg-page px-4 py-3 text-sm outline-none focus:border-brand focus:bg-white";

function Tracker({ status }: { status: string }) {
  const cancelled = status === "cancelled" || status === "returned";
  const idx = stepIndex(status);
  const reached = status === "delivered" ? TRACK_STEPS.length - 1 : idx;

  if (cancelled) {
    return <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">This order was {statusMeta(status).label.toLowerCase()}.</div>;
  }
  return (
    <div className="flex items-center">
      {TRACK_STEPS.map((step, i) => {
        const done = i <= reached;
        const current = i === reached;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${done ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft"} ${current ? "ring-4 ring-brand-tint" : ""}`}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={step.icon} /></svg>
              </span>
              <span className={`mt-1.5 max-w-[72px] text-center text-[10px] font-semibold leading-tight ${done ? "text-ink" : "text-ink-soft"}`}>{step.label}</span>
            </div>
            {i < TRACK_STEPS.length - 1 && <span className={`mx-1 mb-5 h-0.5 flex-1 rounded-full ${i < reached ? "bg-brand" : "bg-line"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function TrackOrderInner() {
  const params = useSearchParams();
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState<StoreOrder | null>(null);

  async function run(oid: string, ph: string) {
    if (!oid.trim() || !ph.trim()) return setErr("Please enter both your Order ID and phone number.");
    setErr(""); setLoading(true); setOrder(null);
    const res = await trackOrder(oid.trim(), ph.trim());
    setLoading(false);
    if (res.ok && res.data) setOrder(res.data as StoreOrder);
    else setErr(res.message || "No order found with those details.");
  }

  // Prefill + auto-run when arriving from the order-success page (?oid=…).
  useEffect(() => {
    const oid = params.get("oid");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from the URL query
    if (oid) setOrderId(oid);
  }, [params]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); run(orderId, phone); };
  const st = order ? statusMeta(order.status) : null;
  const addr = order?.shippingAddress;

  return (
    <div className="frame py-8 lg:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-tint text-brand">
            <Truck size={26} strokeWidth={1.75} />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">Track your order</h1>
          <p className="mt-1 text-ink-soft">Enter your Order ID and the phone number you ordered with.</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mx-auto mt-6 max-w-xl rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Order ID</label>
              <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. DOM-0007" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className={field} />
            </div>
          </div>
          {err && <div className="mt-3 rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}
          <button type="submit" disabled={loading} className="mt-4 w-full rounded-full bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
            {loading ? "Searching…" : "Track order"}
          </button>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Have an account? <Link href="/account/orders" className="font-semibold text-brand hover:underline">See all your orders</Link>
          </p>
        </form>

        {/* Result */}
        {order && (
          <div className="mt-8 space-y-5">
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-bold text-ink">{order.orderId}</p>
                  <p className="text-xs text-ink-soft">
                    Placed {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
                {st && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>}
              </div>

              <Tracker status={order.status} />

              {/* Courier tracking — live status once the parcel is handed to a courier */}
              {order.trackingNumber ? (
                <div className="mt-5 rounded-xl border border-line bg-page p-4">
                  <p className="text-sm font-semibold text-ink">Courier tracking</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Carrier: <b className="text-ink">{order.carrier || "Courier"}</b> · Consignment:{" "}
                    <b className="text-ink">{order.trackingNumber}</b>
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Live courier status (Steadfast / Pathao) will appear here once integration is enabled.
                  </p>
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-page px-4 py-3 text-center text-xs text-ink-soft">
                  A courier tracking number will show here once your order ships.
                </p>
              )}
            </div>

            {/* Items + summary */}
            <div className="grid gap-5 sm:grid-cols-[1fr_260px]">
              <div className="rounded-2xl border border-line bg-white">
                <h2 className="border-b border-line px-5 py-3 font-display font-bold text-ink">Items</h2>
                <ul className="divide-y divide-line">
                  {order.items?.map((it, i) => (
                    <li key={it._id || i} className="flex items-center gap-3 px-5 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.thumbnail} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-ink">{it.name}</p>
                        <p className="text-xs text-ink-soft">Qty {it.quantity} × {taka(it.price)}</p>
                      </div>
                      <span className="text-sm font-semibold text-ink">{taka(it.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-white p-5">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-semibold text-ink">{taka(order.subtotal)}</dd></div>
                    {order.discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="font-semibold text-green-600">− {taka(order.discount)}</dd></div>}
                    <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd className="font-semibold text-ink">{taka(order.shippingCost)}</dd></div>
                    <div className="flex justify-between border-t border-line pt-1.5 text-base"><dt className="font-bold text-ink">Total</dt><dd className="font-display font-extrabold text-brand">{taka(order.total)}</dd></div>
                  </dl>
                </div>
                {addr && (
                  <div className="rounded-2xl border border-line bg-white p-5">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Deliver to</p>
                    <p className="text-sm font-medium text-ink">{addr.fullName}</p>
                    <p className="text-sm text-ink-soft">{addr.address}{addr.city ? `, ${addr.city}` : ""}</p>
                    <p className="text-sm text-ink-soft">{addr.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help */}
        {!order && (
          <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { Icon: Search, t: "Find your Order ID", d: "It's in your confirmation and starts with DOM-." },
              { Icon: Phone, t: "Same phone", d: "Use the number you placed the order with." },
              { Icon: MessageCircle, t: "Need help?", d: "Contact us and we'll sort it out." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-xl border border-line bg-white p-5 text-center">
                <span className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tint text-brand">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <p className="text-sm font-semibold text-ink">{t}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="frame py-24 text-center text-ink-soft">Loading…</div>}>
      <TrackOrderInner />
    </Suspense>
  );
}

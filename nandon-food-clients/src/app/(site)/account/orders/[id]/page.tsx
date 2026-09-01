"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PackageX } from "lucide-react";
import { getMyOrder, cancelMyOrder } from "@/lib/api";
import { taka } from "@/lib/format";
import { statusMeta, TRACK_STEPS, stepIndex, type StoreOrder } from "@/lib/order-ui";

function OrderTracker({ status }: { status: string }) {
  const cancelled = status === "cancelled" || status === "returned";
  const idx = stepIndex(status);
  const reached = status === "delivered" ? TRACK_STEPS.length - 1 : idx;

  if (cancelled) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        This order was {statusMeta(status).label.toLowerCase()}.
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {TRACK_STEPS.map((step, i) => {
        const done = i <= reached;
        const current = i === reached;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                  done ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft"
                } ${current ? "ring-4 ring-brand-tint" : ""}`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={step.icon} /></svg>
              </span>
              <span className={`mt-1.5 max-w-[70px] text-center text-[10px] font-semibold leading-tight ${done ? "text-ink" : "text-ink-soft"}`}>
                {step.label}
              </span>
            </div>
            {i < TRACK_STEPS.length - 1 && (
              <span className={`mx-1 mb-5 h-0.5 flex-1 rounded-full ${i < reached ? "bg-brand" : "bg-line"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    getMyOrder(id, ctrl.signal).then((d) => {
      setOrder(d as StoreOrder | null);
      setLoading(false);
    });
    return () => ctrl.abort();
  }, [id]);

  async function cancel() {
    if (!order) return;
    if (!confirm("Cancel this order?")) return;
    setBusy(true);
    const res = await cancelMyOrder(order._id);
    setBusy(false);
    if (res.ok) {
      setMsg("Your order has been cancelled.");
      const fresh = await getMyOrder(order._id);
      setOrder(fresh as StoreOrder);
    } else {
      setMsg(res.message || "Could not cancel this order.");
    }
  }

  if (loading) return <div className="rounded-2xl border border-line bg-white py-24 text-center text-ink-soft">Loading order…</div>;
  if (!order) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand">
          <PackageX size={22} strokeWidth={1.75} />
        </span>
        <p className="mt-4 font-semibold text-ink">Order not found</p>
        <Link href="/account/orders" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">← Back to my orders</Link>
      </div>
    );
  }

  const st = statusMeta(order.status);
  const addr = order.shippingAddress;
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const placed = order.createdAt ? new Date(order.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm font-semibold text-brand hover:underline">← My orders</Link>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{order.orderId}</h1>
          <p className="text-sm text-ink-soft">Placed {placed}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      {msg && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{msg}</div>}

      {/* Tracker */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <OrderTracker status={order.status} />
        {order.trackingNumber && (
          <p className="mt-4 rounded-lg bg-page px-4 py-2.5 text-sm text-ink-soft">
            Courier: <b className="text-ink">{order.carrier || "—"}</b> · Tracking: <b className="text-ink">{order.trackingNumber}</b>
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-white">
            <h2 className="border-b border-line px-5 py-3.5 font-display font-bold text-ink">Items</h2>
            <ul className="divide-y divide-line">
              {order.items?.map((it, i) => {
                const slug = typeof it.product === "object" ? it.product?.slug : undefined;
                const row = (
                  <div className="flex items-center gap-4 px-5 py-3.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-medium text-ink">{it.name}</p>
                      <p className="text-xs text-ink-soft">
                        {[it.color, it.size].filter(Boolean).join(" / ") || "—"} · Qty {it.quantity} × {taka(it.price)}
                      </p>
                    </div>
                    <span className="font-semibold text-ink">{taka(it.total)}</span>
                  </div>
                );
                return <li key={it._id || i}>{slug ? <Link href={`/product/${slug}`} className="block hover:bg-page/60">{row}</Link> : row}</li>;
              })}
            </ul>
          </div>

          {order.timeline && order.timeline.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="mb-4 font-display font-bold text-ink">Order timeline</h2>
              <ol className="space-y-3">
                {[...order.timeline].reverse().filter((t) => !["admin_note", "updated"].includes(t.status)).map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    <div>
                      <p className="text-sm font-semibold capitalize text-ink">{statusMeta(t.status).label !== t.status ? statusMeta(t.status).label : t.status.replace(/_/g, " ")}</p>
                      {t.note && <p className="text-sm text-ink-soft">{t.note}</p>}
                      <p className="text-xs text-ink-soft">{t.createdAt ? new Date(t.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Summary + address */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-3 font-display font-bold text-ink">Payment summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-semibold text-ink">{taka(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="font-semibold text-green-600">− {taka(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-soft">Delivery{order.deliveryZone ? ` (${order.deliveryZone})` : ""}</dt><dd className="font-semibold text-ink">{taka(order.shippingCost)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base"><dt className="font-bold text-ink">Total</dt><dd className="font-display font-extrabold text-brand">{taka(order.total)}</dd></div>
            </dl>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-page px-3 py-2 text-xs">
              <span className="text-ink-soft">Payment</span>
              <span className="font-semibold uppercase text-ink">{order.paymentMethod} · {order.paymentStatus}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-3 font-display font-bold text-ink">Delivery address</h2>
            <p className="text-sm text-ink">{addr?.fullName}</p>
            <p className="text-sm text-ink-soft">{addr?.phone}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {addr?.address}{addr?.area ? `, ${addr.area}` : ""}{addr?.city ? `, ${addr.city}` : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/track-order" className="rounded-full border border-line py-2.5 text-center text-sm font-semibold text-ink hover:border-brand hover:text-brand">
              Track this order
            </Link>
            {canCancel && (
              <button onClick={cancel} disabled={busy} className="rounded-full border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                {busy ? "Cancelling…" : "Cancel order"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

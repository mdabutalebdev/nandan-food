"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function Success() {
  const oid = useSearchParams().get("oid");
  return (
    <div className="frame py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ink">Thank you for your order!</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your order has been placed successfully. We’ll call to confirm and deliver it fresh.
        </p>

        {oid && (
          <div className="mt-5 rounded-xl bg-page px-4 py-3">
            <p className="text-xs text-ink-soft">Your Order ID</p>
            <p className="font-display text-lg font-bold text-brand">{oid}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/track-order" className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
            Track order
          </Link>
          <Link href="/products" className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="frame py-16 text-center text-ink-soft">Loading…</div>}>
      <Success />
    </Suspense>
  );
}

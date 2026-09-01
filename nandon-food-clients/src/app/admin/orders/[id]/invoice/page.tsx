"use client";

/**
 * Printable invoice.
 * Company details, the VAT/BIN line and the footer text all come from
 * Settings → Invoice, and the sales channel picked on the order is printed in
 * the header so Corporate / Online / Direct books stay distinguishable.
 */

import { useEffect, useState } from "react";
import { FileQuestion } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminGetOrder, adminGetSettings, type AdminOrder } from "@/lib/admin";
import { Button, EmptyState, Icon, ICONS, TableSkeleton, bdt, shortDate } from "@/components/admin/ui";
import { site } from "@/lib/site";

type InvoiceCfg = {
  companyName?: string;
  addressLine?: string;
  phone?: string;
  email?: string;
  website?: string;
  binNo?: string;
  tinNo?: string;
  logoUrl?: string;
  footerNote?: string;
  terms?: string;
};

const CHANNEL_LABEL: Record<string, string> = {
  online: "ONLINE SALES",
  corporate: "CORPORATE SALES",
  direct: "DIRECT SALES",
};

/* ── Amount in words (Indian numbering, taka) ─────────────────────── */
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

function inWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "Zero Taka Only";
  const parts: string[] = [];
  const units: [number, string][] = [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"], [100, "Hundred"]];
  for (const [value, name] of units) {
    if (n >= value) {
      const count = Math.floor(n / value);
      parts.push(`${count >= 100 ? inWords(count).replace(" Taka Only", "") : twoDigits(count)} ${name}`);
      n %= value;
    }
  }
  if (n > 0) parts.push(twoDigits(n));
  return `${parts.join(" ")} Taka Only`;
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [o, setO] = useState<AdminOrder | null>(null);
  const [cfg, setCfg] = useState<InvoiceCfg>({});
  // Logo shown on the invoice: the invoice-specific one wins, then the site
  // theme logo, then the built-in brand logo — so a logo always appears.
  const [logo, setLogo] = useState<string>(site.logo);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([adminGetOrder(id), adminGetSettings()]).then(([order, settings]) => {
      setO(order);
      const inv = (settings?.invoice as InvoiceCfg) || {};
      const themeLogo = (settings?.theme as { logoUrl?: string } | undefined)?.logoUrl;
      setCfg(inv);
      setLogo(inv.logoUrl || themeLogo || site.logo);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="rounded-xl border border-line bg-white"><TableSkeleton rows={7} cols={4} /></div>;
  if (!o) return <EmptyState Icon={FileQuestion} title="Invoice not found" desc="This order may have been deleted." />;

  const addr = o.shippingAddress;
  const totalDiscount = (o.discount || 0) + (o.manualDiscount || 0);
  const paid = o.paidAmount ?? 0;
  const due = Math.max(0, o.total - paid);
  const channel = o.salesChannel || "online";

  return (
    <div className="space-y-4">
      {/* Toolbar — never printed */}
      <div className="print-hide flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/orders/${o._id}`}>
          <Button variant="outline"><Icon d={ICONS.back} /> Back to order</Button>
        </Link>
        <div className="flex gap-2">
          <Link href="/admin/settings#invoice"><Button variant="outline">Invoice settings</Button></Link>
          <Button onClick={() => window.print()}><Icon d={ICONS.print} /> Print / Save PDF</Button>
        </div>
      </div>

      {/* Sheet */}
      <div className="print-plain print-full mx-auto max-w-4xl rounded-xl border border-line bg-white p-8 text-ink">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink pb-5">
          <div className="flex items-center gap-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={cfg.companyName || "Nandon Foods"} className="h-28 w-28 shrink-0 rounded-lg object-contain" />
            ) : null}
            {/* The logo image carries its own whitespace, so pull the text back
                over that margin to sit snug against the mark. */}
            <div className="-ml-4 leading-tight">
              <h1 className="font-display text-lg font-bold text-ink">{cfg.companyName || "Nandon Foods"}</h1>
              {cfg.addressLine && <p className="mt-0.5 text-xs text-ink-soft">{cfg.addressLine}</p>}
              {[cfg.phone, cfg.email, cfg.website].filter(Boolean).length > 0 && (
                <p className="mt-0.5 text-xs text-ink-soft">
                  {[cfg.phone, cfg.email, cfg.website].filter(Boolean).join(" · ")}
                </p>
              )}
              {(cfg.binNo || cfg.tinNo) && (
                <p className="mt-0.5 text-xs text-ink-soft">
                  {cfg.binNo ? `BIN: ${cfg.binNo}` : ""}{cfg.binNo && cfg.tinNo ? " · " : ""}{cfg.tinNo ? `TIN: ${cfg.tinNo}` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="font-display text-xl font-extrabold uppercase tracking-wide text-brand">Invoice</p>
            <p className="mt-1 inline-block rounded border border-ink px-2 py-0.5 text-[11px] font-bold tracking-wider text-ink">
              {CHANNEL_LABEL[channel]}
            </p>
            <p className="mt-2 text-sm"><span className="text-ink-soft">Invoice no:</span> <b>{o.invoiceNo || o.orderId}</b></p>
            <p className="text-sm"><span className="text-ink-soft">Order ID:</span> <b>{o.orderId}</b></p>
            <p className="text-sm"><span className="text-ink-soft">Date:</span> <b>{shortDate(o.invoiceDate || o.createdAt)}</b></p>
          </div>
        </div>

        {/* Customer + payment */}
        <div className="grid gap-6 border-b border-line py-5 sm:grid-cols-2">
          {/* Customer details */}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">Customer</p>
            {channel === "corporate" && o.corporate?.companyName && (
              <p className="text-sm font-bold text-ink">{o.corporate.companyName}</p>
            )}
            <p className="text-sm font-semibold text-ink">{addr?.fullName}</p>
            {channel === "corporate" && o.corporate?.contactPerson && (
              <p className="text-sm text-ink-soft">
                Attn: {o.corporate.contactPerson}
                {o.corporate.designation ? `, ${o.corporate.designation}` : ""}
              </p>
            )}
            <p className="text-sm text-ink-soft">{addr?.address}</p>
            <p className="text-sm text-ink-soft">{[addr?.area, addr?.city].filter(Boolean).join(", ")}</p>
            <p className="text-sm text-ink-soft">Phone: {addr?.phone}</p>
            {addr?.email && <p className="text-sm text-ink-soft">{addr.email}</p>}
            {channel === "corporate" && (o.corporate?.binNo || o.corporate?.tinNo || o.corporate?.poNumber) && (
              <p className="mt-1 text-xs text-ink-soft">
                {o.corporate.binNo ? `BIN: ${o.corporate.binNo} ` : ""}
                {o.corporate.tinNo ? `TIN: ${o.corporate.tinNo} ` : ""}
                {o.corporate.poNumber ? `PO: ${o.corporate.poNumber}` : ""}
              </p>
            )}
          </div>

          {/* Payment */}
          <div className="sm:text-right">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">Payment</p>
            <p className="text-sm">
              <b className="uppercase">{o.paymentMethod}</b>
              {" · "}
              <span className={o.paymentStatus === "paid" ? "font-bold text-green-700" : "font-bold text-amber-700"}>
                {o.paymentStatus}
              </span>
            </p>
            {o.transactionId && <p className="text-sm text-ink-soft">Txn: {o.transactionId}</p>}
          </div>
        </div>

        {/* Items */}
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-2 font-bold">#</th>
              <th className="py-2 pr-2 font-bold">Description</th>
              <th className="py-2 pr-2 text-right font-bold">Unit price</th>
              <th className="py-2 pr-2 text-right font-bold">Qty</th>
              <th className="py-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {o.items?.map((it, i) => (
              <tr key={it._id || i} className="border-b border-line">
                <td className="py-2.5 pr-2 text-ink-soft">{i + 1}</td>
                <td className="py-2.5 pr-2">
                  <span className="font-medium text-ink">{it.name}</span>
                  {(it.color || it.size) && (
                    <span className="block text-xs text-ink-soft">{[it.color, it.size].filter(Boolean).join(" / ")}</span>
                  )}
                </td>
                <td className="py-2.5 pr-2 text-right">{bdt(it.price)}</td>
                <td className="py-2.5 pr-2 text-right">{it.quantity}</td>
                <td className="py-2.5 text-right font-semibold">{bdt(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-5 flex flex-wrap justify-between gap-6">
          <div className="min-w-[220px] flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Amount in words</p>
            <p className="text-sm font-semibold text-ink">{inWords(o.total)}</p>

            {o.note && (
              <>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">Note</p>
                <p className="text-sm text-ink-soft">{o.note}</p>
              </>
            )}
          </div>

          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-semibold">{bdt(o.subtotal)}</dd></div>
            {totalDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">Discount{o.couponCode ? ` (${o.couponCode})` : ""}</dt>
                <dd className="font-semibold">− {bdt(totalDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery{o.deliveryZone ? ` (${o.deliveryZone})` : ""}</dt>
              <dd className="font-semibold">{bdt(o.shippingCost)}</dd>
            </div>
            {(o.vat ?? 0) > 0 && (
              <div className="flex justify-between"><dt className="text-ink-soft">VAT / Tax</dt><dd className="font-semibold">{bdt(o.vat)}</dd></div>
            )}
            <div className="flex justify-between border-t-2 border-ink pt-1.5 text-base">
              <dt className="font-bold">Grand total</dt>
              <dd className="font-display font-extrabold">{bdt(o.total)}</dd>
            </div>
            <div className="flex justify-between"><dt className="text-ink-soft">Paid</dt><dd className="font-semibold">{bdt(paid)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1.5">
              <dt className="font-bold">Balance due</dt>
              <dd className={`font-bold ${due > 0 ? "text-red-600" : "text-green-700"}`}>{bdt(due)}</dd>
            </div>
          </dl>
        </div>

        {/* Terms + signatures */}
        {cfg.terms && (
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Terms &amp; conditions</p>
            <p className="whitespace-pre-wrap text-xs text-ink-soft">{cfg.terms}</p>
          </div>
        )}

        <div className="mt-12 flex justify-between gap-8">
          <div className="w-48 border-t border-ink pt-1.5 text-center text-xs text-ink-soft">Customer signature</div>
          <div className="w-48 border-t border-ink pt-1.5 text-center text-xs text-ink-soft">
            For {cfg.companyName || "Nandon Foods"}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-ink-soft">{cfg.footerNote || "Thank you for your business."}</p>
      </div>
    </div>
  );
}

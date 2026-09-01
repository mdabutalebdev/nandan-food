"use client";

/**
 * Shared building blocks for the admin panel.
 * Every module page (products, orders, inventory…) is assembled from these so
 * the tables, modals and forms look and behave the same everywhere.
 */

import { useEffect, useState } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

/* ── Money / date ─────────────────────────────────────────────────── */
export const bdt = (n: number | undefined | null) => "৳" + Math.round(Number(n) || 0).toLocaleString("en-IN");
export const num = (n: number | undefined | null, dp = 2) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(dp).replace(/\.?0+$/, "");
};
export const shortDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const longDate = (d?: string | Date | null) =>
  d
    ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
/** YYYY-MM-DD for <input type="date"> */
export const isoDate = (d: Date = new Date()) => d.toISOString().slice(0, 10);

/* ── Form primitives ──────────────────────────────────────────────── */
export const inputCls =
  "w-full rounded-lg border border-line bg-page px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:bg-white disabled:opacity-60";

export function Field({
  label,
  hint,
  required,
  children,
  className = "",
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-ink">
          {label} {required && <span className="text-brand">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${inputCls} ${className}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${inputCls} resize-y ${className}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select {...rest} className={`${inputCls} ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
      />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {hint && <span className="text-ink-soft"> — {hint}</span>}
      </span>
    </label>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────── */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "dark";
  size?: "sm" | "md";
};

export function Button({ variant = "primary", size = "md", className = "", ...rest }: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4.5 py-2.5 text-sm" }[size];
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    outline: "border border-line bg-white text-ink hover:border-brand hover:text-brand",
    ghost: "text-ink-soft hover:bg-page hover:text-ink",
    danger: "bg-red-600 text-white hover:bg-red-700",
    dark: "bg-ink text-white hover:opacity-90",
  }[variant];
  return <button {...rest} className={`${base} ${sizes} ${variants} ${className}`} />;
}

/* ── Page chrome ──────────────────────────────────────────────────── */
export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-ink-soft">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  desc,
  actions,
  children,
  className = "",
  bodyClass = "p-5",
}: {
  title?: string;
  desc?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            {title && <h3 className="font-display font-bold text-ink">{title}</h3>}
            {desc && <p className="text-xs text-ink-soft">{desc}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "green" | "amber" | "blue" | "red" | "slate";
}) {
  const tones = {
    brand: "bg-brand-tint text-brand-dark",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-page text-ink-soft",
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
        <span className={`h-2 w-2 shrink-0 rounded-full ${tones}`} />
      </div>
      <p className="mt-1.5 font-display text-xl font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "blue" | "red" | "slate" | "indigo" | "brand";
}) {
  const tones = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    indigo: "bg-indigo-100 text-indigo-700",
    brand: "bg-brand-tint text-brand-dark",
    slate: "bg-page text-ink-soft",
  }[tone];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${tones}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  Icon = Inbox,
  title,
  desc,
  action,
}: {
  Icon?: LucideIcon;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
      {desc && <p className="mt-1 text-sm text-ink-soft">{desc}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-9 flex-1 animate-pulse rounded bg-page" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────────────────── */
export function Modal({
  title,
  desc,
  onClose,
  children,
  footer,
  width = "max-w-2xl",
}: {
  title: string;
  desc?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className={`my-8 w-full ${width} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
            {desc && <p className="text-xs text-ink-soft">{desc}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-1 text-ink-soft hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Toast ────────────────────────────────────────────────────────── */
export type Msg = { type: "success" | "error"; text: string } | null;

export function useToast() {
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);
  return {
    msg,
    ok: (text: string) => setMsg({ type: "success", text }),
    fail: (text: string) => setMsg({ type: "error", text }),
    clear: () => setMsg(null),
  };
}

export function Toast({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <div
      className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        msg.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
      }`}
    >
      {msg.text}
    </div>
  );
}

/* ── Pagination ───────────────────────────────────────────────────── */
export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) {
    return <p className="px-5 py-3 text-xs text-ink-soft">{total} record{total === 1 ? "" : "s"}</p>;
  }
  const pages: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, from + 4);
  for (let i = from; i <= to; i++) pages.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="text-xs text-ink-soft">
        Page {page} of {totalPages} · {total} records
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              p === page ? "bg-brand text-white" : "border border-line text-ink hover:border-brand"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ── Misc ─────────────────────────────────────────────────────────── */
export function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  print: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  download: "M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  back: "M19 12H5M12 19l-7-7 7-7",
  refresh: "M21 12a9 9 0 1 1-3-6.7M21 3v6h-6",
};

/** Download an array of rows as a CSV file — used by every report table. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

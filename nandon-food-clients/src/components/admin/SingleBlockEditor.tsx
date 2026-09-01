"use client";

import { useEffect, useState } from "react";
import { API_BASE, authSend, uploadImage } from "@/lib/api";

export type BlockField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "image";
  placeholder?: string;
  hint?: string;
  rows?: number;
};

type Values = Record<string, string>;

/* ── Image sub-field ────────────────────────────────────────────────── */
function ImageField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setErr("");
    const url = await uploadImage(f);
    setUploading(false);
    if (url) onChange(url);
    else setErr("Upload failed — check you're logged in as admin and the server is running.");
  }

  return (
    <div>
      {value ? (
        <div className="group relative w-full max-w-xs overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="aspect-[4/3] w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
            <label className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow">
              {uploading ? "Uploading…" : "Change"}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="flex h-36 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint/40">
          {uploading ? (
            <span className="text-sm font-semibold text-brand">Uploading…</span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-semibold">Click to upload</span>
              {hint && <span className="text-xs">{hint}</span>}
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}

/* ── Manager ────────────────────────────────────────────────────────── */
export default function SingleBlockEditor({
  section,
  heading,
  sub,
  fields,
  savedNote = "Saved — now live on the About page.",
}: {
  section: string;
  heading: string;
  sub: string;
  fields: BlockField[];
  savedNote?: string;
}) {
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/site-content`);
        const j = await r.json();
        const obj = (j?.data?.[section] ?? {}) as Record<string, unknown>;
        const v: Values = {};
        for (const f of fields) v[f.key] = (obj[f.key] as string) || "";
        setValues(v);
      } catch {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const set = (key: string, val: string) => {
    setValues((v) => ({ ...v, [key]: val }));
    setDirty(true);
    setMsg(null);
  };

  async function persist() {
    setSaving(true);
    setMsg(null);
    const res = await authSend(`/site-content/${section}`, "PATCH", values);
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setMsg({ type: "success", text: savedNote });
    } else {
      setMsg({ type: "error", text: res.message || "Save failed. Are you logged in as admin?" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">{heading}</h2>
          <p className="text-sm text-ink-soft">{sub}</p>
        </div>
        <button
          onClick={persist}
          disabled={!dirty || saving}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${msg.type === "error" ? "bg-brand-tint text-brand-dark" : "bg-green-50 text-green-700"}`}>
          {msg.text}
        </div>
      )}
      {dirty && !msg && (
        <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          You have unsaved changes — click <b>Save changes</b> to publish.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl space-y-5 rounded-2xl border border-line bg-white p-6">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-sm font-semibold text-ink">{f.label}</label>
              {f.type === "image" ? (
                <ImageField value={values[f.key] || ""} onChange={(url) => set(f.key, url)} hint={f.hint} />
              ) : f.type === "textarea" ? (
                <textarea
                  value={values[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={f.rows || 6}
                  placeholder={f.placeholder}
                  className="w-full resize-y rounded-lg border border-line bg-page px-4 py-2.5 text-sm leading-relaxed outline-none focus:border-brand focus:bg-white"
                />
              ) : (
                <input
                  value={values[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
                />
              )}
              {f.hint && f.type !== "image" && <p className="mt-1 text-xs text-ink-soft">{f.hint}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { API_BASE, authSend, uploadImage } from "@/lib/api";

export type SectionFields = { title?: boolean; description?: boolean; link?: boolean };
export type SectionLabels = Partial<Record<"title" | "description" | "link", string>>;
type Item = { key: string; _id?: string; imageUrl: string; title: string; description: string; link: string; active: boolean };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s_${Math.random().toString(36).slice(2)}`;

const blank = (): Item => ({ key: uid(), imageUrl: "", title: "", description: "", link: "", active: true });

/* ── Add / edit modal ───────────────────────────────────────────────── */
function Editor({
  initial,
  isNew,
  fields,
  labels,
  placeholders,
  imageHint,
  wide,
  onSave,
  onCancel,
}: {
  initial: Item;
  isNew: boolean;
  fields: SectionFields;
  labels: SectionLabels;
  placeholders: SectionLabels;
  imageHint?: string;
  wide: boolean;
  onSave: (it: Item) => void;
  onCancel: () => void;
}) {
  const [it, setIt] = useState<Item>(initial);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setErr("");
    const url = await uploadImage(f);
    setUploading(false);
    if (url) setIt((x) => ({ ...x, imageUrl: url }));
    else setErr("Upload failed — check you're logged in as admin and the server is running.");
  }

  function submit() {
    if (!it.imageUrl) return setErr("Please upload an image.");
    onSave(it);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{isNew ? "Add item" : "Edit item"}</h3>
          <button onClick={onCancel} aria-label="Close" className="text-ink-soft hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Image */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Image</label>
            {it.imageUrl ? (
              <div className={`group relative overflow-hidden rounded-lg border border-line ${wide ? "aspect-[21/9]" : "aspect-[4/3]"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 text-sm font-semibold text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                  {uploading ? "Uploading…" : "Change image"}
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>
              </div>
            ) : (
              <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint/40 ${wide ? "h-32" : "h-40"}`}>
                {uploading ? (
                  <span className="text-sm font-semibold text-brand">Uploading…</span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm font-semibold">Click to upload</span>
                    <span className="text-xs">{imageHint || (wide ? "Wide image (e.g. 1600×640)" : "Square-ish image (e.g. 600×450)")}</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
            )}
          </div>

          {(fields.title || fields.description) && (
            <p className="-mt-1 rounded-lg bg-page px-3 py-2 text-xs text-ink-soft">
              Only the image is required. Leave the text fields empty to show <b>just the image</b>, or fill them in to show text over it.
            </p>
          )}

          {fields.title && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">{labels.title || "Title"} <span className="font-normal text-ink-soft">(optional)</span></label>
              <input
                value={it.title}
                onChange={(e) => setIt((x) => ({ ...x, title: e.target.value }))}
                placeholder={placeholders.title || "e.g. 100% Halal"}
                className="w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
              />
            </div>
          )}

          {fields.description && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">{labels.description || "Description"} <span className="font-normal text-ink-soft">(optional)</span></label>
              <textarea
                value={it.description}
                onChange={(e) => setIt((x) => ({ ...x, description: e.target.value }))}
                rows={3}
                placeholder={placeholders.description || "Short supporting text…"}
                className="w-full resize-none rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
              />
            </div>
          )}

          {fields.link && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">{labels.link || "Link"} (optional)</label>
              <input
                value={it.link}
                onChange={(e) => setIt((x) => ({ ...x, link: e.target.value }))}
                placeholder={placeholders.link || "/products"}
                className="w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
              />
            </div>
          )}

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={it.active}
              onChange={(e) => setIt((x) => ({ ...x, active: e.target.checked }))}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            <span className="font-medium text-ink">Active</span>
            <span className="text-ink-soft">— show it on the site</span>
          </label>

          {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}
        </div>

        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button onClick={onCancel} className="rounded-lg border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-page">
            Cancel
          </button>
          <button onClick={submit} disabled={uploading} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
            {isNew ? "Add item" : "Save item"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Manager ────────────────────────────────────────────────────────── */
export default function SectionManager({
  section,
  heading,
  sub,
  fields,
  preview = "card",
  labels = {},
  placeholders = {},
  imageHint,
  activeHint = "show on the site",
  savedNote = "Saved — now live on the site.",
  addLabel = "Add item",
}: {
  section: string;
  heading: string;
  sub: string;
  fields: SectionFields;
  preview?: "card" | "wide" | "logo";
  labels?: SectionLabels;
  placeholders?: SectionLabels;
  imageHint?: string;
  activeHint?: string;
  savedNote?: string;
  addLabel?: string;
}) {
  const wide = preview === "wide";
  const logo = preview === "logo";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editor, setEditor] = useState<{ item: Item; isNew: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/site-content`);
        const j = await r.json();
        const arr = (j?.data?.[section] ?? []) as Array<Record<string, unknown>>;
        setItems(
          arr.map((s) => ({
            key: uid(),
            _id: s._id as string | undefined,
            imageUrl: (s.imageUrl as string) || "",
            title: (s.title as string) || "",
            description: (s.description as string) || "",
            link: (s.link as string) || "",
            active: s.active !== false,
          })),
        );
      } catch {}
      setLoading(false);
    })();
  }, [section]);

  const mutate = (fn: (a: Item[]) => Item[]) => {
    setItems(fn);
    setDirty(true);
    setMsg(null);
  };
  const move = (idx: number, dir: number) =>
    mutate((a) => {
      const b = [...a];
      const j = idx + dir;
      if (j < 0 || j >= b.length) return b;
      [b[idx], b[j]] = [b[j], b[idx]];
      return b;
    });
  const toggle = (key: string) => mutate((a) => a.map((x) => (x.key === key ? { ...x, active: !x.active } : x)));
  const remove = (key: string) => {
    if (!confirm("Delete this item?")) return;
    mutate((a) => a.filter((x) => x.key !== key));
  };
  const saveItem = (it: Item) => {
    mutate((a) => (a.some((x) => x.key === it.key) ? a.map((x) => (x.key === it.key ? it : x)) : [...a, it]));
    setEditor(null);
  };

  async function persist() {
    setSaving(true);
    setMsg(null);
    const payload = items.map((it, idx) => ({
      ...(it._id ? { _id: it._id } : {}),
      imageUrl: it.imageUrl,
      title: it.title,
      description: it.description,
      link: it.link,
      active: it.active,
      order: idx,
    }));
    const res = await authSend<Record<string, Array<{ _id?: string }>>>(`/site-content/${section}`, "PATCH", payload);
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setMsg({ type: "success", text: savedNote });
      const arr = res.data?.[section];
      if (Array.isArray(arr) && arr.length === items.length) setItems((a) => a.map((it, i) => ({ ...it, _id: arr[i]?._id })));
    } else {
      setMsg({ type: "error", text: res.message || "Save failed. Are you logged in as admin?" });
    }
  }

  const thumb = wide ? "h-14 w-40" : logo ? "h-16 w-24 object-contain bg-white p-1" : "h-16 w-24";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">{heading}</h2>
          <p className="text-sm text-ink-soft">{sub}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditor({ item: blank(), isNew: true })}
            className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            + {addLabel}
          </button>
          <button
            onClick={persist}
            disabled={!dirty || saving}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
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
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand"><ImageIcon size={22} strokeWidth={1.75} /></span>
          <h3 className="mt-4 font-display text-lg font-bold text-ink">Nothing here yet</h3>
          <p className="mt-1 text-sm text-ink-soft">Add your first item — it appears on the homepage instantly.</p>
          <button
            onClick={() => setEditor({ item: blank(), isNew: true })}
            className="mt-5 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark"
          >
            + {addLabel}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it, idx) => (
            <li key={it.key} className="flex items-center gap-4 rounded-xl border border-line bg-white p-3">
              <div className="flex flex-col">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-ink-soft hover:text-brand disabled:opacity-30" aria-label="Move up">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 12l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <span className="text-center text-xs font-bold text-ink-soft">{idx + 1}</span>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="text-ink-soft hover:text-brand disabled:opacity-30" aria-label="Move down">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>

              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt="" className={`${thumb} shrink-0 rounded-lg border border-line ${logo ? "" : "object-cover"}`} />
              ) : (
                <div className={`${thumb} flex shrink-0 items-center justify-center rounded-lg border border-line bg-page text-xs text-ink-soft`}>No image</div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {it.title ? (
                    <span className="truncate font-semibold text-ink">{it.title}</span>
                  ) : (
                    <span className="italic text-ink-soft">Untitled</span>
                  )}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${it.active ? "bg-green-100 text-green-700" : "bg-page text-ink-soft"}`}>
                    {it.active ? "Active" : "Hidden"}
                  </span>
                </div>
                {it.description && <p className="mt-0.5 truncate text-sm text-ink-soft">{it.description}</p>}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => toggle(it.key)} title={it.active ? "Hide" : "Show"} className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-ink">
                  {it.active ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.4 4M6.3 6.3A15 15 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 3-.5" strokeLinecap="round" /></svg>
                  )}
                </button>
                <button onClick={() => setEditor({ item: it, isNew: false })} title="Edit" className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-brand">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button onClick={() => remove(it.key)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editor && <Editor initial={editor.item} isNew={editor.isNew} fields={fields} labels={labels} placeholders={placeholders} imageHint={imageHint} wide={wide} onSave={saveItem} onCancel={() => setEditor(null)} />}
    </div>
  );
}

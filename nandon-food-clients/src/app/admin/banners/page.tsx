"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { API_BASE, authSend, uploadImage } from "@/lib/api";

type Banner = {
  key: string;
  _id?: string;
  type: "image" | "youtube";
  imageUrl: string;
  youtubeUrl: string;
  link: string;
  active: boolean;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b_${Math.random().toString(36).slice(2)}`;
const ytId = (url: string) => {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : "";
};

/* ── Preview of a single banner ─────────────────────────────────────── */
function BannerPreview({ b, className = "" }: { b: Banner; className?: string }) {
  if (b.type === "youtube") {
    const id = ytId(b.youtubeUrl);
    return id ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" className={`object-cover ${className}`} />
    ) : (
      <div className={`flex items-center justify-center bg-page text-xs text-ink-soft ${className}`}>No video</div>
    );
  }
  return b.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={b.imageUrl} alt="" className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-page text-xs text-ink-soft ${className}`}>No image</div>
  );
}

/* ── Add / edit modal ───────────────────────────────────────────────── */
function BannerEditor({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: Banner;
  isNew: boolean;
  onSave: (b: Banner) => void;
  onCancel: () => void;
}) {
  const [b, setB] = useState<Banner>(initial);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setErr("");
    const url = await uploadImage(f);
    setUploading(false);
    if (url) setB((x) => ({ ...x, imageUrl: url, type: "image" }));
    else setErr("Upload failed — check you're logged in as admin and the server is running.");
  }

  function submit() {
    if (b.type === "image" && !b.imageUrl) return setErr("Please upload an image.");
    if (b.type === "youtube" && !ytId(b.youtubeUrl)) return setErr("Please enter a valid YouTube URL.");
    onSave(b);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{isNew ? "Add banner" : "Edit banner"}</h3>
          <button onClick={onCancel} aria-label="Close" className="text-ink-soft hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Type toggle */}
          <div className="flex rounded-full bg-page p-1 text-sm font-semibold">
            {(["image", "youtube"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setB((x) => ({ ...x, type: t }))}
                className={`flex-1 rounded-full py-2 capitalize transition-colors ${
                  b.type === t ? "bg-brand text-white shadow" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t === "image" ? "Image" : "YouTube"}
              </button>
            ))}
          </div>

          {/* Image uploader */}
          {b.type === "image" && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Banner image</label>
              {b.imageUrl ? (
                <div className="group relative overflow-hidden rounded-lg border border-line">
                  <BannerPreview b={b} className="h-40 w-full" />
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 text-sm font-semibold text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                    {uploading ? "Uploading…" : "Change image"}
                    <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                  </label>
                </div>
              ) : (
                <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint/40">
                  {uploading ? (
                    <span className="text-sm font-semibold text-brand">Uploading…</span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-sm font-semibold">Click to upload</span>
                      <span className="text-xs">Wide image works best (e.g. 1600×640)</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>
              )}
            </div>
          )}

          {/* YouTube URL */}
          {b.type === "youtube" && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">YouTube URL</label>
              <input
                value={b.youtubeUrl}
                onChange={(e) => setB((x) => ({ ...x, youtubeUrl: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=…"
                className="w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
              />
              {ytId(b.youtubeUrl) && <BannerPreview b={b} className="mt-3 h-40 w-full rounded-lg border border-line" />}
            </div>
          )}

          {/* Link */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Link (optional)</label>
            <input
              value={b.link}
              onChange={(e) => setB((x) => ({ ...x, link: e.target.value }))}
              placeholder="/category/frozen-product"
              className="w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
            />
            <p className="mt-1 text-xs text-ink-soft">Where the banner goes when clicked. Leave blank for none.</p>
          </div>

          {/* Active */}
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={b.active}
              onChange={(e) => setB((x) => ({ ...x, active: e.target.checked }))}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            <span className="font-medium text-ink">Active</span>
            <span className="text-ink-soft">— show this banner on the homepage</span>
          </label>

          {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}
        </div>

        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button onClick={onCancel} className="rounded-lg border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-page">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={uploading}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {isNew ? "Add banner" : "Save banner"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editor, setEditor] = useState<{ banner: Banner; isNew: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/site-content`);
        const j = await r.json();
        const hs = (j?.data?.heroSlides ?? []) as Array<Record<string, unknown>>;
        setBanners(
          hs.map((s) => ({
            key: uid(),
            _id: s._id as string | undefined,
            type: (s.youtubeUrl ? "youtube" : "image") as "image" | "youtube",
            imageUrl: (s.imageUrl as string) || "",
            youtubeUrl: (s.youtubeUrl as string) || "",
            link: (s.link as string) || "",
            active: s.active !== false,
          })),
        );
      } catch {}
      setLoading(false);
    })();
  }, []);

  const mutate = (fn: (bs: Banner[]) => Banner[]) => {
    setBanners(fn);
    setDirty(true);
    setMsg(null);
  };
  const move = (idx: number, dir: number) =>
    mutate((bs) => {
      const a = [...bs];
      const j = idx + dir;
      if (j < 0 || j >= a.length) return a;
      [a[idx], a[j]] = [a[j], a[idx]];
      return a;
    });
  const toggle = (key: string) => mutate((bs) => bs.map((b) => (b.key === key ? { ...b, active: !b.active } : b)));
  const remove = (key: string) => {
    if (!confirm("Delete this banner?")) return;
    mutate((bs) => bs.filter((b) => b.key !== key));
  };
  const saveEditor = (b: Banner) => {
    mutate((bs) => (bs.some((x) => x.key === b.key) ? bs.map((x) => (x.key === b.key ? b : x)) : [...bs, b]));
    setEditor(null);
  };

  async function persist() {
    setSaving(true);
    setMsg(null);
    const payload = banners.map((b, idx) => ({
      ...(b._id ? { _id: b._id } : {}),
      mediaType: "image",
      imageUrl: b.type === "image" ? b.imageUrl : "",
      youtubeUrl: b.type === "youtube" ? b.youtubeUrl : "",
      videoUrl: "",
      link: b.link,
      active: b.active,
      order: idx,
    }));
    const res = await authSend<{ heroSlides?: Array<{ _id?: string }> }>("/site-content/heroSlides", "PATCH", payload);
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setMsg({ type: "success", text: "Saved — banners are now live on the homepage." });
      const hs = res.data?.heroSlides;
      if (Array.isArray(hs) && hs.length === banners.length) {
        setBanners((bs) => bs.map((b, i) => ({ ...b, _id: hs[i]?._id })));
      }
    } else {
      setMsg({ type: "error", text: res.message || "Save failed. Are you logged in as admin?" });
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Hero Banners</h2>
          <p className="text-sm text-ink-soft">These show in the full-width homepage carousel.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setEditor({ banner: { key: uid(), type: "image", imageUrl: "", youtubeUrl: "", link: "", active: true }, isNew: true })
            }
            className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            + Add banner
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

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-white" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand"><ImageIcon size={22} strokeWidth={1.75} /></span>
          <h3 className="mt-4 font-display text-lg font-bold text-ink">No banners yet</h3>
          <p className="mt-1 text-sm text-ink-soft">Add your first homepage banner to get started.</p>
          <button
            onClick={() =>
              setEditor({ banner: { key: uid(), type: "image", imageUrl: "", youtubeUrl: "", link: "", active: true }, isNew: true })
            }
            className="mt-5 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark"
          >
            + Add banner
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {banners.map((b, idx) => (
            <li key={b.key} className="flex items-center gap-4 rounded-xl border border-line bg-white p-3">
              {/* Reorder */}
              <div className="flex flex-col">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-ink-soft hover:text-brand disabled:opacity-30" aria-label="Move up">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 12l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <span className="text-center text-xs font-bold text-ink-soft">{idx + 1}</span>
                <button onClick={() => move(idx, 1)} disabled={idx === banners.length - 1} className="text-ink-soft hover:text-brand disabled:opacity-30" aria-label="Move down">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>

              {/* Thumb */}
              <BannerPreview b={b} className="h-16 w-28 shrink-0 rounded-lg border border-line" />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-page px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-soft">
                    {b.type === "youtube" ? "YouTube" : "Image"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.active ? "bg-green-100 text-green-700" : "bg-page text-ink-soft"}`}>
                    {b.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-ink-soft">{b.link || <span className="italic">No link</span>}</p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => toggle(b.key)} title={b.active ? "Hide" : "Show"} className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-ink">
                  {b.active ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.4 4M6.3 6.3A15 15 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 3-.5" strokeLinecap="round" /></svg>
                  )}
                </button>
                <button onClick={() => setEditor({ banner: b, isNew: false })} title="Edit" className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-brand">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button onClick={() => remove(b.key)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editor && (
        <BannerEditor initial={editor.banner} isNew={editor.isNew} onSave={saveEditor} onCancel={() => setEditor(null)} />
      )}
    </div>
  );
}

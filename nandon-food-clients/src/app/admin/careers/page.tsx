"use client";

import { useEffect, useState } from "react";
import { API_BASE, authSend } from "@/lib/api";

type Job = {
  key: string;
  _id?: string;
  title: string;
  location: string;
  type: string;
  department: string;
  description: string;
  deadline: string;
  applyEmail: string;
  applyLink: string;
  active: boolean;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `j_${Math.random().toString(36).slice(2)}`;

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];
const blank = (): Job => ({
  key: uid(), title: "", location: "Dhaka, Bangladesh", type: "Full-time", department: "",
  description: "", deadline: "", applyEmail: "", applyLink: "", active: true,
});

const field = "w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white";

/* ── Add / edit modal ───────────────────────────────────────────────── */
function Editor({ initial, isNew, onSave, onCancel }: { initial: Job; isNew: boolean; onSave: (j: Job) => void; onCancel: () => void }) {
  const [j, setJ] = useState<Job>(initial);
  const [err, setErr] = useState("");
  const set = (k: keyof Job) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setJ((x) => ({ ...x, [k]: e.target.value }));

  function submit() {
    if (!j.title.trim()) return setErr("Job title is required.");
    onSave(j);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{isNew ? "Add job opening" : "Edit job opening"}</h3>
          <button onClick={onCancel} aria-label="Close" className="text-ink-soft hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Job title *</label>
            <input value={j.title} onChange={set("title")} placeholder="e.g. Delivery Rider" className={field} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Location</label>
              <input value={j.location} onChange={set("location")} placeholder="Dhaka, Bangladesh" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Type</label>
              <select value={j.type} onChange={set("type")} className={field}>
                {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Department</label>
              <input value={j.department} onChange={set("department")} placeholder="e.g. Operations" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Deadline</label>
              <input value={j.deadline} onChange={set("deadline")} placeholder="e.g. 30 Sep 2026" className={field} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Description</label>
            <textarea value={j.description} onChange={set("description")} rows={4} placeholder="Responsibilities, requirements, benefits…" className={`${field} resize-none`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Apply email</label>
              <input value={j.applyEmail} onChange={set("applyEmail")} placeholder="hr@nandonfood.com" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Apply link (optional)</label>
              <input value={j.applyLink} onChange={set("applyLink")} placeholder="https://…" className={field} />
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={j.active} onChange={(e) => setJ((x) => ({ ...x, active: e.target.checked }))} className="h-4 w-4 accent-[var(--color-brand)]" />
            <span className="font-medium text-ink">Active</span>
            <span className="text-ink-soft">— show this opening on the careers page</span>
          </label>
          {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}
        </div>
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button onClick={onCancel} className="rounded-lg border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-page">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">{isNew ? "Add job" : "Save job"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editor, setEditor] = useState<{ job: Job; isNew: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/site-content`);
        const j = await r.json();
        const arr = (j?.data?.careers ?? []) as Array<Record<string, unknown>>;
        setJobs(
          arr.map((s) => ({
            key: uid(),
            _id: s._id as string | undefined,
            title: (s.title as string) || "",
            location: (s.location as string) || "",
            type: (s.type as string) || "Full-time",
            department: (s.department as string) || "",
            description: (s.description as string) || "",
            deadline: (s.deadline as string) || "",
            applyEmail: (s.applyEmail as string) || "",
            applyLink: (s.applyLink as string) || "",
            active: s.active !== false,
          })),
        );
      } catch {}
      setLoading(false);
    })();
  }, []);

  const mutate = (fn: (a: Job[]) => Job[]) => {
    setJobs(fn);
    setDirty(true);
    setMsg(null);
  };
  const move = (idx: number, dir: number) =>
    mutate((a) => {
      const b = [...a];
      const k = idx + dir;
      if (k < 0 || k >= b.length) return b;
      [b[idx], b[k]] = [b[k], b[idx]];
      return b;
    });
  const toggle = (key: string) => mutate((a) => a.map((x) => (x.key === key ? { ...x, active: !x.active } : x)));
  const remove = (key: string) => {
    if (!confirm("Delete this job opening?")) return;
    mutate((a) => a.filter((x) => x.key !== key));
  };
  const saveJob = (jb: Job) => {
    mutate((a) => (a.some((x) => x.key === jb.key) ? a.map((x) => (x.key === jb.key ? jb : x)) : [...a, jb]));
    setEditor(null);
  };

  async function persist() {
    setSaving(true);
    setMsg(null);
    const payload = jobs.map((j, idx) => ({
      ...(j._id ? { _id: j._id } : {}),
      title: j.title, location: j.location, type: j.type, department: j.department,
      description: j.description, deadline: j.deadline, applyEmail: j.applyEmail, applyLink: j.applyLink,
      active: j.active, order: idx,
    }));
    const res = await authSend("/site-content/careers", "PATCH", payload);
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setMsg({ type: "success", text: "Saved — now live on the careers page." });
    } else {
      setMsg({ type: "error", text: res.message || "Save failed. Are you logged in as admin?" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Careers</h2>
          <p className="text-sm text-ink-soft">Job openings shown on the public /career page.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setEditor({ job: blank(), isNew: true })} className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white">
            + Add job
          </button>
          <button onClick={persist} disabled={!dirty || saving} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {msg && <div className={`rounded-lg px-4 py-2.5 text-sm ${msg.type === "error" ? "bg-brand-tint text-brand-dark" : "bg-green-50 text-green-700"}`}>{msg.text}</div>}
      {dirty && !msg && <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">You have unsaved changes — click <b>Save changes</b> to publish.</div>}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-line bg-white" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-2xl">💼</div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink">No job openings yet</h3>
          <p className="mt-1 text-sm text-ink-soft">Add your first opening — it appears on the careers page instantly.</p>
          <button onClick={() => setEditor({ job: blank(), isNew: true })} className="mt-5 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">+ Add job</button>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j, idx) => (
            <li key={j.key} className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
              <div className="flex flex-col">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-ink-soft hover:text-brand disabled:opacity-30" aria-label="Move up">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 12l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <span className="text-center text-xs font-bold text-ink-soft">{idx + 1}</span>
                <button onClick={() => move(idx, 1)} disabled={idx === jobs.length - 1} className="text-ink-soft hover:text-brand disabled:opacity-30" aria-label="Move down">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{j.title || <span className="italic text-ink-soft">Untitled</span>}</span>
                  <span className="rounded bg-page px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{j.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${j.active ? "bg-green-100 text-green-700" : "bg-page text-ink-soft"}`}>{j.active ? "Active" : "Hidden"}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-soft">{[j.location, j.department, j.deadline && `Apply by ${j.deadline}`].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => toggle(j.key)} title={j.active ? "Hide" : "Show"} className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-ink">
                  {j.active ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.4 4M6.3 6.3A15 15 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 3-.5" strokeLinecap="round" /></svg>
                  )}
                </button>
                <button onClick={() => setEditor({ job: j, isNew: false })} title="Edit" className="rounded-md p-2 text-ink-soft hover:bg-page hover:text-brand">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button onClick={() => remove(j.key)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editor && <Editor initial={editor.job} isNew={editor.isNew} onSave={saveJob} onCancel={() => setEditor(null)} />}
    </div>
  );
}

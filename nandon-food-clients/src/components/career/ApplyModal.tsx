"use client";

import { useEffect, useState } from "react";
import { X, UploadCloud, FileText, CheckCircle2 } from "lucide-react";
import { uploadCv, submitApplication } from "@/lib/api";

export default function ApplyModal({ jobTitle, onClose }: { jobTitle: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  // Lock body scroll + Escape to close.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setErr("CV must be under 8MB.");
      return;
    }
    setErr("");
    setCvFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErr("Please fill in your name and phone number.");
      return;
    }
    setSubmitting(true);
    setErr("");

    let cvUrl = "";
    if (cvFile) {
      const up = await uploadCv(cvFile);
      if (!up) {
        setSubmitting(false);
        setErr("CV upload failed. Please try a PDF or Word file under 8MB.");
        return;
      }
      cvUrl = up.url;
    }

    const res = await submitApplication({
      jobTitle,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      cvUrl,
      coverLetter: coverLetter.trim(),
    });
    setSubmitting(false);
    if (res.ok) setDone(true);
    else setErr(res.message || "Something went wrong. Please try again.");
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Apply now</h3>
            {jobTitle && <p className="text-sm text-ink-soft">{jobTitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={30} />
            </span>
            <h4 className="mt-4 font-display text-xl font-bold text-ink">Application received!</h4>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
              Thank you for applying{jobTitle ? ` for ${jobTitle}` : ""}. Our team will review your application and reach out if it’s a match.
            </p>
            <button onClick={onClose} className="mt-6 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Full name <span className="text-brand">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Phone <span className="text-brand">*</span></label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Email <span className="font-normal text-ink-soft">(optional)</span></label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">CV / Resume <span className="font-normal text-ink-soft">(optional)</span></label>
              {cvFile ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-page px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                    <FileText size={18} className="shrink-0 text-brand" />
                    <span className="truncate">{cvFile.name}</span>
                  </span>
                  <button type="button" onClick={() => setCvFile(null)} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line py-6 text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint/40">
                  <UploadCloud size={24} />
                  <span className="text-sm font-semibold">Click to upload your CV</span>
                  <span className="text-xs">PDF or Word — max 8MB</span>
                  <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={onPickFile} />
                </label>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Cover letter <span className="font-normal text-ink-soft">(optional)</span></label>
              <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={4} placeholder="Tell us why you’d be a great fit…" className={`${inputCls} resize-none`} />
            </div>

            {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-page">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

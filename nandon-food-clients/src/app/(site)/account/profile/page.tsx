"use client";

import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "@/lib/api";

const field = "w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white";

export default function ProfilePage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getMyProfile(ctrl.signal).then((u) => {
      if (u) {
        setForm({
          firstName: (u.firstName as string) || "",
          lastName: (u.lastName as string) || "",
          phone: (u.phone as string) || "",
          email: (u.email as string) || "",
        });
      }
      setLoading(false);
    });
    return () => ctrl.abort();
  }, []);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!form.firstName.trim()) return setMsg({ ok: false, text: "First name is required." });
    if (!form.email.trim()) return setMsg({ ok: false, text: "Email is required." });

    setSaving(true);
    const res = await updateMyProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
    setSaving(false);

    if (res.ok) {
      setMsg({ ok: true, text: "Profile updated." });
      // Keep the header/sidebar in sync with the new name/email.
      try {
        const u = JSON.parse(localStorage.getItem("nandon_user") || "{}");
        localStorage.setItem("nandon_user", JSON.stringify({ ...u, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() }));
      } catch {}
    } else {
      setMsg({ ok: false, text: res.message || "Could not update your profile." });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Edit Profile</h1>
        <p className="text-sm text-ink-soft">Update your name, phone number and email address.</p>
      </div>

      <form onSubmit={save} className="max-w-xl space-y-4 rounded-2xl border border-line bg-white p-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-page" />)}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">First name *</label>
                <input value={form.firstName} onChange={upd("firstName")} className={field} placeholder="First name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Last name</label>
                <input value={form.lastName} onChange={upd("lastName")} className={field} placeholder="Last name" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Phone</label>
              <input value={form.phone} onChange={upd("phone")} className={field} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Email address *</label>
              <input type="email" value={form.email} onChange={upd("email")} className={field} placeholder="you@example.com" />
              <p className="mt-1 text-xs text-ink-soft">This is also your login ID.</p>
            </div>

            {msg && (
              <div className={`rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-brand-tint text-brand-dark"}`}>
                {msg.text}
              </div>
            )}

            <button type="submit" disabled={saving} className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

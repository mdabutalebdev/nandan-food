"use client";

import { useState } from "react";
import { changeMyPassword } from "@/lib/api";

const field = "w-full rounded-lg border border-line bg-page px-4 py-2.5 pr-11 text-sm outline-none focus:border-brand focus:bg-white";

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={field}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-soft hover:text-brand"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default function SecurityPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!current) return setMsg({ ok: false, text: "Enter your current password." });
    if (next.length < 6) return setMsg({ ok: false, text: "New password must be at least 6 characters." });
    if (next !== confirm) return setMsg({ ok: false, text: "New passwords don't match." });

    setSaving(true);
    const res = await changeMyPassword(current, next);
    setSaving(false);

    if (res.ok) {
      setMsg({ ok: true, text: "Password changed successfully." });
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      setMsg({ ok: false, text: res.message || "Could not change your password." });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Password</h1>
        <p className="text-sm text-ink-soft">Choose a strong password you don&apos;t use anywhere else.</p>
      </div>

      <form onSubmit={submit} className="max-w-md space-y-4 rounded-2xl border border-line bg-white p-6">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Current password</label>
          <PasswordInput value={current} onChange={setCurrent} placeholder="Current password" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">New password</label>
          <PasswordInput value={next} onChange={setNext} placeholder="At least 6 characters" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Confirm new password</label>
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repeat new password" />
        </div>

        {msg && (
          <div className={`rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-brand-tint text-brand-dark"}`}>
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={saving} className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
          {saving ? "Updating…" : "Change password"}
        </button>
      </form>
    </div>
  );
}

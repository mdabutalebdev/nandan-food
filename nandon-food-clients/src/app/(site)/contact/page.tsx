"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSiteContent, submitInquiry } from "@/lib/api";
import { site } from "@/lib/site";

type ContactCfg = {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  hours?: { day: string; time: string }[];
  subjects?: string[];
};

const field = "w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white";

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-white p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const [cfg, setCfg] = useState<ContactCfg | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getSiteContent().then((d) => setCfg((d?.contact as ContactCfg) ?? {}));
  }, []);

  const phone = cfg?.phone || site.phone;
  const email = cfg?.email || site.email;
  const address = cfg?.address || site.address;
  const hours = cfg?.hours?.length ? cfg.hours : [{ day: "Sat – Thu", time: "9:00 AM – 8:00 PM" }, { day: "Friday", time: "3:00 PM – 8:00 PM" }];
  const subjects = cfg?.subjects?.length ? cfg.subjects : ["Order Issue", "Product Inquiry", "Delivery Problem", "Feedback", "Other"];

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      return setMsg({ ok: false, text: "Please fill in your name, phone and message." });
    }
    setSending(true);
    const res = await submitInquiry({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      subject: form.subject || "Contact",
      message: form.message.trim(),
    });
    setSending(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Thanks! We’ve received your message and will get back to you soon." });
      setForm({ name: "", phone: "", email: "", subject: "", message: "" });
    } else {
      setMsg({ ok: false, text: res.message || "Could not send your message. Please try again." });
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand to-brand-dark py-14 text-white">
        <div className="frame text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-cream/90">We’re here to help</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Contact Us</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            Questions about an order, a product or delivery? Reach out — our team replies fast.
          </p>
        </div>
      </section>

      <div className="frame py-8">
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-ink-soft">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span>/</span>
          <span className="font-semibold text-ink">Contact</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* Info */}
          <div className="space-y-3">
            <InfoCard icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1l-2.1 2.2z" /></svg>} label="Call us">
              <a href={`tel:${phone}`} className="hover:text-brand">{phone}</a>
              {cfg?.whatsapp && <> · <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand">WhatsApp</a></>}
            </InfoCard>
            <InfoCard icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16v12H4zM4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" /></svg>} label="Email">
              <a href={`mailto:${email}`} className="hover:text-brand">{email}</a>
            </InfoCard>
            <InfoCard icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>} label="Address">
              {address}
            </InfoCard>
            <InfoCard icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>} label="Business hours">
              <ul className="space-y-0.5 font-normal text-ink-soft">
                {hours.map((h, i) => <li key={i}><span className="font-medium text-ink">{h.day}:</span> {h.time}</li>)}
              </ul>
            </InfoCard>
          </div>

          {/* Form */}
          <form onSubmit={send} className="rounded-2xl border border-line bg-white p-6">
            <h2 className="font-display text-xl font-bold text-ink">Send us a message</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={form.name} onChange={upd("name")} placeholder="Your name *" className={field} />
              <input value={form.phone} onChange={upd("phone")} placeholder="Phone *" className={field} />
              <input value={form.email} onChange={upd("email")} placeholder="Email (optional)" className={`${field} sm:col-span-2`} />
              <select value={form.subject} onChange={upd("subject")} className={`${field} sm:col-span-2`}>
                <option value="">Select a subject…</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea value={form.message} onChange={upd("message")} rows={5} placeholder="How can we help? *" className={`${field} resize-none sm:col-span-2`} />
            </div>
            {msg && <div className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-brand-tint text-brand-dark"}`}>{msg.text}</div>}
            <button type="submit" disabled={sending} className="mt-4 w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60 sm:w-auto sm:px-10">
              {sending ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

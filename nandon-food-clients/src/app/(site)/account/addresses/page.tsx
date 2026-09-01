"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getMyAddresses, addMyAddress, updateMyAddress, deleteMyAddress } from "@/lib/api";

type Address = {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  area?: string;
  city: string;
  postalCode?: string;
  isDefault?: boolean;
};

const field = "w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white";
const blank = { label: "Home", fullName: "", phone: "", address: "", area: "", city: "", postalCode: "", isDefault: false };

function AddressForm({ initial, onSave, onCancel, saving }: {
  initial: typeof blank & { _id?: string };
  onSave: (f: typeof blank & { _id?: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="rounded-2xl border border-brand bg-white p-5">
      <h3 className="mb-4 font-display font-bold text-ink">{f._id ? "Edit address" : "New address"}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={f.label} onChange={set("label")} placeholder="Label (Home, Office…)" className={field} />
        <input value={f.fullName} onChange={set("fullName")} placeholder="Full name *" className={field} />
        <input value={f.phone} onChange={set("phone")} placeholder="Phone *" className={field} />
        <input value={f.city} onChange={set("city")} placeholder="City / District *" className={field} />
        <textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} rows={2} placeholder="Full address *" className={`${field} resize-none sm:col-span-2`} />
        <input value={f.area} onChange={set("area")} placeholder="Area / Thana" className={field} />
        <input value={f.postalCode} onChange={set("postalCode")} placeholder="Postal code" className={field} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.isDefault} onChange={(e) => setF({ ...f, isDefault: e.target.checked })} className="h-4 w-4 accent-[var(--color-brand)]" />
        <span className="text-ink">Set as default address</span>
      </label>
      {err && <p className="mt-2 text-sm text-brand-dark">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            if (!f.fullName.trim() || !f.phone.trim() || !f.address.trim() || !f.city.trim()) return setErr("Please fill name, phone, address and city.");
            setErr(""); onSave(f);
          }}
          disabled={saving}
          className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save address"}
        </button>
        <button onClick={onCancel} className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-page">Cancel</button>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  const [rows, setRows] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<(typeof blank & { _id?: string }) | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const data = await getMyAddresses();
    setRows(data as Address[]);
    setLoading(false);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    load();
  }, []);

  async function save(f: typeof blank & { _id?: string }) {
    setSaving(true);
    const body = { label: f.label || "Home", fullName: f.fullName, phone: f.phone, address: f.address, area: f.area, city: f.city, postalCode: f.postalCode, isDefault: f.isDefault };
    const res = f._id ? await updateMyAddress(f._id, body) : await addMyAddress(body);
    setSaving(false);
    if (res.ok) { setMsg(f._id ? "Address updated." : "Address added."); setEditor(null); load(); }
    else setMsg(res.message || "Could not save the address.");
  }

  async function remove(a: Address) {
    if (!confirm("Delete this address?")) return;
    const res = await deleteMyAddress(a._id);
    if (res.ok) { setMsg("Address deleted."); load(); }
    else setMsg(res.message || "Delete failed.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Addresses</h1>
          <p className="text-sm text-ink-soft">Saved addresses make checkout faster.</p>
        </div>
        {!editor && (
          <button onClick={() => setEditor({ ...blank })} className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
            + Add address
          </button>
        )}
      </div>

      {msg && <div className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">{msg}</div>}

      {editor && <AddressForm initial={editor} saving={saving} onSave={save} onCancel={() => setEditor(null)} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-white" />)}
        </div>
      ) : rows.length === 0 && !editor ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand">
            <MapPin size={22} strokeWidth={1.75} />
          </span>
          <p className="mt-4 font-semibold text-ink">No saved addresses</p>
          <p className="text-sm text-ink-soft">Add one so you don&apos;t have to type it at checkout.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((a) => (
            <div key={a._id} className="rounded-2xl border border-line bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-page px-2.5 py-0.5 text-xs font-semibold text-ink">{a.label}</span>
                {a.isDefault && <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand-dark">Default</span>}
              </div>
              <p className="font-semibold text-ink">{a.fullName}</p>
              <p className="text-sm text-ink-soft">{a.phone}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {a.address}{a.area ? `, ${a.area}` : ""}, {a.city}{a.postalCode ? ` - ${a.postalCode}` : ""}
              </p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditor({ label: a.label, fullName: a.fullName, phone: a.phone, address: a.address, area: a.area || "", city: a.city, postalCode: a.postalCode || "", isDefault: !!a.isDefault, _id: a._id })} className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand">Edit</button>
                <button onClick={() => remove(a)} className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * Site settings — everything the storefront reads at runtime.
 * Each tab saves only its own section, so two admins editing different tabs
 * never overwrite each other.
 */

import { useCallback, useEffect, useState } from "react";
import { Truck } from "lucide-react";
import Link from "next/link";
import { uploadImage } from "@/lib/api";
import { adminGetSettings, adminUpdateSettings, type DeliveryZone } from "@/lib/admin";
import {
  Button, Card, Checkbox, EmptyState, Field, Icon, ICONS, Input, PageHeader, Select,
  TableSkeleton, Textarea, Toast, useToast, bdt,
} from "@/components/admin/ui";

type Tab = "delivery" | "payment" | "invoice" | "contact" | "brand" | "seo";

const TABS: [Tab, string, string][] = [
  ["delivery", "Delivery charges", "Zones and rates used at checkout"],
  ["payment", "Payment numbers", "bKash / Nagad / Rocket"],
  ["invoice", "Invoice & company", "Printed on every invoice"],
  ["contact", "Contact & social", "Phone, email, address, socials"],
  ["brand", "Branding & footer", "Logo, colours, announcement bar"],
  ["seo", "SEO", "Title, description, keywords"],
];

type Hour = { day: string; time: string };
type FooterLink = { label: string; url: string };

export default function AdminSettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("delivery");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  // ── Delivery ──
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [freeAbove, setFreeAbove] = useState("0");

  // ── Payment ──
  const [payment, setPayment] = useState({
    bkash: { number: "", accountType: "Personal", active: true },
    nagad: { number: "", accountType: "Personal", active: true },
    rocket: { number: "", accountType: "Personal", active: true },
    instructions: "",
  });

  // ── Invoice ──
  const [invoice, setInvoice] = useState({
    companyName: "", addressLine: "", phone: "", email: "", website: "",
    binNo: "", tinNo: "", logoUrl: "", footerNote: "", terms: "",
  });

  // ── Contact ──
  const [contact, setContact] = useState({ phone: "", whatsapp: "", email: "", address: "" });
  const [hours, setHours] = useState<Hour[]>([]);
  const [floating, setFloating] = useState({
    phone: "", whatsapp: "", messenger: "",
    showPhone: true, showWhatsapp: true, showMessenger: true,
  });

  // ── Brand / footer ──
  const [theme, setTheme] = useState({ primaryColor: "#e11b22", secondaryColor: "#a5141b", logoUrl: "", faviconUrl: "" });
  const [footer, setFooter] = useState({ companyName: "", copyright: "" });
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [announcement, setAnnouncement] = useState({ message: "", bgColor: "#e11b22", textColor: "#FFFFFF", active: false, dismissible: true });
  const [defaultTagline, setDefaultTagline] = useState("");

  // ── SEO ──
  const [seo, setSeo] = useState({ title: "", description: "", keywords: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const s = await adminGetSettings();
    if (s) {
      const dz = (s.deliveryZones as DeliveryZone[]) || [];
      const legacy = (s.deliveryCharge as { insideDhaka?: number; outsideDhaka?: number }) || {};
      setZones(
        dz.length
          ? dz.map((z, i) => ({ ...z, order: z.order ?? i }))
          : [
              { name: "Inside Dhaka", charge: legacy.insideDhaka ?? 60, note: "1–2 days", isDefault: true, active: true, order: 0 },
              { name: "Outside Dhaka", charge: legacy.outsideDhaka ?? 120, note: "2–4 days", isDefault: false, active: true, order: 1 },
            ],
      );
      setFreeAbove(String(s.freeDeliveryAbove ?? 0));

      const p = (s.payment as typeof payment) || null;
      if (p) setPayment({ ...payment, ...p });

      const inv = (s.invoice as typeof invoice) || null;
      if (inv) setInvoice({ ...invoice, ...inv });

      const c = (s.contact as Record<string, unknown>) || {};
      setContact({
        phone: (c.phone as string) || "",
        whatsapp: (c.whatsapp as string) || "",
        email: (c.email as string) || "",
        address: (c.address as string) || "",
      });
      setHours(((c.hours as Hour[]) || []).map((h) => ({ day: h.day, time: h.time })));

      const fl = (s.floating as typeof floating) || null;
      if (fl) setFloating({ ...floating, ...fl });

      const th = (s.theme as typeof theme) || null;
      if (th) setTheme({ ...theme, ...th });

      const ft = (s.footer as { companyName?: string; copyright?: string; links?: FooterLink[] }) || {};
      setFooter({ companyName: ft.companyName || "", copyright: ft.copyright || "" });
      setFooterLinks((ft.links || []).map((l) => ({ label: l.label, url: l.url })));

      const an = (s.announcement as typeof announcement) || null;
      if (an) setAnnouncement({ ...announcement, ...an });

      setDefaultTagline((s.defaultTagline as string) || "");

      const se = (s.seo as typeof seo) || null;
      if (se) setSeo({ ...seo, ...se });
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial hydration only
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);

  async function save(section: string, body: Record<string, unknown>) {
    setSaving(section);
    const res = await adminUpdateSettings(body);
    setSaving("");
    if (res.ok) toast.ok("Saved — the change is live on the site.");
    else toast.fail(res.message || "Save failed.");
  }

  async function pickLogo(file: File | undefined, apply: (u: string) => void) {
    if (!file) return;
    const u = await uploadImage(file);
    if (u) apply(u);
    else toast.fail("Upload failed.");
  }

  if (loading) return <div className="rounded-xl border border-line bg-white"><TableSkeleton rows={8} cols={3} /></div>;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Site settings" desc="Everything here is read live by the storefront — nothing is hard-coded." />

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            id={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === k ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── DELIVERY ─────────────────────────────────────── */}
      {tab === "delivery" && (
        <div className="space-y-5">
          <Card
            title="Delivery zones"
            desc="Each active zone becomes a choice on the checkout page with its own charge."
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZones([...zones, { name: "", charge: 0, note: "", isDefault: zones.length === 0, active: true, order: zones.length }])}
              >
                <Icon d={ICONS.plus} /> Add zone
              </Button>
            }
          >
            {zones.length === 0 ? (
              <EmptyState Icon={Truck} title="No delivery zones" desc="Add at least one zone so checkout can charge delivery." />
            ) : (
              <div className="space-y-3">
                {zones.map((z, i) => (
                  <div key={i} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_140px_1fr_auto]">
                    <Field label="Zone name">
                      <Input
                        value={z.name}
                        onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        placeholder="Inside Dhaka"
                      />
                    </Field>
                    <Field label="Charge (৳)">
                      <Input
                        type="number"
                        value={z.charge}
                        onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, charge: Number(e.target.value) } : x)))}
                      />
                    </Field>
                    <Field label="Note (shown to the customer)">
                      <Input
                        value={z.note || ""}
                        onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                        placeholder="1–2 days"
                      />
                    </Field>
                    <div className="flex items-end gap-2 pb-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <input
                          type="radio"
                          name="defaultZone"
                          checked={Boolean(z.isDefault)}
                          onChange={() => setZones(zones.map((x, j) => ({ ...x, isDefault: j === i })))}
                          className="h-4 w-4 accent-[var(--color-brand)]"
                        />
                        Default
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <input
                          type="checkbox"
                          checked={z.active !== false}
                          onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))}
                          className="h-4 w-4 accent-[var(--color-brand)]"
                        />
                        Active
                      </label>
                      <button
                        onClick={() => setZones(zones.filter((_, j) => j !== i))}
                        className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"
                        title="Remove zone"
                      >
                        <Icon d={ICONS.trash} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <Field label="Free delivery above (৳)" hint="0 turns it off. Applies before delivery is added.">
                <Input type="number" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button
                  onClick={() =>
                    save("delivery", {
                      deliveryZones: zones
                        .filter((z) => z.name.trim())
                        .map((z, i) => ({ ...z, name: z.name.trim(), charge: Number(z.charge) || 0, order: i })),
                      freeDeliveryAbove: Number(freeAbove) || 0,
                      // Keep the legacy pair in sync for anything still reading it.
                      deliveryCharge: {
                        insideDhaka: Number(zones.find((z) => /inside/i.test(z.name))?.charge ?? zones[0]?.charge ?? 60),
                        outsideDhaka: Number(zones.find((z) => /outside/i.test(z.name))?.charge ?? zones[1]?.charge ?? 120),
                      },
                    })
                  }
                  disabled={saving === "delivery"}
                >
                  {saving === "delivery" ? "Saving…" : "Save delivery settings"}
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Preview" desc="How the zones appear on the checkout page.">
            <div className="grid gap-3 sm:grid-cols-2">
              {zones.filter((z) => z.active !== false && z.name.trim()).map((z, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-ink">{z.name}</span>
                    {z.note && <span className="block text-xs text-ink-soft">{z.note}</span>}
                  </span>
                  <span className="font-bold text-brand">{bdt(z.charge)}</span>
                </div>
              ))}
            </div>
            {Number(freeAbove) > 0 && (
              <p className="mt-3 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
                Orders of {bdt(Number(freeAbove))} or more get <b>free delivery</b>.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── PAYMENT ──────────────────────────────────────── */}
      {tab === "payment" && (
        <Card title="Mobile payment numbers" desc="Shown at checkout when a customer picks that method.">
          <div className="grid gap-5">
            {(["bkash", "nagad", "rocket"] as const).map((m) => (
              <div key={m} className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-[1fr_180px_auto]">
                <Field label={`${m[0].toUpperCase() + m.slice(1)} number`}>
                  <Input
                    value={payment[m].number}
                    onChange={(e) => setPayment({ ...payment, [m]: { ...payment[m], number: e.target.value } })}
                    placeholder="01XXXXXXXXX"
                  />
                </Field>
                <Field label="Account type">
                  <Select
                    value={payment[m].accountType}
                    onChange={(e) => setPayment({ ...payment, [m]: { ...payment[m], accountType: e.target.value } })}
                  >
                    <option>Personal</option>
                    <option>Agent</option>
                    <option>Merchant</option>
                  </Select>
                </Field>
                <div className="flex items-end pb-3">
                  <Checkbox
                    checked={payment[m].active}
                    onChange={(v) => setPayment({ ...payment, [m]: { ...payment[m], active: v } })}
                    label="Enabled"
                  />
                </div>
              </div>
            ))}

            <Field label="Instructions shown to the customer">
              <Textarea rows={2} value={payment.instructions} onChange={(e) => setPayment({ ...payment, instructions: e.target.value })} />
            </Field>

            <div>
              <Button onClick={() => save("payment", { payment })} disabled={saving === "payment"}>
                {saving === "payment" ? "Saving…" : "Save payment settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── INVOICE ──────────────────────────────────────── */}
      {tab === "invoice" && (
        <Card title="Invoice & company details" desc="Printed at the top and bottom of every invoice.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required>
              <Input value={invoice.companyName} onChange={(e) => setInvoice({ ...invoice, companyName: e.target.value })} placeholder="Nandon Foods Ltd." />
            </Field>
            <Field label="Website">
              <Input value={invoice.website} onChange={(e) => setInvoice({ ...invoice, website: e.target.value })} placeholder="www.nandonfood.com" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={invoice.addressLine} onChange={(e) => setInvoice({ ...invoice, addressLine: e.target.value })} placeholder="House 12, Road 5, Dhaka 1212" />
            </Field>
            <Field label="Phone">
              <Input value={invoice.phone} onChange={(e) => setInvoice({ ...invoice, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={invoice.email} onChange={(e) => setInvoice({ ...invoice, email: e.target.value })} />
            </Field>
            <Field label="BIN">
              <Input value={invoice.binNo} onChange={(e) => setInvoice({ ...invoice, binNo: e.target.value })} />
            </Field>
            <Field label="TIN">
              <Input value={invoice.tinNo} onChange={(e) => setInvoice({ ...invoice, tinNo: e.target.value })} />
            </Field>
            <Field label="Invoice logo" className="sm:col-span-2" hint="Square logo works best.">
              <div className="flex items-center gap-3">
                {invoice.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={invoice.logoUrl} alt="" className="h-16 w-16 rounded border border-line object-contain" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded border-2 border-dashed border-line text-xs text-ink-soft">None</span>
                )}
                <label className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
                  Upload logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0], (u) => setInvoice({ ...invoice, logoUrl: u }))} />
                </label>
                {invoice.logoUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setInvoice({ ...invoice, logoUrl: "" })}>Remove</Button>
                )}
              </div>
            </Field>
            <Field label="Footer note" className="sm:col-span-2">
              <Input value={invoice.footerNote} onChange={(e) => setInvoice({ ...invoice, footerNote: e.target.value })} placeholder="Thank you for your business." />
            </Field>
            <Field label="Terms & conditions" className="sm:col-span-2" hint="Optional block printed under the totals.">
              <Textarea rows={4} value={invoice.terms} onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })} />
            </Field>
          </div>
          <div className="mt-5">
            <Button onClick={() => save("invoice", { invoice })} disabled={saving === "invoice"}>
              {saving === "invoice" ? "Saving…" : "Save invoice settings"}
            </Button>
          </div>
        </Card>
      )}

      {/* ── CONTACT ──────────────────────────────────────── */}
      {tab === "contact" && (
        <div className="space-y-5">
          <Card title="Contact information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone"><Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></Field>
              <Field label="WhatsApp"><Input value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} /></Field>
              <Field label="Email"><Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></Field>
              <Field label="Address"><Input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} /></Field>
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Business hours</p>
                <Button variant="outline" size="sm" onClick={() => setHours([...hours, { day: "", time: "" }])}>
                  <Icon d={ICONS.plus} /> Add row
                </Button>
              </div>
              <div className="space-y-2">
                {hours.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={h.day} onChange={(e) => setHours(hours.map((x, j) => (j === i ? { ...x, day: e.target.value } : x)))} placeholder="Sunday – Thursday" />
                    <Input value={h.time} onChange={(e) => setHours(hours.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} placeholder="9:00 AM – 6:00 PM" />
                    <button onClick={() => setHours(hours.filter((_, j) => j !== i))} className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                      <Icon d={ICONS.trash} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-page px-4 py-3">
              <p className="text-sm text-ink-soft">
                <b className="text-ink">Social links</b> now have their own page — with a tick box per network.
              </p>
              <Link href="/admin/social-links">
                <Button variant="outline" size="sm">Open Social Links →</Button>
              </Link>
            </div>

            <div className="mt-5">
              <Button
                onClick={() =>
                  // Dotted paths so this tab only writes the fields it owns —
                  // `contact.socials`, tips and subjects are left untouched.
                  save("contact", {
                    "contact.phone": contact.phone,
                    "contact.whatsapp": contact.whatsapp,
                    "contact.email": contact.email,
                    "contact.address": contact.address,
                    "contact.hours": hours,
                  })
                }
                disabled={saving === "contact"}
              >
                {saving === "contact" ? "Saving…" : "Save contact settings"}
              </Button>
            </div>
          </Card>

          <Card title="Floating chat widget" desc="The round buttons at the bottom-right of the storefront.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Phone number"><Input value={floating.phone} onChange={(e) => setFloating({ ...floating, phone: e.target.value })} /></Field>
              <Field label="WhatsApp number"><Input value={floating.whatsapp} onChange={(e) => setFloating({ ...floating, whatsapp: e.target.value })} /></Field>
              <Field label="Messenger username"><Input value={floating.messenger} onChange={(e) => setFloating({ ...floating, messenger: e.target.value })} /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-5">
              <Checkbox checked={floating.showPhone} onChange={(v) => setFloating({ ...floating, showPhone: v })} label="Show phone" />
              <Checkbox checked={floating.showWhatsapp} onChange={(v) => setFloating({ ...floating, showWhatsapp: v })} label="Show WhatsApp" />
              <Checkbox checked={floating.showMessenger} onChange={(v) => setFloating({ ...floating, showMessenger: v })} label="Show Messenger" />
            </div>
            <div className="mt-5">
              <Button onClick={() => save("floating", { floating })} disabled={saving === "floating"}>
                {saving === "floating" ? "Saving…" : "Save widget settings"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── BRAND ────────────────────────────────────────── */}
      {tab === "brand" && (
        <div className="space-y-5">
          <Card title="Branding">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary colour">
                <div className="flex gap-2">
                  <input type="color" value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} className="h-11 w-14 cursor-pointer rounded border border-line" />
                  <Input value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} />
                </div>
              </Field>
              <Field label="Secondary colour">
                <div className="flex gap-2">
                  <input type="color" value={theme.secondaryColor} onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })} className="h-11 w-14 cursor-pointer rounded border border-line" />
                  <Input value={theme.secondaryColor} onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })} />
                </div>
              </Field>
              <Field label="Site logo">
                <div className="flex items-center gap-3">
                  {theme.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={theme.logoUrl} alt="" className="h-14 w-14 rounded border border-line object-contain" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded border-2 border-dashed border-line text-xs text-ink-soft">None</span>
                  )}
                  <label className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0], (u) => setTheme({ ...theme, logoUrl: u }))} />
                  </label>
                </div>
              </Field>
              <Field label="Default product tagline" hint="Used when a product has none of its own.">
                <Input value={defaultTagline} onChange={(e) => setDefaultTagline(e.target.value)} />
              </Field>
            </div>
            <div className="mt-5">
              <Button onClick={() => save("theme", { theme, defaultTagline })} disabled={saving === "theme"}>
                {saving === "theme" ? "Saving…" : "Save branding"}
              </Button>
            </div>
          </Card>

          <Card title="Announcement bar" desc="Thin strip at the very top of the storefront.">
            <div className="grid gap-4">
              <Field label="Message">
                <Input value={announcement.message} onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })} placeholder="Free delivery on orders above ৳1500!" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Background colour">
                  <div className="flex gap-2">
                    <input type="color" value={announcement.bgColor} onChange={(e) => setAnnouncement({ ...announcement, bgColor: e.target.value })} className="h-11 w-14 cursor-pointer rounded border border-line" />
                    <Input value={announcement.bgColor} onChange={(e) => setAnnouncement({ ...announcement, bgColor: e.target.value })} />
                  </div>
                </Field>
                <Field label="Text colour">
                  <div className="flex gap-2">
                    <input type="color" value={announcement.textColor} onChange={(e) => setAnnouncement({ ...announcement, textColor: e.target.value })} className="h-11 w-14 cursor-pointer rounded border border-line" />
                    <Input value={announcement.textColor} onChange={(e) => setAnnouncement({ ...announcement, textColor: e.target.value })} />
                  </div>
                </Field>
              </div>
              <div className="flex flex-wrap gap-5">
                <Checkbox checked={announcement.active} onChange={(v) => setAnnouncement({ ...announcement, active: v })} label="Show the bar" />
                <Checkbox checked={announcement.dismissible} onChange={(v) => setAnnouncement({ ...announcement, dismissible: v })} label="Customers can dismiss it" />
              </div>
              {announcement.message && (
                <div className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold" style={{ background: announcement.bgColor, color: announcement.textColor }}>
                  {announcement.message}
                </div>
              )}
              <div>
                <Button onClick={() => save("announcement", { announcement })} disabled={saving === "announcement"}>
                  {saving === "announcement" ? "Saving…" : "Save announcement"}
                </Button>
              </div>
            </div>
          </Card>

          <Card
            title="Footer"
            actions={
              <Button variant="outline" size="sm" onClick={() => setFooterLinks([...footerLinks, { label: "", url: "" }])}>
                <Icon d={ICONS.plus} /> Add link
              </Button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name"><Input value={footer.companyName} onChange={(e) => setFooter({ ...footer, companyName: e.target.value })} /></Field>
              <Field label="Copyright line"><Input value={footer.copyright} onChange={(e) => setFooter({ ...footer, copyright: e.target.value })} placeholder="© 2026 Nandon Foods. All rights reserved." /></Field>
            </div>
            <div className="mt-4 space-y-2">
              {footerLinks.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={l.label} onChange={(e) => setFooterLinks(footerLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Terms" className="!w-48" />
                  <Input value={l.url} onChange={(e) => setFooterLinks(footerLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="/terms" />
                  <button onClick={() => setFooterLinks(footerLinks.filter((_, j) => j !== i))} className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                    <Icon d={ICONS.trash} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Button
                onClick={() => save("footer", { footer: { ...footer, links: footerLinks.filter((l) => l.label && l.url) } })}
                disabled={saving === "footer"}
              >
                {saving === "footer" ? "Saving…" : "Save footer"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── SEO ──────────────────────────────────────────── */}
      {tab === "seo" && (
        <Card title="Search engine settings" desc="What Google shows for your homepage.">
          <div className="grid gap-4">
            <Field label="Meta title" hint="Around 60 characters works best.">
              <Input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} />
            </Field>
            <Field label="Meta description" hint="Around 155 characters.">
              <Textarea rows={3} value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} />
            </Field>
            <Field label="Keywords" hint="Comma separated.">
              <Input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} />
            </Field>

            <div className="rounded-lg border border-line bg-page p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Google preview</p>
              <p className="mt-2 text-lg text-blue-700">{seo.title || "Your site title"}</p>
              <p className="text-xs text-green-700">nandonfood.com</p>
              <p className="text-sm text-ink-soft">{seo.description || "Your meta description appears here."}</p>
            </div>

            <div>
              <Button onClick={() => save("seo", { seo })} disabled={saving === "seo"}>
                {saving === "seo" ? "Saving…" : "Save SEO settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Toast msg={toast.msg} />
    </div>
  );
}

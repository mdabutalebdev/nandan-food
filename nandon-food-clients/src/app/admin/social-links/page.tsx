"use client";

/**
 * Social Links — one place to manage every social profile shown on the site.
 *
 * Tick a network, paste its URL, save. Only ticked links that actually have a
 * URL appear in the storefront footer, so a half-filled row can never leave a
 * dead icon on the public site.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminGetSettings, adminSaveSocialLinks, type SocialLink } from "@/lib/admin";
import SocialIcon, { SOCIAL_PLATFORMS, platformMeta } from "@/components/SocialIcon";
import {
  Button, Card, Icon, ICONS, Input, PageHeader, Stat, TableSkeleton, Toast, useToast,
} from "@/components/admin/ui";

/** Add the scheme back when someone pastes a bare domain. */
function normaliseUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url) || /^(mailto:|tel:)/i.test(url)) return url;
  return `https://${url}`;
}

function looksValid(url: string): boolean {
  if (!url.trim()) return true; // empty is fine — it just stays hidden
  try {
    const u = new URL(normaliseUrl(url));
    return Boolean(u.hostname) && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export default function AdminSocialLinksPage() {
  const toast = useToast();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await adminGetSettings();
    const raw = ((s?.contact as { socials?: SocialLink[] } | undefined)?.socials ?? []) as SocialLink[];

    // The server seeds a row per supported network; this just fills any gap
    // (e.g. a brand-new network added to the code before the API caught up).
    const byPlatform = new Map(raw.map((l) => [l.platform || "custom", l]));
    const merged: SocialLink[] = [
      ...raw.map((l, i) => ({
        _id: l._id,
        platform: l.platform || "custom",
        label: l.label || platformMeta(l.platform || "custom").label,
        url: l.url || "",
        color: l.color || platformMeta(l.platform || "custom").color,
        active: l.active !== false,
        order: l.order ?? i,
      })),
      ...SOCIAL_PLATFORMS.filter((p) => !byPlatform.has(p.platform)).map((p, i) => ({
        platform: p.platform,
        label: p.label,
        url: "",
        color: p.color,
        active: false,
        order: raw.length + i,
      })),
    ].sort((a, b) => a.order - b.order);

    setLinks(merged);
    setDirty(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);

  const patch = (i: number, next: Partial<SocialLink>) => {
    setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...next } : l)));
    setDirty(true);
  };

  const move = (i: number, dir: -1 | 1) => {
    setLinks((ls) => {
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    setDirty(true);
  };

  const live = useMemo(
    () => links.filter((l) => l.active && l.url.trim() !== ""),
    [links],
  );
  const needsUrl = useMemo(
    () => links.filter((l) => l.active && l.url.trim() === ""),
    [links],
  );
  const invalid = useMemo(() => links.filter((l) => !looksValid(l.url)), [links]);

  async function save() {
    if (invalid.length) {
      toast.fail(`${invalid[0].label} has an invalid link — please check it.`);
      return;
    }
    setSaving(true);
    const payload = links.map((l, i) => ({
      ...(l._id ? { _id: l._id } : {}),
      platform: l.platform,
      label: l.label.trim() || platformMeta(l.platform).label,
      url: normaliseUrl(l.url),
      color: l.color,
      active: l.active,
      order: i,
    })) as SocialLink[];

    const res = await adminSaveSocialLinks(payload);
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      toast.ok("Saved — the footer is updated.");
      load();
    } else {
      toast.fail(res.message || "Save failed.");
    }
  }

  if (loading) return <div className="rounded-xl border border-line bg-white"><TableSkeleton rows={7} cols={3} /></div>;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Social Links"
        desc="Tick a network and paste its link — only ticked links with a URL show in the footer."
        actions={
          <>
            <Link href="/" target="_blank"><Button variant="outline"><Icon d={ICONS.eye} /> View site</Button></Link>
            <Button onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : "Save changes"}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Showing on site" value={String(live.length)} tone="green" hint="active with a link" />
        <Stat label="Networks available" value={String(links.length)} hint="tick to enable" />
        <Stat label="Ticked but empty" value={String(needsUrl.length)} tone="amber" hint="hidden until a link is added" />
        <Stat label="Invalid links" value={String(invalid.length)} tone={invalid.length ? "red" : "slate"} />
      </div>

      {dirty && (
        <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          You have unsaved changes — click <b>Save changes</b> to publish them.
        </div>
      )}

      {/* Live preview of exactly what the footer will render */}
      <Card title="Footer preview" desc="This is how the icon row looks on the storefront.">
        {live.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            Nothing is showing yet — tick a network below and add its link.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg bg-page p-5">
            {live.map((l, i) => (
              <span
                key={`${l.platform}-${i}`}
                title={l.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-soft shadow-sm"
              >
                <SocialIcon platform={l.platform} className="h-[17px] w-[17px]" />
              </span>
            ))}
            <span className="ml-2 text-xs text-ink-soft">
              (icons take their brand colour on hover)
            </span>
          </div>
        )}
      </Card>

      <Card
        title="Networks"
        desc="Drag-free ordering: use the arrows to change the order they appear in."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLinks((ls) => [
                ...ls,
                { platform: "custom", label: "", url: "", color: "#6f6f6f", active: true, order: ls.length },
              ]);
              setDirty(true);
            }}
          >
            <Icon d={ICONS.plus} /> Add custom link
          </Button>
        }
        bodyClass="p-0"
      >
        <ul className="divide-y divide-line">
          {links.map((l, i) => {
            const meta = platformMeta(l.platform);
            const bad = !looksValid(l.url);
            const emptyButOn = l.active && !l.url.trim();
            return (
              <li key={`${l.platform}-${i}`} className="flex flex-wrap items-center gap-4 px-5 py-4">
                {/* Order */}
                <div className="flex flex-col text-ink-soft">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="hover:text-brand disabled:opacity-30">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 12l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === links.length - 1} aria-label="Move down" className="hover:text-brand disabled:opacity-30">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>

                {/* Tick + icon + name */}
                <label className="flex w-52 shrink-0 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={l.active}
                    onChange={(e) => patch(i, { active: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-brand)]"
                  />
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: l.active ? l.color || meta.color : "#c9ccd1" }}
                  >
                    <SocialIcon platform={l.platform} className="h-[17px] w-[17px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {l.platform === "custom" ? l.label || "Custom link" : meta.label}
                    </span>
                    <span className="block text-[11px] text-ink-soft">
                      {l.active ? (l.url.trim() ? "Showing in footer" : "Needs a link") : "Hidden"}
                    </span>
                  </span>
                </label>

                {/* Custom label */}
                {l.platform === "custom" && (
                  <div className="w-40">
                    <Input value={l.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="Name (e.g. Threads)" />
                  </div>
                )}

                {/* URL */}
                <div className="min-w-[240px] flex-1">
                  <Input
                    value={l.url}
                    onChange={(e) => patch(i, { url: e.target.value })}
                    placeholder={meta.placeholder}
                    className={bad ? "!border-red-500 !bg-red-50" : ""}
                  />
                  {bad && <p className="mt-1 text-xs text-red-600">That doesn&apos;t look like a valid link.</p>}
                  {!bad && emptyButOn && <p className="mt-1 text-xs text-amber-600">Ticked, but hidden until you add a link.</p>}
                </div>

                {/* Colour */}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={l.color || meta.color}
                    onChange={(e) => patch(i, { color: e.target.value })}
                    title="Hover colour"
                    className="h-9 w-10 cursor-pointer rounded border border-line"
                  />
                  {l.platform === "custom" && (
                    <button
                      onClick={() => { setLinks((ls) => ls.filter((_, j) => j !== i)); setDirty(true); }}
                      title="Remove"
                      className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"
                    >
                      <Icon d={ICONS.trash} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Notes">
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-soft">
          <li>A link only appears on the site when the checkbox is ticked <b>and</b> a URL is filled in.</li>
          <li>You can paste a bare address like <code className="rounded bg-page px-1">facebook.com/nandonfoods</code> — <b>https://</b> is added on save.</li>
          <li>For WhatsApp use a click-to-chat link: <code className="rounded bg-page px-1">https://wa.me/8801XXXXXXXXX</code>.</li>
          <li>The colour swatch sets the hover colour of that icon in the footer.</li>
          <li>Need a network that isn&apos;t listed? Use <b>Add custom link</b> — it gets a generic link icon.</li>
        </ul>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
}

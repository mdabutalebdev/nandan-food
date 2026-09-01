"use client";

/**
 * The social icon row in the footer.
 * Reads Admin → Social Links; only entries that are ticked active AND have a
 * URL are shown, so a half-filled row never leaves a dead link on the site.
 */

import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/api";
import SocialIcon, { platformMeta } from "@/components/SocialIcon";

type SocialLink = {
  platform?: string;
  label: string;
  url?: string;
  color?: string;
  active?: boolean;
  order?: number;
};

export default function FooterSocials() {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    getSiteContent().then((d) => {
      const raw = ((d?.contact as { socials?: SocialLink[] } | undefined)?.socials ?? []) as SocialLink[];
      setLinks(
        raw
          .filter((s) => s.active !== false && (s.url || "").trim() !== "")
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      );
    });
  }, []);

  if (links.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink">Follow us</h4>
      <div className="flex flex-wrap gap-2.5">
      {links.map((s, i) => {
        const meta = platformMeta(s.platform || "custom");
        const color = s.color || meta.color;
        return (
          <a
            key={`${s.platform}-${i}`}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label || meta.label}
            title={s.label || meta.label}
            className="group flex h-9 w-9 items-center justify-center rounded-full bg-page text-ink-soft transition-colors hover:text-white"
            style={{ ["--social" as string]: color }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = color; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
          >
            <SocialIcon platform={s.platform || "custom"} className="h-[17px] w-[17px]" />
          </a>
        );
      })}
      </div>
    </div>
  );
}

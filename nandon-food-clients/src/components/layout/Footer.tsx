import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { site } from "@/lib/site";
import { STATIC_NAV, FALLBACK_CATEGORY_TREE } from "@/lib/menu";
import FooterSocials from "./FooterSocials";

export default function Footer() {
  const year = 2026; // static build; admin copyright wired later
  return (
    <footer className="border-t border-line bg-surface text-ink">
      <div className="frame grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.logo} alt={site.name} className="h-16 w-auto" />
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            {site.legalName}. Fresh & frozen meat, poultry, fish and agro
            products — processed with care, delivered to your door.
          </p>
          {/* Managed from Admin → Social Links */}
          <FooterSocials />
        </div>

        {/* Company links */}
        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink">Company</h4>
          <ul className="space-y-2.5 text-sm">
            {STATIC_NAV.filter((n) => n.href !== "/").map((n) => (
              <li key={n.id}>
                <Link href={n.href} className="text-ink-soft transition-colors hover:text-brand">
                  {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink">Products</h4>
          <ul className="space-y-2.5 text-sm">
            {FALLBACK_CATEGORY_TREE.map((c) => (
              <li key={c.id}>
                <Link href={c.href} className="text-ink-soft transition-colors hover:text-brand">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink">Get in touch</h4>
          <ul className="space-y-3 text-sm text-ink-soft">
            <li>
              <a href={site.phoneHref} className="flex items-center gap-2.5 hover:text-brand">
                <Phone size={16} strokeWidth={1.75} className="shrink-0 text-brand" /> {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2.5 hover:text-brand">
                <Mail size={16} strokeWidth={1.75} className="shrink-0 text-brand" /> {site.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin size={16} strokeWidth={1.75} className="shrink-0 text-brand" /> {site.address}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="frame flex flex-col items-center justify-between gap-2 py-4 text-xs text-ink-soft sm:flex-row">
          <span>© {year} {site.name}. All rights reserved.</span>
          <span>
            <Link href="/return-policy" className="hover:text-brand">Return policy</Link>
            <span className="mx-2 text-line">·</span>
            <Link href="/about" className="hover:text-brand">About us</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

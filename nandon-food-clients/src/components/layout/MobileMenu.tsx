"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Phone, Mail } from "lucide-react";
import type { MenuNode } from "@/lib/types";
import { site } from "@/lib/site";

function AccordionNode({
  node,
  depth,
  onNavigate,
}: {
  node: MenuNode;
  depth: number;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!node.children?.length;
  const pad = { paddingLeft: `${0.75 + depth * 0.85}rem` };

  if (!hasChildren) {
    return (
      <Link
        href={node.href}
        onClick={onNavigate}
        style={pad}
        className="block py-2.5 pr-4 text-[14px] text-ink hover:text-brand"
      >
        {node.name}
      </Link>
    );
  }

  return (
    <div className="border-b border-line/70 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={pad}
        className="flex w-full items-center justify-between py-2.5 pr-4 text-left"
        aria-expanded={open}
      >
        <span
          className={`text-[14px] ${
            depth === 0 ? "nav-label text-maroon" : "font-medium text-ink"
          }`}
        >
          {node.name}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
        >
          <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="bg-brand-tint/40">
          {/* Parent is also reachable directly */}
          <Link
            href={node.href}
            onClick={onNavigate}
            style={{ paddingLeft: `${0.75 + (depth + 1) * 0.85}rem` }}
            className="block py-2 pr-4 text-[13px] italic text-brand-dark"
          >
            View all {node.name}
          </Link>
          {node.children!.map((child) => (
            <AccordionNode key={child.id} node={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MobileMenu({ nav }: { nav: MenuNode[] }) {
  const [open, setOpen] = useState(false);

  // Lock scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-md text-maroon hover:bg-maroon-tint"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {/* Overlay */}
      <div
        onClick={close}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-display text-lg font-bold text-brand-dark">
            {site.name}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-page"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {nav.map((node) => (
            <AccordionNode key={node.id} node={node} depth={0} onNavigate={close} />
          ))}
        </div>

        <div className="border-t border-line px-4 py-3 text-[13px] text-ink-soft">
          <a href={site.phoneHref} className="flex items-center gap-2 font-semibold text-maroon">
            <Phone size={15} strokeWidth={1.75} /> {site.phone}
          </a>
          <a href={`mailto:${site.email}`} className="mt-1 flex items-center gap-2">
            <Mail size={15} strokeWidth={1.75} /> {site.email}
          </a>
        </div>
      </aside>
    </div>
  );
}

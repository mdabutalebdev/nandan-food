"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MenuNode } from "@/lib/types";

const ChevronDown = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={`h-3 w-3 ${className}`} fill="none" aria-hidden>
    <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Mega panel — flush under the nav, clean columns, no icons/bullets ── */
function MegaPanel({ tree, close }: { tree: MenuNode[]; close: () => void }) {
  return (
    <div className="absolute left-0 top-full z-40 w-full">
      <div className="border-t border-line bg-white shadow-xl ring-1 ring-black/5">
        {/* Category columns */}
        <div className="frame grid max-h-[72vh] grid-cols-4 gap-x-10 gap-y-8 overflow-y-auto py-7">
          {tree.map((root) => (
            <div key={root.id}>
              <Link
                href={root.href}
                onClick={close}
                className="block border-b border-line pb-2 text-[15px] font-bold text-ink transition-colors hover:text-brand"
              >
                {root.name}
              </Link>

              {!!root.children?.length && (
                <ul className="mt-3 space-y-1.5">
                  {root.children.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        href={sub.href}
                        onClick={close}
                        className="block text-[13.5px] text-ink-soft transition-colors hover:text-brand"
                      >
                        {sub.name}
                      </Link>
                      {!!sub.children?.length && (
                        <ul className="ml-3 mt-1 space-y-1 border-l border-line pl-3">
                          {sub.children.map((leaf) => (
                            <li key={leaf.id}>
                              <Link
                                href={leaf.href}
                                onClick={close}
                                className="block text-[12.5px] text-ink-soft transition-colors hover:text-maroon"
                              >
                                {leaf.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Top nav bar ─────────────────────────────────────────────────────── */
export default function DesktopNav({ nav }: { nav: MenuNode[] }) {
  const pathname = usePathname();
  const [megaOpen, setMegaOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const megaNode = nav.find((n) => n.mega);

  // Close on outside click, on Escape, and whenever the route changes.
  useEffect(() => {
    if (!megaOpen) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMegaOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMegaOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [megaOpen]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the panel after a navigation
  useEffect(() => setMegaOpen(false), [pathname]);

  const isActive = (href: string) => {
    const clean = href.split("#")[0];
    if (clean === "/") return pathname === "/";
    return clean !== "" && pathname.startsWith(clean);
  };

  const linkClass = (active: boolean) =>
    "relative flex h-full items-center gap-1 px-4 py-3 text-[13px] transition-colors " +
    (active ? "text-cream" : "text-white/90 hover:text-white");

  const Underline = ({ active }: { active: boolean }) => (
    <span
      className={`pointer-events-none absolute inset-x-4 bottom-1.5 h-0.5 rounded-full bg-cream transition-transform duration-200 ${
        active ? "scale-x-100" : "scale-x-0"
      }`}
    />
  );

  return (
    <nav ref={navRef} className="relative hidden bg-nav lg:block" aria-label="Primary">
      <ul className="frame flex items-stretch">
        {nav.map((node) => {
          const active = isActive(node.href);

          if (node.mega) {
            return (
              <li key={node.id} className="static">
                <button
                  type="button"
                  onClick={() => setMegaOpen((o) => !o)}
                  className={`${linkClass(active)} ${megaOpen ? "bg-white/10" : ""}`}
                  aria-expanded={megaOpen}
                >
                  <span className="nav-label">{node.name}</span>
                  <ChevronDown className={`mt-px transition-transform ${megaOpen ? "rotate-180" : ""}`} />
                  <Underline active={active} />
                </button>
              </li>
            );
          }

          return (
            <li key={node.id} className="group/nav relative">
              <Link href={node.href} onClick={() => setMegaOpen(false)} className={linkClass(active)}>
                <span className="nav-label">{node.name}</span>
                <Underline active={active} />
                <span className="pointer-events-none absolute inset-x-4 bottom-1.5 h-0.5 origin-left scale-x-0 rounded-full bg-cream transition-transform duration-200 group-hover/nav:scale-x-100" />
              </Link>
            </li>
          );
        })}
      </ul>

      {megaOpen && megaNode && <MegaPanel tree={megaNode.children ?? []} close={() => setMegaOpen(false)} />}
    </nav>
  );
}

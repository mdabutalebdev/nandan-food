"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, Eye, Quote, ArrowRight } from "lucide-react";
import { getAboutContent } from "@/lib/api";
import { site } from "@/lib/site";
import type { AboutContent } from "@/lib/types";
import ManagementSlider from "@/components/about/ManagementSlider";
import ClientsMarquee from "@/components/about/ClientsMarquee";
import CertificationsGrid from "@/components/about/CertificationsGrid";

/** Split a plain-text body into paragraphs (blank line = new paragraph). */
function Paragraphs({ text, className = "" }: { text?: string; className?: string }) {
  if (!text?.trim()) return null;
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={`space-y-3 ${className}`}>
      {paras.map((p, i) => (
        <p key={i} className="leading-relaxed text-ink-soft">
          {p}
        </p>
      ))}
    </div>
  );
}

/** Centered section heading. */
function SectionHeading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <span className="inline-block rounded-full bg-brand-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-2.5 font-display text-2xl font-extrabold text-ink">{title}</h2>
      {sub && <p className="mt-1.5 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

export default function AboutPage() {
  const [c, setC] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAboutContent().then((about) => {
      setC(about);
      setLoading(false);
    });
  }, []);

  // Sections render after the data loads, so a fresh visit to /about#section
  // has to scroll itself once the content is on the page.
  useEffect(() => {
    if (loading) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading]);

  const intro = c?.aboutIntro || {};
  const mission = c?.aboutMission || {};
  const vision = c?.aboutVision || {};
  const message = c?.ownerMessage || {};
  const management = c?.management || [];
  const clients = c?.clients || [];
  const certs = c?.certifications || [];
  const hasMessage = !!(message.message?.trim() || message.imageUrl);

  if (loading) {
    return (
      <div className="frame py-12">
        <div className="mx-auto max-w-3xl space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-page" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── About: left text, right image ──────────────────────── */}
      <section id="about" className="scroll-anchor">
        <div className="frame grid items-center gap-8 py-10 lg:grid-cols-2 lg:gap-12 lg:py-14">
          <div>
            <span className="inline-block rounded-full bg-brand-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark">
              {intro.eyebrow || "Who we are"}
            </span>
            <h2 className="mt-2.5 font-display text-2xl font-extrabold text-ink lg:text-[28px]">
              {intro.title || `About ${site.name}`}
            </h2>
            <Paragraphs text={intro.body} className="mt-4 text-[15px]" />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark">
                Explore products <ArrowRight size={16} />
              </Link>
              <Link href="/contact" className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand">
                Contact us
              </Link>
            </div>
          </div>

          <div className="relative">
            {intro.imageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-line shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={intro.imageUrl} alt={intro.title || site.name} className="aspect-[4/3] w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-brand-tint/70 to-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={site.logo} alt={site.name} className="h-20 w-auto opacity-80" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ───────────────────────────────────── */}
      {(mission.body?.trim() || vision.body?.trim()) && (
        <div className="border-y border-line bg-page">
          <div className="frame grid gap-5 py-10 lg:grid-cols-2 lg:py-12">
            <div id="mission" className="scroll-anchor rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Target size={22} strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-lg font-bold text-ink">{mission.title || "Mission"}</h3>
              </div>
              <Paragraphs text={mission.body} className="mt-3 text-sm" />
            </div>
            <div id="vision" className="scroll-anchor rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Eye size={22} strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-lg font-bold text-ink">{vision.title || "Vision"}</h3>
              </div>
              <Paragraphs text={vision.body} className="mt-3 text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* ── Message: left image, right message ─────────────────── */}
      {hasMessage && (
        <section id="message" className="scroll-anchor">
          <div className="frame py-10 lg:py-14">
            <div className="grid items-center gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
              <div className="mx-auto w-full max-w-[280px]">
                {message.imageUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-line shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={message.imageUrl} alt={message.name || "Message"} className="aspect-[4/5] w-full object-cover" />
                  </div>
                ) : null}
                {(message.name || message.designation) && (
                  <div className="mt-3 text-center">
                    {message.name && <p className="font-display text-base font-bold text-ink">{message.name}</p>}
                    {message.designation && <p className="text-sm font-medium text-brand">{message.designation}</p>}
                  </div>
                )}
              </div>

              <div>
                <span className="inline-block rounded-full bg-brand-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark">
                  {message.title || "Message"}
                </span>
                <Quote className="mt-3 text-brand/25" size={34} />
                <div className="mt-1.5">
                  <Paragraphs text={message.message} className="text-[15px] [&_p]:text-ink" />
                </div>
                {message.name && (
                  <p className="mt-5 font-display font-bold text-ink">
                    — {message.name}
                    {message.designation && <span className="font-normal text-ink-soft">, {message.designation}</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Our Management ─────────────────────────────────────── */}
      {management.length > 0 && (
        <div className="border-y border-line bg-page">
          <section id="management" className="scroll-anchor">
            <div className="frame py-10 lg:py-12">
              <SectionHeading eyebrow="Our team" title="Our Management" sub={`The people behind ${site.name}.`} />
              <div className="mt-8">
                <ManagementSlider members={management} />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Our Clients ────────────────────────────────────────── */}
      {clients.length > 0 && (
        <section id="clients" className="scroll-anchor">
          <div className="frame py-10 lg:py-12">
            <SectionHeading eyebrow="Trusted by" title="Our Clients" sub="Brands and businesses that partner with us." />
            <div className="mt-7">
              <ClientsMarquee clients={clients} />
            </div>
          </div>
        </section>
      )}

      {/* ── Certifications ─────────────────────────────────────── */}
      {certs.length > 0 && (
        <div className="border-t border-line bg-page">
          <section id="certifications" className="scroll-anchor">
            <div className="frame py-10 lg:py-12">
              <SectionHeading eyebrow="Trust & safety" title="Our Certifications" sub="Hover a certificate and click to view it in full." />
              <div className="mt-8">
                <CertificationsGrid items={certs} />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

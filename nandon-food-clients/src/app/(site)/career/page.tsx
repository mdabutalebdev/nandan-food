"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getSiteContent } from "@/lib/api";
import { site } from "@/lib/site";
import ApplyModal from "@/components/career/ApplyModal";

type Job = {
  _id?: string;
  title: string;
  location?: string;
  type?: string;
  department?: string;
  description?: string;
  deadline?: string;
  applyEmail?: string;
  applyLink?: string;
  active?: boolean;
  order?: number;
};

export default function CareerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [applyFor, setApplyFor] = useState<string | null>(null);

  useEffect(() => {
    getSiteContent().then((d) => {
      const arr = (d?.careers as Job[]) ?? [];
      setJobs(arr.filter((j) => j.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setLoaded(true);
    });
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand to-brand-dark py-14 text-white">
        <div className="frame text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-cream/90">Join our team</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Careers at {site.name}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            Help us bring fresh, 100% halal food to every home. Grow with a team that values quality, honesty and care.
          </p>
        </div>
      </section>

      <div className="frame py-8">
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-ink-soft">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span>/</span>
          <span className="font-semibold text-ink">Career</span>
        </nav>

        <h2 className="mb-5 font-display text-2xl font-extrabold text-ink">Open positions</h2>

        {!loaded ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-line bg-white" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-3xl">💼</div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink">No openings right now</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
              We’re not hiring at the moment, but we’re always happy to hear from great people. Send your CV and we’ll reach out when a role opens.
            </p>
            <button onClick={() => setApplyFor("General application")} className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
              Send your CV
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((j, i) => {
              const id = j._id || String(i);
              const isOpen = open === id;
              return (
                <li key={id} className="overflow-hidden rounded-xl border border-line bg-white">
                  <button
                    onClick={() => setOpen(isOpen ? null : id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-ink">{j.title}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                        {j.location && <span className="inline-flex items-center gap-1"><MapPin size={14} strokeWidth={1.75} /> {j.location}</span>}
                        {j.type && <span className="rounded bg-page px-2 py-0.5 font-semibold">{j.type}</span>}
                        {j.department && <span>{j.department}</span>}
                        {j.deadline && <span className="text-brand-dark">Apply by {j.deadline}</span>}
                      </p>
                    </div>
                    <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="border-t border-line px-5 py-4">
                      {j.description && <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{j.description}</p>}
                      <button
                        onClick={() => setApplyFor(j.title)}
                        className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
                      >
                        Apply now
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {applyFor !== null && <ApplyModal jobTitle={applyFor} onClose={() => setApplyFor(null)} />}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getLegalPage } from "@/lib/api";
import PageHero from "@/components/PageHero";

export default function ReturnPolicyPage() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Return & Refund Policy");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    getLegalPage("refund", ctrl.signal).then((p) => {
      if (p?.content) setContent(p.content);
      if (p?.title) setTitle(p.title);
      setLoading(false);
    });
    return () => ctrl.abort();
  }, []);

  return (
    <div>
      <PageHero eyebrow="Policy" title={title} subtitle="How returns, exchanges and refunds work." />
      <div className="frame pb-12 pt-5 lg:pb-16 lg:pt-7">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-page" />)}
          </div>
        ) : content ? (
          <article
            className="leading-relaxed text-ink-soft [&_h2]:mt-7 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-ink [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:mt-2 [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:mt-1 [&_a]:text-brand [&_a]:underline [&_strong]:font-bold [&_strong]:text-ink [&_b]:font-bold [&_b]:text-ink [&_blockquote]:mt-3 [&_blockquote]:border-l-4 [&_blockquote]:border-brand/30 [&_blockquote]:pl-4 [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-line bg-white py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-tint text-brand">
              <FileText size={22} strokeWidth={1.75} />
            </span>
            <p className="mt-4 font-display text-base font-bold text-ink">Policy coming soon</p>
            <p className="mt-1 text-sm text-ink-soft">Please contact us with any return questions.</p>
            <Link href="/contact" className="mt-5 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">Contact us</Link>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { adminUpdateLegalPage } from "@/lib/admin";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Button, Input, Toast, useToast } from "@/components/admin/ui";

export default function Page() {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/site-content/legal/refund`)
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data ?? j;
        setTitle(d?.title || "Return & Refund Policy");
        setContent(d?.content || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const res = await adminUpdateLegalPage("refund", { title, content });
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      toast.ok("Saved — now live on the Return Policy page.");
    } else {
      toast.fail(res.message || "Save failed. Are you logged in as admin?");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Return Policy</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            Compose the Return &amp; Refund Policy page with the rich text editor. Changes go live immediately.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/return-policy" target="_blank" className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
            View page ↗
          </Link>
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          You have unsaved changes — click <b>Save changes</b> to publish.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-lg border border-line bg-white" />
          <div className="h-96 animate-pulse rounded-lg border border-line bg-white" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Page title</label>
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              placeholder="Return & Refund Policy"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Content</label>
            <RichTextEditor
              value={content}
              onChange={(html) => { setContent(html); setDirty(true); }}
              placeholder="Write your return & refund policy…"
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              Use the toolbar for headings, bold, lists and links. Everything you write here shows on the public Return Policy page.
            </p>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} />
    </div>
  );
}

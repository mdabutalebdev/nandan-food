"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Phone, Mail, Briefcase, Download } from "lucide-react";
import {
  adminGetApplications,
  adminUpdateApplicationStatus,
  adminDeleteApplication,
  APPLICATION_STATUSES,
  type JobApplication,
  type ApplicationStatus,
} from "@/lib/admin";
import {
  Badge, Button, Card, EmptyState, Icon, ICONS, Input, Modal, Pagination,
  Select, TableSkeleton, Toast, useToast, downloadCsv, longDate, shortDate,
} from "@/components/admin/ui";

const STATUS_TONE: Record<ApplicationStatus, "brand" | "blue" | "green" | "red"> = {
  new: "brand",
  reviewed: "blue",
  shortlisted: "green",
  rejected: "red",
};

export default function AdminApplicationsPage() {
  const toast = useToast();

  const [rows, setRows] = useState<JobApplication[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"all" | ApplicationStatus>("all");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<JobApplication | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminGetApplications({
      page,
      limit: 20,
      status: status === "all" ? undefined : status,
      search: debounced || undefined,
    });
    setRows(res.rows);
    setMeta(res.meta);
    setSummary(res.summary);
    setLoading(false);
  }, [page, status, debounced]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch from API
    load();
  }, [load]);

  async function changeStatus(a: JobApplication, next: string) {
    const res = await adminUpdateApplicationStatus(a._id, next);
    if (res.ok) {
      toast.ok("Status updated.");
      setRows((r) => r.map((x) => (x._id === a._id ? { ...x, status: next as ApplicationStatus } : x)));
      setDetail((d) => (d && d._id === a._id ? { ...d, status: next as ApplicationStatus } : d));
      load();
    } else toast.fail(res.message || "Update failed.");
  }

  async function remove(a: JobApplication) {
    if (!confirm(`Delete ${a.name}'s application? This cannot be undone.`)) return;
    const res = await adminDeleteApplication(a._id);
    if (res.ok) {
      toast.ok("Application deleted.");
      setDetail(null);
      load();
    } else toast.fail(res.message || "Delete failed.");
  }

  function exportCsv() {
    downloadCsv("applications.csv", [
      ["Name", "Phone", "Email", "Applied for", "Status", "CV", "Date", "Cover letter"],
      ...rows.map((a) => [
        a.name, a.phone, a.email || "", a.jobTitle || "", a.status, a.cvUrl || "",
        a.createdAt ? longDate(a.createdAt) : "", a.coverLetter || "",
      ]),
    ]);
  }

  const tabs: { key: "all" | ApplicationStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "reviewed", label: "Reviewed" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Applications</h2>
          <p className="mt-0.5 text-sm text-ink-soft">Job applications submitted from the career page.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load}><Icon d={ICONS.refresh} className="h-4 w-4" /> Refresh</Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Icon d={ICONS.download} className="h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      {/* Status tabs with counts */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const active = status === t.key;
          const count = summary[t.key] ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => { setStatus(t.key); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                active ? "bg-brand text-white" : "border border-line bg-white text-ink hover:border-brand"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${active ? "bg-white/25" : "bg-page text-ink-soft"}`}>{count}</span>
            </button>
          );
        })}
        <div className="ml-auto w-full sm:w-64">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email, role…" />
        </div>
      </div>

      <Card bodyClass="p-0">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState Icon={FileText} title="No applications yet" desc="Applications from the career page will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-semibold">Applicant</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Applied for</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">CV</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a._id} className="border-b border-line last:border-0 hover:bg-page/50">
                    <td className="px-4 py-3">
                      <button onClick={() => setDetail(a)} className="font-semibold text-ink hover:text-brand">{a.name}</button>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      <div className="flex items-center gap-1.5"><Phone size={13} /> {a.phone}</div>
                      {a.email && <div className="mt-0.5 flex items-center gap-1.5 text-xs"><Mail size={12} /> {a.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{a.jobTitle || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{shortDate(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      {a.cvUrl ? (
                        <a href={a.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                          <Download size={14} /> CV
                        </a>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={a.status} onChange={(e) => changeStatus(a, e.target.value)} className="!py-1 !text-xs">
                        {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetail(a)} title="Details" className="rounded-md p-1.5 text-ink-soft hover:bg-page hover:text-brand"><Icon d={ICONS.eye} className="h-4 w-4" /></button>
                        <button onClick={() => remove(a)} title="Delete" className="rounded-md p-1.5 text-ink-soft hover:bg-red-50 hover:text-red-600"><Icon d={ICONS.trash} className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />
        )}
      </Card>

      {/* Details modal */}
      {detail && (
        <Modal
          title={detail.name}
          desc={detail.jobTitle ? `Applied for ${detail.jobTitle}` : "Application"}
          onClose={() => setDetail(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => remove(detail)}><Icon d={ICONS.trash} className="h-4 w-4" /> Delete</Button>
              {detail.cvUrl && (
                <a href={detail.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
                  <Download size={16} /> Download CV
                </a>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[detail.status]}>{detail.status}</Badge>
              <span className="text-xs text-ink-soft">Received {detail.createdAt ? longDate(detail.createdAt) : "—"}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-page/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-ink-soft"><Phone size={13} /> Phone</p>
                <p className="mt-1 text-sm text-ink">{detail.phone}</p>
              </div>
              <div className="rounded-lg border border-line bg-page/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-ink-soft"><Mail size={13} /> Email</p>
                <p className="mt-1 text-sm text-ink">{detail.email || "—"}</p>
              </div>
              <div className="rounded-lg border border-line bg-page/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-ink-soft"><Briefcase size={13} /> Applied for</p>
                <p className="mt-1 text-sm text-ink">{detail.jobTitle || "—"}</p>
              </div>
              <div className="rounded-lg border border-line bg-page/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-ink-soft"><FileText size={13} /> CV</p>
                {detail.cvUrl ? (
                  <a href={detail.cvUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                    <Download size={13} /> View / download
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft">Not attached</p>
                )}
              </div>
            </div>

            {detail.coverLetter && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ink-soft">Cover letter</p>
                <p className="whitespace-pre-line rounded-lg border border-line bg-white p-3 text-sm leading-relaxed text-ink">{detail.coverLetter}</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-ink-soft">Status</p>
              <Select value={detail.status} onChange={(e) => changeStatus(detail, e.target.value)}>
                {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </div>
          </div>
        </Modal>
      )}

      <Toast msg={toast.msg} />
    </div>
  );
}

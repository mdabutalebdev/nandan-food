"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import Link from "next/link";
import { authGet } from "@/lib/api";
import { adminGetUsers, adminUpdateUserStatus, adminDeleteUser, type AdminUser } from "@/lib/admin";
import {
  Badge, Button, EmptyState, Icon, ICONS, Input, PageHeader, Pagination, Select, Stat,
  TableSkeleton, Toast, useToast, bdt, downloadCsv, shortDate,
} from "@/components/admin/ui";

type UserStats = { total: number; active: number; blocked: number; admins: number; users: number; newUsersThisMonth: number };

export default function AdminCustomersPage() {
  const toast = useToast();

  const [rows, setRows] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminGetUsers({
      page, limit: 20, sort,
      searchTerm: debounced || undefined,
      role: role === "all" ? undefined : role,
      status: status === "all" ? undefined : status,
    });
    setRows(res.rows);
    setMeta(res.meta);
    setLoading(false);
  }, [page, sort, debounced, role, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is filled from the API, not derived from render
    load();
  }, [load]);
  useEffect(() => { authGet<UserStats>("/users/admin/stats").then(setStats); }, []);

  async function toggleBlock(u: AdminUser) {
    const next = u.status === "blocked" ? "active" : "blocked";
    if (!confirm(`${next === "blocked" ? "Block" : "Unblock"} ${u.firstName} ${u.lastName}?`)) return;
    const res = await adminUpdateUserStatus(u._id, next);
    if (res.ok) { toast.ok(`Customer ${next === "blocked" ? "blocked" : "unblocked"}.`); load(); }
    else toast.fail(res.message || "Update failed.");
  }

  async function remove(u: AdminUser) {
    if (!confirm(`Delete ${u.email}? Their past orders stay on record.`)) return;
    const res = await adminDeleteUser(u._id);
    if (res.ok) { toast.ok("Customer deleted."); load(); }
    else toast.fail(res.message || "Delete failed.");
  }

  function exportCsv() {
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Name", "Email", "Phone", "Role", "Status", "Orders", "Total spent", "Joined"],
      ...rows.map((u) => [
        `${u.firstName} ${u.lastName}`, u.email, u.phone || "", u.role, u.status,
        u.totalOrders ?? 0, u.totalSpent ?? 0, shortDate(u.createdAt),
      ]),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        desc="Everyone with an account — including guests auto-registered at checkout."
        actions={<Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Icon d={ICONS.download} /> Export CSV</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total customers" value={String(stats?.users ?? 0)} hint={`${stats?.admins ?? 0} admins`} />
        <Stat label="Active" value={String(stats?.active ?? 0)} tone="green" />
        <Stat label="Blocked" value={String(stats?.blocked ?? 0)} tone="red" />
        <Stat label="New this month" value={String(stats?.newUsersThisMonth ?? 0)} tone="blue" />
      </div>

      <div className="rounded-xl border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"><Icon d={ICONS.search} /></span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone…" className="pl-9" />
          </div>
          <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="all">All roles</option>
            <option value="user">Customers</option>
            <option value="admin">Admins</option>
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </Select>
          <Select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="-totalSpent">Highest spend</option>
            <option value="-totalOrders">Most orders</option>
            <option value="firstName">Name A–Z</option>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState Icon={Users} title="No customers found" desc="They appear here as soon as someone orders or registers." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Orders</th>
                    <th className="px-4 py-3 font-semibold">Total spent</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u._id} className="border-b border-line last:border-0 hover:bg-page/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                            {`${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{u.firstName} {u.lastName}</p>
                            <p className="truncate text-xs text-ink-soft">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{u.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders?searchTerm=${encodeURIComponent(u.phone || u.email)}`} className="font-semibold text-ink hover:text-brand">
                          {u.totalOrders ?? 0}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">{bdt(u.totalSpent ?? 0)}</td>
                      <td className="px-4 py-3"><Badge tone={u.role === "admin" ? "brand" : "slate"}>{u.role}</Badge></td>
                      <td className="px-4 py-3"><Badge tone={u.status === "active" ? "green" : "red"}>{u.status}</Badge></td>
                      <td className="px-4 py-3 text-ink-soft">{shortDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleBlock(u)}
                            title={u.status === "blocked" ? "Unblock" : "Block"}
                            className="rounded-md px-2 py-1 text-xs font-bold text-ink-soft hover:bg-page hover:text-ink"
                          >
                            {u.status === "blocked" ? "Unblock" : "Block"}
                          </button>
                          <button onClick={() => remove(u)} title="Delete" className="rounded-md p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                            <Icon d={ICONS.trash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />
          </>
        )}
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
}

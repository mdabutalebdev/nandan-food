"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { site } from "@/lib/site";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-line bg-page px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
    />
  );
}

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const redirectTo = useSearchParams().get("redirect");
  const isLogin = mode === "login";
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", password: "" });

  const upd =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const body = isLogin
        ? { email: form.email, password: form.password }
        : {
            firstName: form.firstName,
            lastName: form.lastName || ".",
            phone: form.phone,
            email: form.email,
            password: form.password,
          };
      const res = await fetch(`${API_BASE}/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);

      const { user, tokens } = json.data;
      localStorage.setItem("nandon_token", tokens.accessToken);
      localStorage.setItem("nandon_refresh", tokens.refreshToken);
      localStorage.setItem("nandon_user", JSON.stringify(user));
      setMsg({ type: "success", text: isLogin ? `Welcome back, ${user.firstName}!` : "Account created! Redirecting…" });
      // Role-based routing: admins → admin panel, everyone else → user dashboard.
      // A ?redirect= target (e.g. from a guarded page) wins for non-admins.
      const dest = user.role === "admin" ? "/admin/dashboard" : redirectTo || "/account";
      setTimeout(() => router.push(dest), 700);
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message || "Something went wrong. Is the server running?" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="frame py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-line bg-white p-7 shadow-sm sm:p-9">
          <div className="mb-7 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.logo} alt={site.name} className="mx-auto h-14 w-auto" />
            <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">
              {isLogin ? "Login to your account" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {isLogin ? "Welcome back to Nandon Foods" : "Join Nandon Foods today"}
            </p>
          </div>

          {msg && (
            <div
              className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${
                msg.type === "error" ? "bg-brand-tint text-brand-dark" : "bg-green-50 text-green-700"
              }`}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={submit} className="space-y-3.5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="First name" value={form.firstName} onChange={upd("firstName")} required />
                <Input placeholder="Last name" value={form.lastName} onChange={upd("lastName")} />
              </div>
            )}
            {!isLogin && <Input placeholder="Phone (01XXXXXXXXX)" value={form.phone} onChange={upd("phone")} />}
            <Input type="email" placeholder="Email address" value={form.email} onChange={upd("email")} required />
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={upd("password")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-soft hover:text-brand"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            {isLogin && (
              <div className="text-right">
                <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "Please wait…" : isLogin ? "Login" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            {isLogin ? "New to Nandon Foods? " : "Already have an account? "}
            <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-brand hover:underline">
              {isLogin ? "Create an account" : "Login"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

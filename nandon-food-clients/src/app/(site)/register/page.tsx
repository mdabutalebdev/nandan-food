import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="frame py-24 text-center text-ink-soft">Loading…</div>}>
      <AuthForm mode="register" />
    </Suspense>
  );
}

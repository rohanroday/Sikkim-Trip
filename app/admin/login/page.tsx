import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-4">
      <p className="kicker">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Sign in</h1>
      <p className="mt-2 text-ink-2">Only numbers listed in ADMIN_PHONES can sign in.</p>
      <div className="mt-8">
        <AdminLogin />
      </div>
    </main>
  );
}

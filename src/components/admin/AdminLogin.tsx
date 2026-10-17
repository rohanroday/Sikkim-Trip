"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (url: string, body: unknown) => {
    setBusy(true);
    setError("");
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) throw new Error(json.error ?? "Failed");
    return json;
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          if (!sent) {
            const r = await call("/api/auth/otp/request", { phone });
            setSent(true);
            setDevCode(r.devCode ?? null);
          } else {
            await call("/api/auth/otp/verify", { phone, code, admin: true });
            router.push("/admin");
            router.refresh();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }}
    >
      <div>
        <label htmlFor="ap" className="label">Phone</label>
        <input id="ap" type="tel" className="field" value={phone} disabled={sent} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {sent && (
        <div>
          <label htmlFor="ac" className="label">Code</label>
          <input id="ac" inputMode="numeric" maxLength={6} className="field font-mono tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          {devCode && <p className="hint">Local test mode code: <span className="font-mono">{devCode}</span></p>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-accent-hover">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{sent ? "Sign in" : "Send code"}</button>
    </form>
  );
}

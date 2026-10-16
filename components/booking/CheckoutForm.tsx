"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatINR } from "@/lib/money";

type HoldResponse = {
  code: string;
  token: string;
  amount: number;
  orderId: string | null;
  devPay: boolean;
};

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: () => void) => void };
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
  return json as T;
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your connection."));
    document.body.appendChild(s);
  });
}

export default function CheckoutForm(props: {
  request: Record<string, unknown>;
  total: number;
  signedInPhone: string | null;
  razorpayKey: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState(props.signedInPhone);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const r = await post<{ devCode?: string }>("/api/auth/otp/request", { phone });
      setCodeSent(true);
      setDevCode(r.devCode ?? null);
    });

  const verify = () =>
    run(async () => {
      const r = await post<{ phone: string }>("/api/auth/otp/verify", { phone, code });
      setVerifiedPhone(r.phone);
    });

  const pay = () =>
    run(async () => {
      const hold = await post<HoldResponse>("/api/bookings", { ...props.request, tourist: { name, email } });
      const statusUrl = `/booking/${hold.code}?t=${encodeURIComponent(hold.token)}`;

      if (hold.devPay) {
        await post("/api/dev/simulate-payment", { code: hold.code, token: hold.token });
        router.push(statusUrl);
        return;
      }
      await loadRazorpay();
      const rzp = new window.Razorpay!({
        key: props.razorpayKey,
        order_id: hold.orderId,
        amount: hold.amount,
        currency: "INR",
        name: "Sikkim Trip",
        description: `Booking ${hold.code}`,
        prefill: { name, email, contact: verifiedPhone },
        theme: { color: "#b3263e" },
        // Payment is confirmed by the webhook; this only takes the visitor to their booking page.
        handler: () => router.push(statusUrl),
        modal: { ondismiss: () => router.push(statusUrl) },
      });
      rzp.open();
    });

  const detailsOk = name.trim().length >= 2;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (verifiedPhone) pay();
      }}
    >
      <div>
        <label htmlFor="name" className="label">Full name</label>
        <input id="name" className="field" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <p className="hint">As on the ID of the lead guest.</p>
      </div>
      <div>
        <label htmlFor="email" className="label">Email (optional)</label>
        <input id="email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {verifiedPhone ? (
        <p className="rounded-xl bg-panel p-4 text-sm">
          WhatsApp number <strong className="font-mono">{verifiedPhone}</strong> is verified.
        </p>
      ) : (
        <div className="rounded-2xl bg-panel p-4">
          <label htmlFor="phone" className="label">WhatsApp number</label>
          <div className="flex gap-2">
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98xxxxxxxx"
              className="field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={codeSent}
            />
            {!codeSent && (
              <button type="button" className="btn btn-ghost shrink-0" disabled={busy || phone.replace(/\D/g, "").length < 10} onClick={sendCode}>
                Send code
              </button>
            )}
          </div>
          {codeSent && (
            <div className="mt-4">
              <label htmlFor="code" className="label">6-digit code</label>
              <div className="flex gap-2">
                <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field font-mono tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                <button type="button" className="btn btn-ghost shrink-0" disabled={busy || code.length !== 6} onClick={verify}>Verify</button>
              </div>
              {devCode && <p className="hint">Local test mode, WhatsApp is not connected. Your code is <span className="font-mono">{devCode}</span>.</p>}
              <button type="button" className="hint underline" onClick={() => { setCodeSent(false); setCode(""); }}>Change number</button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-[var(--accent-muted)] p-3 text-sm text-accent-hover">{error}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={busy || !verifiedPhone || !detailsOk}>
        {busy ? "One moment…" : `Pay ${formatINR(props.total)}`}
      </button>
      <p className="hint text-center">
        Your rooms are held for 10 minutes while you pay. Payments by Razorpay. See the <a className="underline" href="/cancellation-policy">cancellation policy</a>.
      </p>
    </form>
  );
}

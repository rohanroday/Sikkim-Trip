"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatINR } from "@/lib/money";

export default function CancelBooking({ code, token, refund, refundPct }: { code: string; token: string; refund: number; refundPct: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/bookings/${encodeURIComponent(code)}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, confirm: true }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Could not cancel. Please message us.");
    router.refresh();
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Cancel booking
      </button>
    );
  }
  return (
    <div className="w-full rounded-2xl border-[1.5px] border-line-strong bg-panel p-5" role="dialog" aria-labelledby="cancel-title">
      <p id="cancel-title" className="font-semibold">Cancel this booking?</p>
      <p className="mt-1 text-ink-2">
        {refund > 0 ? `You get ${formatINR(refund)} back (${refundPct}%).` : "Under the cancellation policy there is no refund this close to the trip."} This cannot be undone.
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-accent-hover">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>{busy ? "Cancelling…" : "Yes, cancel"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Keep my booking</button>
      </div>
    </div>
  );
}

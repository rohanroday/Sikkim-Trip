"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Guest = { name: string; age: string; gender: string; nationality: string; idType: string; idNumber: string; file: File | null };
const empty = (): Guest => ({ name: "", age: "", gender: "female", nationality: "Indian", idType: "aadhaar", idNumber: "", file: null });

const ID_TYPES = [
  ["aadhaar", "Aadhaar (masked is fine)"],
  ["passport", "Passport"],
  ["voter_id", "Voter ID"],
  ["driving_licence", "Driving licence"],
  ["pan", "PAN"],
] as const;

/** Shrink phone photos before upload: faster on hill networks and under the 4 MB limit. */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < 900_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82));
}

export default function GuestForm({ code, token, count }: { code: string; token: string; count: number }) {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>(() => Array.from({ length: count }, empty));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (i: number, patch: Partial<Guest>) => setGuests((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (guests.some((g) => !g.file)) return setError("Each guest needs an ID photo.");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("consent", consent ? "yes" : "no");
      form.set(
        "guests",
        JSON.stringify(guests.map((g) => ({ name: g.name, age: Number(g.age), gender: g.gender, nationality: g.nationality, idType: g.idType, idNumber: g.idNumber }))),
      );
      for (let i = 0; i < guests.length; i++) {
        const blob = await shrink(guests[i].file!);
        form.set(`file${i}`, blob, guests[i].file!.name.replace(/\.\w+$/, blob.type === "image/jpeg" ? ".jpg" : "$&"));
      }
      const res = await fetch(`/api/bookings/${encodeURIComponent(code)}/guests`, { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed. Please try again.");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) return <p className="rounded-2xl bg-panel p-5 font-medium text-ok" role="status">Thank you. All IDs are in. We will pass them to your operator.</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      {guests.map((g, i) => (
        <fieldset key={i} className="rounded-2xl bg-panel p-5">
          <legend className="font-display text-lg font-extrabold">Guest {i + 1}{i === 0 ? " (lead)" : ""}</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`n${i}`}>Name as on ID</label>
              <input id={`n${i}`} className="field" required value={g.name} onChange={(e) => set(i, { name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor={`a${i}`}>Age</label>
              <input id={`a${i}`} className="field" required inputMode="numeric" value={g.age} onChange={(e) => set(i, { age: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div>
              <label className="label" htmlFor={`g${i}`}>Gender</label>
              <select id={`g${i}`} className="field" value={g.gender} onChange={(e) => set(i, { gender: e.target.value })}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`na${i}`}>Nationality</label>
              <input id={`na${i}`} className="field" required value={g.nationality} onChange={(e) => set(i, { nationality: e.target.value })} />
              {g.nationality.trim() && g.nationality.trim().toLowerCase() !== "indian" && (
                <p className="hint text-warn">Foreign nationals need a PAP and some areas stay closed to them. We will check your route with the operator.</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor={`t${i}`}>ID type</label>
              <select id={`t${i}`} className="field" value={g.idType} onChange={(e) => set(i, { idType: e.target.value })}>
                {ID_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`id${i}`}>ID number</label>
              <input id={`id${i}`} className="field font-mono" required autoComplete="off" value={g.idNumber} onChange={(e) => set(i, { idNumber: e.target.value })} />
              <p className="hint">We keep only the last 4 characters.</p>
            </div>
            <div>
              <label className="label" htmlFor={`f${i}`}>Photo of the ID</label>
              <input id={`f${i}`} type="file" accept="image/*,application/pdf" capture="environment" className="field py-2.5" required onChange={(e) => set(i, { file: e.target.files?.[0] ?? null })} />
            </div>
          </div>
        </fieldset>
      ))}

      <label className="flex items-start gap-3 rounded-2xl bg-panel-2 p-4 text-sm leading-relaxed">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I agree to share these IDs with the registered operator on this trip, only to apply for the permit. They are stored privately and deleted 7 days after the trip ends.
        </span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-[var(--accent-muted)] p-3 text-sm text-accent-hover">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={busy || !consent}>
        {busy ? "Uploading…" : "Send IDs securely"}
      </button>
    </form>
  );
}

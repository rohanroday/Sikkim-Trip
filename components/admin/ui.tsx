/** Small building blocks for admin pages. */
import type { ReactNode } from "react";

export function Flash({ m }: { m?: string }) {
  if (!m) return null;
  const ok = m.startsWith("ok:");
  return (
    <p role="status" className={`mb-6 rounded-xl p-3 text-sm ${ok ? "bg-[#e3f1e8] text-ok" : "bg-[var(--accent-muted)] text-accent-hover"}`}>
      {m.slice(m.indexOf(":") + 1)}
    </p>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-ink-2">{sub}</p>}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-panel p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-4 font-display text-lg font-extrabold">{title}</h2>}
      {children}
    </section>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-panel shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-2">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line [&_td]:px-4 [&_td]:py-3 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  );
}

const TONE: Record<string, string> = {
  held: "bg-[#fff3d6] text-warn",
  paid: "bg-[#e0ecf3] text-glacier",
  confirmed: "bg-[#e3f1e8] text-ok",
  completed: "bg-panel-2 text-ink-2",
  expired: "bg-panel-2 text-ink-2",
  cancelled: "bg-[var(--accent-muted)] text-accent-hover",
  refunded: "bg-panel-2 text-ink-2",
  verified: "bg-[#e3f1e8] text-ok",
  pending: "bg-[#fff3d6] text-warn",
  suspended: "bg-[var(--accent-muted)] text-accent-hover",
  live: "bg-[#e3f1e8] text-ok",
  draft: "bg-panel-2 text-ink-2",
  paused: "bg-[#fff3d6] text-warn",
};

export function Badge({ value }: { value: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider ${TONE[value] ?? "bg-panel-2 text-ink-2"}`}>{value.replace(/_/g, " ")}</span>;
}

export function Field({ label, name, type = "text", required, defaultValue, placeholder, hint, step }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string | number; placeholder?: string; hint?: string; step?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} step={step} className="field" />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Area({ label, name, rows = 3, hint, placeholder }: { label: string; name: string; rows?: number; hint?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <textarea id={`f-${name}`} name={name} rows={rows} placeholder={placeholder} className="field" />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Select({ label, name, options, defaultValue }: { label: string; name: string; options: readonly (readonly [string, string])[]; defaultValue?: string }) {
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue} className="field">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

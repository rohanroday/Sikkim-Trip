export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>
      <div className="mt-8 space-y-4 leading-relaxed text-ink-2 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink [&_table]:w-full [&_table]:text-left [&_td]:border-b [&_td]:border-line [&_td]:py-2.5 [&_th]:border-b-2 [&_th]:border-line-strong [&_th]:py-2.5 [&_th]:text-ink">
        {children}
      </div>
    </article>
  );
}

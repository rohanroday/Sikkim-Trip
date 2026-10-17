/** Four plain reasons to trust the price, each with a simple line icon. */
const ITEMS = [
  {
    title: "Registered operators",
    body: "Permit trips run with Sikkim-registered operators and local drivers.",
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z M9 12l2 2 4-4" />,
  },
  {
    title: "Government fares",
    body: "Where the state fixes a fare, our price starts from it.",
    icon: <path d="M6 4h12v16l-3-2-3 2-3-2-3 2V4z M9 9h6 M9 13h4" />,
  },
  {
    title: "Live room calendar",
    body: "See which homestay rooms are free before you pay.",
    icon: <path d="M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M8 14h3" />,
  },
  {
    title: "IDs kept safe",
    body: "Used only for your permit, deleted 7 days after the trip.",
    icon: <path d="M6 11h12v9H6z M8 11V8a4 4 0 018 0v3 M12 15v2" />,
  },
];

export default function TrustStrip() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((i) => (
        <li key={i.title} className="flex gap-3 rounded-2xl border border-line/80 bg-panel p-4">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-6 w-6 shrink-0 text-glacier" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {i.icon}
          </svg>
          <div>
            <p className="font-semibold text-ink">{i.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{i.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

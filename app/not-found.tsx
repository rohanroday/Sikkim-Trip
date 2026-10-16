import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="kicker">404</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">This road does not go anywhere.</h1>
      <p className="mt-3 text-ink-2">The page may have moved, or the trip is no longer on sale.</p>
      <Link href="/" className="btn btn-primary mt-6">Back to the start</Link>
    </main>
  );
}

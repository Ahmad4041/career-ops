import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-[var(--fg)]">
      <h1 className="text-2xl font-semibold text-white">Not found</h1>
      <Link href="/" className="text-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}

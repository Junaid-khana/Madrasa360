import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-semibold text-brand-800">404</p>
      <p className="text-stone-600">Page not found</p>
      <Link href="/dashboard" className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white">Dashboard</Link>
    </div>
  );
}

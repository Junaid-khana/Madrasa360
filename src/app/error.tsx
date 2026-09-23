"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold text-stone-800">Something went wrong</p>
      <button onClick={reset} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white">Try again</button>
    </div>
  );
}

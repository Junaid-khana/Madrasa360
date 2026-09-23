"use client";
import { useDb } from "@/lib/db/store";
import { cn } from "@/lib/utils";

/** Madrasa logo: uploaded image if set, otherwise a simple crescent-and-star mark. */
export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const { settings } = useDb();
  if (settings.logo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={settings.logo} alt="" className={cn("rounded-xl bg-white object-contain", className)} />;
  return (
    <svg viewBox="0 0 48 48" className={cn(className)} aria-hidden>
      <rect width="48" height="48" rx="12" fill={tone === "dark" ? "#164e36" : "#ffffff"} />
      <path d="M31 12.5a13 13 0 1 0 0 23 10.5 10.5 0 1 1 0-23z" fill={tone === "dark" ? "#f8efd6" : "#164e36"} />
      <path d="m33 20 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#c39a2f" />
    </svg>
  );
}

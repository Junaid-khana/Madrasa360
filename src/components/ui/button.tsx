"use client";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-800 text-white hover:bg-brand-900 shadow-sm",
  secondary: "bg-white text-stone-800 border border-stone-300 hover:bg-stone-50",
  soft: "bg-brand-50 text-brand-800 hover:bg-brand-100",
  ghost: "text-stone-700 hover:bg-stone-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant], sizes[size], className,
  );

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant, size, loading, className, children, disabled, type = "button", ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ variant, size, className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function IconButton({ className, label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button" aria-label={label} title={label}
      className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-50", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

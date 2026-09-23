"use client";
import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const sizes = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" };

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof sizes;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Accessible dialog. Bottom sheet on phones, centred card on larger screens. */
export function Modal({ open, onClose, title, description, size = "md", footer, children, className }: ModalProps) {
  const t = useT();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} aria-hidden />
      <div
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cn("animate-fade-in relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl", sizes[size], className)}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-stone-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="-me-1 rounded-lg p-2 text-stone-500 hover:bg-stone-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 px-4 py-3 sm:px-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

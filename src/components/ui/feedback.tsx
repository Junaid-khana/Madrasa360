"use client";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Modal } from "./modal";

/* ---------------- toasts ---------------- */
type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; message: string }
interface ToastApi { success(m: string): void; error(m: string): void; info(m: string): void }

const ToastCtx = createContext<ToastApi | null>(null);
export const useToast = () => {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast must be used inside FeedbackProvider");
  return c;
};

/* ---------------- confirmation dialogs ---------------- */
interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn | null>(null);
/** `if (await confirm({ title: "Archive student?", tone: "danger" })) …` */
export const useConfirm = () => {
  const c = useContext(ConfirmCtx);
  if (!c) throw new Error("useConfirm must be used inside FeedbackProvider");
  return c;
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++seq.current;
    setToasts((l) => [...l.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push("success", m), error: (m) => push("error", m), info: (m) => push("info", m),
  }), [push]);

  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => setConfirmState({ ...o, resolve })), []);
  const settle = (v: boolean) => { confirmState?.resolve(v); setConfirmState(null); };

  const icons = { success: CheckCircle2, error: TriangleAlert, info: Info };
  const colors = { success: "text-brand-600", error: "text-red-500", info: "text-sky-500" };

  return (
    <ToastCtx.Provider value={api}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <div className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
          {toasts.map((x) => {
            const Icon = icons[x.kind];
            return (
              <div key={x.id} className="animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-lg">
                <Icon className={cn("mt-0.5 size-5 shrink-0", colors[x.kind])} />
                <p className="flex-1 text-sm text-stone-800">{x.message}</p>
                <button aria-label={t("Close")} onClick={() => setToasts((l) => l.filter((y) => y.id !== x.id))} className="text-stone-400 hover:text-stone-700"><X className="size-4" /></button>
              </div>
            );
          })}
        </div>
        <Modal
          open={!!confirmState} onClose={() => settle(false)} size="sm" title={t(confirmState?.title ?? "Are you sure?")}
          footer={<>
            <Button variant="secondary" onClick={() => settle(false)}>{t("Cancel")}</Button>
            <Button variant={confirmState?.tone === "danger" ? "danger" : "primary"} onClick={() => settle(true)}>{t(confirmState?.confirmLabel ?? "Confirm")}</Button>
          </>}
        >
          {confirmState?.message && <p className="text-sm text-stone-600">{t(confirmState.message)}</p>}
        </Modal>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

"use client";
import { useToast } from "@/components/ui/feedback";
import { useActor } from "@/lib/auth/auth";
import { useI18n } from "@/lib/i18n";
import { updateSettings } from "@/lib/services/settings";
import type { Settings } from "@/lib/types";

/** Saves a settings patch, writes an audit entry and shows a toast. */
export function useSaveSettings() {
  const actor = useActor();
  const toast = useToast();
  const { t } = useI18n();
  return (patch: Partial<Settings>, label: string) => {
    try { updateSettings(patch, actor, label); toast.success(t("Saved successfully")); }
    catch (e) { toast.error(e instanceof Error ? e.message : t("Something went wrong. Please try again.")); }
  };
}

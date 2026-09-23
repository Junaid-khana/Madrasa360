"use client";
import type { ReactNode } from "react";
import { PrintProvider } from "@/components/print/print";
import { FeedbackProvider } from "@/components/ui/feedback";
import { AuthProvider } from "@/lib/auth/auth";
import { I18nProvider, type Lang } from "@/lib/i18n";

export function Providers({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  return (
    <I18nProvider initialLang={initialLang}>
      <AuthProvider>
        <FeedbackProvider>
          <PrintProvider>{children}</PrintProvider>
        </FeedbackProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

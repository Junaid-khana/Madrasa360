"use client";
import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

/** Card with a translated title and a fixed-height chart area (children should use ResponsiveContainer). */
export function ChartCard({ title, description, action, height = 260, children }: { title: string; description?: string; action?: ReactNode; height?: number; children: ReactNode }) {
  const t = useT();
  return (
    <Card>
      <CardHeader title={t(title)} description={description ? t(description) : undefined} action={action} />
      <CardBody>
        {/* dir=ltr keeps axes/labels stable in RTL; numbers stay readable */}
        <div dir="ltr" style={{ height }} className="w-full">{children}</div>
      </CardBody>
    </Card>
  );
}

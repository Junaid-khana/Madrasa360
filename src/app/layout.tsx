import type { Metadata, Viewport } from "next";
import { Inter, Noto_Naskh_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { LANG_COOKIE } from "@/lib/constants";
import type { Lang } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--font-naskh", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Madrasa Management System", template: "%s · Madrasa Management System" },
  description: "Student records, attendance, Hifz progress, fees and donations for your madrasa.",
  robots: { index: false, follow: false }, // student data is sensitive: never index
};
export const viewport: Viewport = { themeColor: "#164e36", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const lang: Lang = jar.get(LANG_COOKIE)?.value === "ur" ? "ur" : "en";
  return (
    <html lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} className={`${inter.variable} ${naskh.variable}`}>
      <body>
        <Providers initialLang={lang}>{children}</Providers>
      </body>
    </html>
  );
}

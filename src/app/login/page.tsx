"use client";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { useDb } from "@/lib/db/store";
import { useI18n } from "@/lib/i18n";
import { DEMO_PASSWORD } from "@/lib/seed";

function LoginForm() {
  const { t, lang } = useI18n();
  const { user, loading, login } = useAuth();
  const db = useDb();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => { if (!loading && user) router.replace(next && next.startsWith("/") ? next : "/dashboard"); }, [loading, user, router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError(t("Enter your username and password")); return; }
    setBusy(true); setError("");
    const r = await login(username, password, remember);
    setBusy(false);
    if (!r.ok) setError(`${t(r.error)} ${t("Use one of the demo accounts below.")}`);
  };

  const demo = ["superadmin", "manager", "accountant", "teacher"].map((u) => db.users.find((x) => x.username === u)).filter(Boolean);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Logo tone="light" className="size-12" />
          <span className="text-lg font-semibold">{lang === "ur" ? db.settings.madrasaNameUr : db.settings.madrasaName}</span>
        </div>
        <div>
          <p lang="ar" dir="rtl" className="mb-6 font-[family-name:var(--font-urdu)] text-3xl leading-loose text-gold-100">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">{t("Madrasa Management System")}</h1>
          <p className="mt-4 max-w-md text-brand-100/80">{t("Student records, attendance, Hifz and fees in one place.")}</p>
        </div>
        <p className="flex max-w-md items-start gap-2 text-sm text-brand-100/70"><ShieldCheck className="mt-0.5 size-4 shrink-0" />{t("Student information is confidential. Access is limited to authorised staff.")}</p>
      </aside>

      <main className="flex flex-col bg-white px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden"><Logo className="size-9" /><span className="text-sm font-semibold text-brand-900">{lang === "ur" ? db.settings.madrasaNameUr : db.settings.madrasaName}</span></div>
          <LanguageSwitcher />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          <h2 className="text-2xl font-semibold text-stone-900">{t("Welcome back")}</h2>
          <p className="mt-1 text-sm text-stone-500">{t("Sign in to manage your madrasa")}</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && <Alert tone="danger">{error}</Alert>}
            <Field label={t("Username or email")}>
              <Input autoFocus name="madrasa-username" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} className="ltr" dir="ltr" />
            </Field>
            <Field label={t("Password")}>
              <div className="relative">
                <Input type={show ? "text" : "password"} name="madrasa-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="ltr pe-11" dir="ltr" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label="Show password" className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-stone-400 hover:text-stone-700">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <div className="flex items-center justify-between">
              <Checkbox label={t("Remember me")} checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <button type="button" onClick={() => setForgot(true)} className="text-sm font-medium text-brand-700 hover:underline">{t("Forgot password?")}</button>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={busy}>{t("Sign in")}</Button>
          </form>

          <div className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-medium text-stone-800">{t("Demo accounts")}</p>
            <p className="mt-0.5 text-xs text-stone-500">{t("Tap an account to fill in the sign-in form. Password for all demo accounts:")} <code dir="ltr" className="rounded bg-white px-1 py-0.5 text-stone-800">{DEMO_PASSWORD}</code></p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {demo.map((u) => (
                <button key={u!.id} type="button" onClick={() => { setUsername(u!.username); setPassword(DEMO_PASSWORD); setError(""); }}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-start text-xs hover:border-brand-400 hover:bg-brand-50">
                  <span className="block font-semibold text-stone-800">{t(ROLE_LABEL[u!.role])}</span>
                  <span dir="ltr" className="block truncate text-stone-500">{u!.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Modal open={forgot} onClose={() => setForgot(false)} title={t("Reset your password")} size="sm" footer={<Button onClick={() => setForgot(false)}>{t("Close")}</Button>}>
        <p className="text-sm text-stone-600">{t("For security, passwords are reset by the madrasa administrator. Please contact them and ask for a temporary password.")}</p>
      </Modal>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

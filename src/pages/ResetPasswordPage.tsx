import { useEffect, useState } from "react";
import { ChevronLeft, Home } from "lucide-react";
import { SEO } from "../components/SEO";
import type { Language } from "../types";
import { ApiError, resetPassword } from "../utils/api";
import { text } from "../utils/i18n";

type ResetPasswordPageProps = {
  language: Language;
  initialEmail: string;
  onBack: () => void;
  onLogin: () => void;
};

export function ResetPasswordPage({ language, initialEmail, onBack, onLogin }: ResetPasswordPageProps) {
  const t = text[language];
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [lockSeconds, setLockSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (lockSeconds <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setLockSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [lockSeconds]);

  const submit = async () => {
    setMessage("");

    if (password !== confirmPassword) {
      setMessage(t.passwordsMustMatch);
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, code, password, confirmPassword });
      setMessage(t.passwordResetSuccess);
      window.setTimeout(onLogin, 1000);
    } catch (error) {
      if (error instanceof ApiError && error.resetLockRemainingSeconds) {
        setLockSeconds(error.resetLockRemainingSeconds);
        setMessage(language === "vi" ? error.messageVi ?? t.resetLocked : error.message || t.resetLocked);
      } else if (error instanceof ApiError && typeof error.attemptsRemaining === "number") {
        setMessage(`${error.message}. ${t.attemptsRemaining}: ${error.attemptsRemaining}`);
      } else if (error instanceof ApiError && error.code === "GOOGLE_ACCOUNT") {
        setMessage(language === "vi" ? error.messageVi ?? error.message : error.message);
      } else {
        setMessage(error instanceof Error ? error.message : t.authError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <SEO
        title="Reset password"
        description="Private StayNest password reset page."
        canonicalPath="/reset-password"
        robots="noindex,nofollow"
      />
      <section className="rounded-lg bg-ink p-7 text-white">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
          <ChevronLeft size={18} /> {t.backMarketplace}
        </button>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
          <Home size={16} /> StayNest
        </p>
        <h1 className="text-4xl font-black tracking-tight">{t.resetPassword}</h1>
        <p className="mt-4 text-base leading-8 text-white/78">{t.resetPasswordCopy}</p>
      </section>
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <div className="grid gap-4">
          <ResetField label={t.email} value={email} onChange={setEmail} placeholder="you@example.com" />
          <ResetField label={t.resetCode} value={code} onChange={setCode} placeholder="123456" />
          <ResetField label={t.newPassword} value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          <ResetField label={t.confirmNewPassword} value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" type="password" />
        </div>
        {lockSeconds > 0 && <p className="mt-3 rounded-md bg-coral/10 p-3 text-sm font-bold text-coral">{t.resetLocked}: {lockSeconds}s</p>}
        {message && <p className="mt-4 rounded-md bg-ocean/10 p-3 text-sm font-bold text-ocean">{message}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!email || !code || !password || !confirmPassword || loading || lockSeconds > 0}
          className="mt-6 w-full rounded-md bg-ocean px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? t.processingPayment : t.resetPassword}
        </button>
      </section>
    </main>
  );
}

function ResetField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
      />
    </label>
  );
}

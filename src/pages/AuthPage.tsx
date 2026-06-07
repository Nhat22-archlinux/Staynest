import { useEffect, useState } from "react";
import { ChevronLeft, Home } from "lucide-react";
import { SEO } from "../components/SEO";
import type { AuthUser, Language, UserRole } from "../types";
import { ApiError, getGoogleAuthUrl, login, resendVerificationCode, signup, verifyCode } from "../utils/api";
import { text } from "../utils/i18n";

type AuthPageProps = {
  language: Language;
  mode: "login" | "signup";
  googleError?: boolean;
  onBack: () => void;
  onAuthed: (user: AuthUser, token: string) => void;
  onForgotPassword: () => void;
};

export function AuthPage({ language, mode, googleError = false, onBack, onAuthed, onForgotPassword }: AuthPageProps) {
  const t = text[language];
  const [authMode, setAuthMode] = useState(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("guest");
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLockSeconds, setResendLockSeconds] = useState(0);
  const [verificationLockSeconds, setVerificationLockSeconds] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);
  const isVerifying = Boolean(verificationEmail);

  useEffect(() => {
    setAuthMode(mode);
  }, [mode]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (resendLockSeconds <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setResendLockSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendLockSeconds]);

  useEffect(() => {
    if (verificationLockSeconds <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setVerificationLockSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [verificationLockSeconds]);

  useEffect(() => {
    if (lockSeconds <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setLockSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [lockSeconds]);

  const submitAuth = async () => {
    setError("");
    setLockSeconds(0);

    try {
      if (authMode === "signup") {
        const response = await signup({ name, email, password, role });

        if ("requiresVerification" in response) {
          setVerificationEmail(response.email);
          setDemoCode(response.demoCode ?? "");
          setResendCooldown(response.resendCooldownSeconds ?? 60);
          setResendLockSeconds(0);
          setVerificationLockSeconds(0);
          return;
        }

        onAuthed(response.user, response.token);
        return;
      }

      const response = await login({ email, password });
      onAuthed(response.user, response.token);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.code === "EMAIL_UNVERIFIED") {
        setVerificationEmail(caughtError.email ?? email);
        setResendCooldown(0);
        setResendLockSeconds(0);
        setVerificationLockSeconds(0);
        setError(language === "vi" ? caughtError.messageVi ?? t.verifyEmailBeforeLogin : caughtError.message || t.verifyEmailBeforeLogin);
        return;
      }

      if (caughtError instanceof ApiError && caughtError.lockRemainingSeconds) {
        setLockSeconds(caughtError.lockRemainingSeconds);
        setError(t.loginLocked);
        return;
      }

      setError(caughtError instanceof Error ? caughtError.message : t.authError);
    }
  };

  const submitVerification = async () => {
    setError("");

    try {
      const response = await verifyCode({ email: verificationEmail, code: verificationCode });
      setVerificationEmail("");
      setVerificationCode("");
      setDemoCode("");
      setVerificationLockSeconds(0);
      onAuthed(response.user, response.token);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.verificationLockRemainingSeconds) {
        setVerificationLockSeconds(caughtError.verificationLockRemainingSeconds);
        setError(language === "vi" ? caughtError.messageVi ?? t.verificationLocked : caughtError.message || t.verificationLocked);
        return;
      }

      if (caughtError instanceof ApiError && typeof caughtError.attemptsRemaining === "number") {
        setError(`${caughtError.message}. ${t.attemptsRemaining}: ${caughtError.attemptsRemaining}`);
        return;
      }

      setError(caughtError instanceof Error ? caughtError.message : t.verificationFailed);
    }
  };

  const resendCode = async () => {
    if (!verificationEmail || resendCooldown > 0 || resendLockSeconds > 0) {
      return;
    }

    setError("");

    try {
      const response = await resendVerificationCode(verificationEmail);
      setDemoCode(response.demoCode ?? "");
      setResendCooldown(response.resendCooldownSeconds ?? 60);
      setResendLockSeconds(response.resendLockRemainingSeconds ?? 0);
      setVerificationCode("");
      setVerificationLockSeconds(0);
      setError(t.codeSent);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.resendLockRemainingSeconds) {
        setResendLockSeconds(caughtError.resendLockRemainingSeconds);
        setError(language === "vi" ? caughtError.messageVi ?? t.resendLocked : caughtError.message || t.resendLocked);
        return;
      }

      setError(caughtError instanceof Error ? caughtError.message : t.authError);
    }
  };

  const continueWithGoogle = () => {
    const googleAuthUrl = getGoogleAuthUrl();
    if (import.meta.env.DEV) {
      console.info(`[StayNest] Redirecting to Google OAuth: ${googleAuthUrl}`);
    }
    window.location.href = googleAuthUrl;
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <SEO
        title={authMode === "signup" ? "Create a StayNest account" : "Login to StayNest"}
        description="Access your StayNest account to manage bookings, wishlists, vouchers, and host tools."
        canonicalPath={authMode === "signup" ? "/signup" : "/login"}
        robots="noindex,nofollow"
      />
      <section className="rounded-lg bg-ink p-7 text-white">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
          <ChevronLeft size={18} /> {t.backMarketplace}
        </button>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
          <Home size={16} /> StayNest
        </p>
        <h1 className="text-4xl font-black tracking-tight">{t.authTitle}</h1>
        <p className="mt-4 text-base leading-8 text-white/78">{t.authCopy}</p>
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        {!isVerifying && (
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`rounded-full px-4 py-2 text-sm font-black ${authMode === "login" ? "bg-white shadow-sm" : "text-slate-600"}`}
            >
              {t.login}
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`rounded-full px-4 py-2 text-sm font-black ${authMode === "signup" ? "bg-white shadow-sm" : "text-slate-600"}`}
            >
              {t.signup}
            </button>
          </div>
        )}

        {isVerifying ? (
          <div className="grid gap-4">
            <div className="rounded-md bg-ocean/10 p-4 text-sm font-bold text-ocean">
              {t.verificationSent} {verificationEmail}
              {demoCode && <span className="mt-2 block text-ink">{t.demoVerificationCode}: {demoCode}</span>}
              {verificationLockSeconds > 0 && <span className="mt-2 block text-coral">{t.verificationLocked}: {verificationLockSeconds}s</span>}
              {resendLockSeconds > 0 && <span className="mt-2 block text-coral">{t.resendLocked}: {resendLockSeconds}s</span>}
            </div>
            <AuthField label={t.verificationCode} value={verificationCode} onChange={setVerificationCode} placeholder="123456" />
          </div>
        ) : (
          <div className="grid gap-4">
            {authMode === "signup" && (
              <AuthField label={t.name} value={name} onChange={setName} placeholder="Alex Nguyen" />
            )}
            <AuthField label={t.email} value={email} onChange={setEmail} placeholder="you@example.com" />
            <AuthField label={t.password} value={password} onChange={setPassword} placeholder="••••••••" type="password" />

            {authMode === "signup" && (
              <label>
                <span className="mb-2 block text-sm font-black">{t.accountType}</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
                >
                  <option value="guest">{t.guestAccount}</option>
                  <option value="host">{t.hostAccount}</option>
                </select>
              </label>
            )}
          </div>
        )}

        {(error || googleError) && (
          <p className="mt-4 rounded-md bg-coral/10 p-3 text-sm font-bold text-coral">
            {googleError ? t.googleAuthError : error}
          </p>
        )}

        {isVerifying ? (
          <>
            <button
              type="button"
              onClick={submitVerification}
              disabled={verificationCode.length !== 6 || verificationLockSeconds > 0}
              className="mt-6 w-full rounded-md bg-ocean px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {t.verifyAccount}
            </button>
            <button
              type="button"
              onClick={resendCode}
              disabled={resendCooldown > 0 || resendLockSeconds > 0}
              className="mt-3 w-full rounded-md border border-black/10 bg-white px-6 py-3 text-sm font-black text-ink shadow-sm disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {resendLockSeconds > 0
                ? `${t.resendLocked} (${resendLockSeconds}s)`
                : resendCooldown > 0
                  ? `${t.resendCode} (${resendCooldown}s)`
                  : t.resendCode}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={submitAuth}
              disabled={lockSeconds > 0}
              className="mt-6 w-full rounded-md bg-ocean px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {lockSeconds > 0 ? `${t.loginLocked} (${lockSeconds}s)` : authMode === "signup" ? t.signup : t.login}
            </button>
            {authMode === "login" && (
              <button type="button" onClick={onForgotPassword} className="mt-3 text-sm font-black text-ocean hover:underline">
                {t.forgotPasswordQuestion}
              </button>
            )}
            <div className="my-4 flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Google
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              type="button"
              onClick={continueWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-black/10 bg-white px-6 py-3 text-sm font-black text-ink shadow-sm hover:bg-slate-50"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-xs font-black text-coral">G</span>
              {t.continueWithGoogle}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function AuthField({
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

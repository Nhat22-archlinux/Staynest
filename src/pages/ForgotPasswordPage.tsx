import { useState } from "react";
import { ChevronLeft, Home } from "lucide-react";
import type { Language } from "../types";
import { forgotPassword } from "../utils/api";
import { text } from "../utils/i18n";

type ForgotPasswordPageProps = {
  language: Language;
  onBack: () => void;
  onReset: (email: string) => void;
};

export function ForgotPasswordPage({ language, onBack, onReset }: ForgotPasswordPageProps) {
  const t = text[language];
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setMessage("");
    setDemoCode("");

    try {
      const response = await forgotPassword(email);
      setMessage(response.code === "GOOGLE_ACCOUNT" ? (language === "vi" ? response.messageVi ?? response.message : response.message) : t.resetEmailSent);
      setDemoCode(response.demoCode ?? "");
      if (response.code !== "GOOGLE_ACCOUNT") {
        window.setTimeout(() => onReset(email), 800);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.authError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <section className="rounded-lg bg-ink p-7 text-white">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
          <ChevronLeft size={18} /> {t.backMarketplace}
        </button>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
          <Home size={16} /> StayNest
        </p>
        <h1 className="text-4xl font-black tracking-tight">{t.forgotPassword}</h1>
        <p className="mt-4 text-base leading-8 text-white/78">{t.forgotPasswordCopy}</p>
      </section>
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <label>
          <span className="mb-2 block text-sm font-black">{t.email}</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
          />
        </label>
        {message && <p className="mt-4 rounded-md bg-ocean/10 p-3 text-sm font-bold text-ocean">{message}</p>}
        {demoCode && <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-ink">{t.demoVerificationCode}: {demoCode}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!email || loading}
          className="mt-6 w-full rounded-md bg-ocean px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? t.processingPayment : t.sendResetCode}
        </button>
      </section>
    </main>
  );
}

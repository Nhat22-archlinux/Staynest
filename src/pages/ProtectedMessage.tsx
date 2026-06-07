import { ChevronLeft } from "lucide-react";
import { SEO } from "../components/SEO";
import type { Language } from "../types";
import { text } from "../utils/i18n";

type ProtectedMessageProps = {
  language: Language;
  message: string;
  onBack: () => void;
  onLogin?: () => void;
};

export function ProtectedMessage({ language, message, onBack, onLogin }: ProtectedMessageProps) {
  const t = text[language];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <SEO
        title="Protected page"
        description="Private StayNest protected page."
        canonicalPath="/"
        robots="noindex,nofollow"
      />
      <section className="rounded-lg border border-black/10 bg-white p-8 text-center shadow-sm">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold">
          <ChevronLeft size={18} /> {t.backMarketplace}
        </button>
        <h1 className="text-3xl font-black tracking-tight">{message}</h1>
        {onLogin && (
          <button onClick={onLogin} className="mt-6 rounded-md bg-ocean px-6 py-3 text-sm font-black text-white">
            {t.login}
          </button>
        )}
      </section>
    </main>
  );
}

import { SEO } from "../components/SEO";
import type { Language } from "../types";
import { text } from "../utils/i18n";

type PaymentCancelPageProps = {
  language: Language;
  onBack: () => void;
};

export function PaymentCancelPage({ language, onBack }: PaymentCancelPageProps) {
  const t = text[language];

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
      <SEO
        title="Payment cancelled"
        description="Private StayNest payment cancellation page."
        canonicalPath="/payment/cancel"
        robots="noindex,nofollow"
      />
      <section className="w-full rounded-lg border border-black/10 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-coral">Stripe</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{t.paymentCancelled}</h1>
        <p className="mt-3 text-sm font-semibold text-slate-600">{t.paymentCancelledCopy}</p>
        <button type="button" onClick={onBack} className="mt-6 rounded-md bg-ink px-6 py-3 text-sm font-black text-white">
          {t.backMarketplace}
        </button>
      </section>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { SEO } from "../components/SEO";
import type { Booking, Language } from "../types";
import { finalizeStripeCheckoutSession } from "../utils/api";
import { formatPrice } from "../utils/currency";
import { text } from "../utils/i18n";

type PaymentSuccessPageProps = {
  language: Language;
  token: string | null;
  onDone: () => void;
};

export function PaymentSuccessPage({ language, token, onDone }: PaymentSuccessPageProps) {
  const t = text[language];
  const [booking, setBooking] = useState<Booking | null>(null);
  const [message, setMessage] = useState(t.processingPayment);
  const finalizedRef = useRef(false);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");

    if (finalizedRef.current) {
      return;
    }

    if (!sessionId || !token) {
      setMessage(t.paymentVerificationFailed);
      return;
    }

    finalizedRef.current = true;
    finalizeStripeCheckoutSession(sessionId, token)
      .then((createdBooking) => {
        setBooking(createdBooking);
        setMessage(t.paymentSuccessful);
        window.setTimeout(onDone, 3000);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : t.paymentVerificationFailed);
      });
  }, [onDone, t.paymentSuccessful, t.paymentVerificationFailed, t.processingPayment, token]);

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
      <SEO
        title="Payment success"
        description="Private StayNest payment confirmation."
        canonicalPath="/payment/success"
        robots="noindex,nofollow"
      />
      {booking && (
        <div className="fixed right-4 top-20 z-50 rounded-lg bg-ink px-5 py-4 text-sm font-black text-white shadow-soft">
          <p>{t.paymentSuccessful}</p>
          <p className="mt-1 text-white/80">{t.bookingCode}: {booking.bookingCode}</p>
        </div>
      )}
      <section className="w-full rounded-lg border border-black/10 bg-white p-8 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-ocean">Stripe</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{message}</h1>
        {booking && (
          <div className="mt-6 grid gap-3 rounded-md bg-slate-50 p-4 text-sm font-bold">
            <div className="flex justify-between"><span>{t.bookingCode}</span><span>{booking.bookingCode}</span></div>
            <div className="flex justify-between"><span>{t.paymentStatus}</span><span>{t.paid}</span></div>
            <div className="flex justify-between"><span>{t.paymentMethod}</span><span>{t.payByCard}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-black">
              <span>{t.finalTotal}</span><span>{formatPrice(booking.finalTotal ?? booking.totalPriceUsd, language)}</span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

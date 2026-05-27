import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { AuthUser, Booking, BookingStatus, Language } from "../types";
import { fetchBookings, updateBookingStatus } from "../utils/api";
import { formatPrice } from "../utils/currency";
import { text } from "../utils/i18n";

type BookingsPageProps = {
  language: Language;
  token: string | null;
  user: AuthUser | null;
  onBack: () => void;
};

export function BookingsPage({ language, token, user, onBack }: BookingsPageProps) {
  const t = text[language];
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchBookings(token).then(setBookings).catch(() => setBookings([]));
  }, [token]);

  const changeStatus = async (booking: Booking, status: BookingStatus) => {
    if (!token || !booking._id) {
      return;
    }

    try {
      const updated = await updateBookingStatus(booking._id, status, token);
      setBookings((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.bookingStatusFailed);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ChevronLeft size={18} /> {t.backMarketplace}
      </button>
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black tracking-tight">{user?.role === "host" ? t.hostBookings : t.bookingHistory}</h1>
        {message && <p className="mt-3 rounded-md bg-coral/10 p-3 text-sm font-bold text-coral">{message}</p>}
        <div className="mt-6 grid gap-4">
          {bookings.map((booking) => (
            <article key={booking._id ?? booking.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">{booking.homestayTitle}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-xl font-black text-ocean">{formatPrice(booking.finalTotal ?? booking.totalPriceUsd, language)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-700">
                {booking.bookingCode && <span className="rounded-full bg-slate-100 px-3 py-1">{booking.bookingCode}</span>}
                <span className="rounded-full bg-slate-100 px-3 py-1">{booking.guests} {t.guests.toLowerCase()}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{booking.nights} {t.perNight}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{t[booking.status ?? "pending"]}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{booking.paymentMethod === "card" ? t.payByCard : t.payAtProperty}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{booking.paymentStatus === "paid" ? t.paid : t.unpaid}</span>
              </div>
              {user?.role === "host" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.status === "pending" && (
                    <>
                      <button type="button" onClick={() => changeStatus(booking, "confirmed")} className="min-w-32 flex-1 rounded-md bg-ocean px-4 py-2 text-sm font-black text-white sm:flex-none">
                        {t.confirm}
                      </button>
                      <button type="button" onClick={() => changeStatus(booking, "rejected")} className="min-w-32 flex-1 rounded-md border border-black/10 px-4 py-2 text-sm font-black hover:bg-slate-50 sm:flex-none">
                        {t.reject}
                      </button>
                    </>
                  )}
                  {booking.status === "confirmed" && (
                    <>
                      <button type="button" onClick={() => changeStatus(booking, "completed")} className="min-w-32 flex-1 rounded-md bg-ink px-4 py-2 text-sm font-black text-white sm:flex-none">
                        {booking.paymentMethod === "pay_at_property" ? t.completeAndMarkCashCollected : t.markCompleted}
                      </button>
                      <button type="button" onClick={() => changeStatus(booking, "cancelled")} className="min-w-32 flex-1 rounded-md border border-black/10 px-4 py-2 text-sm font-black hover:bg-slate-50 sm:flex-none">
                        {t.cancel}
                      </button>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
        {bookings.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-black">{t.noBookings}</p>
          </div>
        )}
      </section>
    </main>
  );
}

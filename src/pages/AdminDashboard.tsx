import { useEffect, useState } from "react";
import { SEO } from "../components/SEO";
import type { AdminStats, AdminUser, Booking, BookingStatus, Homestay, Language, PaymentStatus, Review, UserRole } from "../types";
import {
  deleteAdminHomestay,
  fetchAdminBookings,
  fetchAdminHomestays,
  fetchAdminPayments,
  fetchAdminReviews,
  fetchAdminStats,
  fetchAdminUsers,
  updateAdminHomestay,
  updateAdminReview,
  updateAdminUser,
} from "../utils/api";
import { formatPrice } from "../utils/currency";
import { text } from "../utils/i18n";

type AdminSection = "dashboard" | "users" | "homestays" | "bookings" | "payments" | "reviews";

type AdminDashboardProps = {
  language: Language;
  token: string;
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onBack: () => void;
};

const sections: AdminSection[] = ["dashboard", "users", "homestays", "bookings", "payments", "reviews"];
const roles: Array<UserRole | "all"> = ["all", "guest", "host", "admin"];
const bookingStatuses: Array<BookingStatus | "all"> = ["all", "pending", "confirmed", "rejected", "completed", "cancelled", "expired"];
const paymentStatuses: Array<PaymentStatus | "all"> = ["all", "paid", "unpaid", "refunded"];

function sectionLabel(section: AdminSection, language: Language) {
  const t = text[language];
  return {
    dashboard: t.adminDashboard,
    users: t.adminUsers,
    homestays: t.adminHomestays,
    bookings: t.adminBookings,
    payments: t.adminPayments,
    reviews: t.adminReviews,
  }[section];
}

function personName(value: unknown) {
  if (value && typeof value === "object" && "name" in value) {
    return String((value as { name?: string }).name ?? "Unknown");
  }

  return typeof value === "string" ? value : "Unknown";
}

function stayTitle(value: unknown, fallback = "Untitled") {
  if (value && typeof value === "object" && "title" in value) {
    return String((value as { title?: string }).title ?? fallback);
  }

  return fallback;
}

function StatusPill({ children, tone = "slate" }: { children: string; tone?: "slate" | "green" | "red" | "amber" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${colors[tone]}`}>{children}</span>;
}

export function AdminDashboard({ language, token, section, onSectionChange, onBack }: AdminDashboardProps) {
  const t = text[language];
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState("");
  const [hostFilter, setHostFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [listingStatus, setListingStatus] = useState<"all" | "visible" | "hidden">("all");
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | "all">("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      if (section === "dashboard") setStats(await fetchAdminStats(token));
      if (section === "users") setUsers(await fetchAdminUsers(token, { search, role: roleFilter }));
      if (section === "homestays") setHomestays(await fetchAdminHomestays(token, { host: hostFilter, location: locationFilter, status: listingStatus }));
      if (section === "bookings") setBookings(await fetchAdminBookings(token, { status: bookingStatus, paymentStatus }));
      if (section === "payments") setPayments(await fetchAdminPayments(token, paymentStatus));
      if (section === "reviews") setReviews(await fetchAdminReviews(token));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Admin request failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [section, roleFilter, listingStatus, bookingStatus, paymentStatus]);

  const updateUser = async (id: string, payload: { role?: UserRole; isDisabled?: boolean }) => {
    const updated = await updateAdminUser(id, payload, token);
    setUsers((current) => current.map((user) => (user._id === id ? updated : user)));
  };

  const toggleHomestay = async (stay: Homestay) => {
    const updated = await updateAdminHomestay(stay.id, { isHidden: !stay.isHidden }, token);
    setHomestays((current) => current.map((item) => (String(item.id) === String(stay.id) ? updated : item)));
  };

  const removeHomestay = async (stay: Homestay) => {
    await deleteAdminHomestay(stay.id, token);
    setHomestays((current) => current.filter((item) => String(item.id) !== String(stay.id)));
  };

  const toggleReview = async (review: Review) => {
    const id = review._id ?? review.id;
    if (!id) return;
    const updated = await updateAdminReview(id, { isHidden: !review.isHidden }, token);
    setReviews((current) => current.map((item) => ((item._id ?? item.id) === id ? updated : item)));
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SEO
        title="Admin dashboard"
        description="Private StayNest admin operations dashboard."
        canonicalPath={`/admin/${section}`}
        robots="noindex,nofollow"
      />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-coral">{t.adminDashboard}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">{sectionLabel(section, language)}</h1>
        </div>
        <button onClick={onBack} className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-black shadow-sm">
          {t.backMarketplace}
        </button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {sections.map((item) => (
          <button
            key={item}
            onClick={() => onSectionChange(item)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${section === item ? "bg-ink text-white" : "bg-white text-slate-700"}`}
          >
            {sectionLabel(item, language)}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {loading && <div className="mb-4 text-sm font-bold text-slate-500">{language === "vi" ? "Đang tải..." : "Loading..."}</div>}

      {section === "dashboard" && stats && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [t.totalUsers, stats.totalUsers],
              [t.totalHosts, stats.totalHosts],
              [t.totalHomestays, stats.totalHomestays],
              [t.totalBookings, stats.totalBookings],
              [t.pendingBookings, stats.pendingBookings],
              [t.monthlyPlatformRevenue, formatPrice(stats.monthlyPlatformRevenue, language)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-ink">{value}</p>
              </div>
            ))}
          </div>
          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">{t.lowRatedListings}</h2>
            <div className="mt-4 grid gap-3">
              {stats.lowRatedListings.length === 0 && <p className="text-sm font-semibold text-slate-500">{t.noStays}</p>}
              {stats.lowRatedListings.map((stay) => (
                <div key={stay.id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black">{stay.title}</p>
                    <p className="text-sm font-semibold text-slate-500">{stay.location} · {stay.rating}</p>
                  </div>
                  {stay.isHidden && <StatusPill tone="amber">{t.hidden}</StatusPill>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {section === "users" && (
        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchUsers} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold outline-none focus:border-ocean" />
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as UserRole | "all")} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-bold">
              {roles.map((role) => <option key={role} value={role}>{role === "all" ? t.allRoles : role}</option>)}
            </select>
            <button onClick={() => void refresh()} className="rounded-lg bg-ink px-5 py-2.5 text-sm font-black text-white">{t.search}</button>
          </div>
          <div className="grid gap-3">
            {users.map((adminUser) => (
              <div key={adminUser._id} className="grid gap-3 rounded-lg bg-slate-50 p-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto] lg:items-center">
                <div>
                  <p className="font-black">{adminUser.name}</p>
                  <p className="text-sm font-semibold text-slate-500">{adminUser.email}</p>
                </div>
                <StatusPill tone={adminUser.isDisabled ? "red" : "green"}>{adminUser.isDisabled ? t.disabled : t.enabled}</StatusPill>
                <select value={adminUser.role} onChange={(event) => void updateUser(adminUser._id, { role: event.target.value as UserRole })} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold">
                  <option value="guest">{t.guestAccount}</option>
                  <option value="host">{t.hostAccount}</option>
                  <option value="admin">{t.adminAccount}</option>
                </select>
                <button onClick={() => void updateUser(adminUser._id, { isDisabled: !adminUser.isDisabled })} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black">
                  {adminUser.isDisabled ? t.enable : t.disable}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === "homestays" && (
        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input value={hostFilter} onChange={(event) => setHostFilter(event.target.value)} placeholder={language === "vi" ? "ID chủ nhà" : "Host id"} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold outline-none focus:border-ocean" />
            <input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder={t.location} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold outline-none focus:border-ocean" />
            <select value={listingStatus} onChange={(event) => setListingStatus(event.target.value as "all" | "visible" | "hidden")} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-bold">
              <option value="all">{language === "vi" ? "Tất cả trạng thái" : "All statuses"}</option>
              <option value="visible">{t.visible}</option>
              <option value="hidden">{t.hidden}</option>
            </select>
            <button onClick={() => void refresh()} className="rounded-lg bg-ink px-5 py-2.5 text-sm font-black text-white">{t.search}</button>
          </div>
          <div className="grid gap-3">
            {homestays.map((stay) => (
              <div key={stay.id} className="grid gap-3 rounded-lg bg-slate-50 p-4 lg:grid-cols-[1.2fr_0.8fr_0.5fr_auto] lg:items-center">
                <div>
                  <p className="font-black">{stay.title}</p>
                  <p className="text-sm font-semibold text-slate-500">{stay.location} · {stay.host}</p>
                </div>
                <p className="text-sm font-bold text-slate-600">{formatPrice(stay.price, language)} · {stay.rating}</p>
                <StatusPill tone={stay.isHidden ? "amber" : "green"}>{stay.isHidden ? t.hidden : t.visible}</StatusPill>
                <div className="flex flex-wrap gap-2">
                  <a href={`/homestays/${stay.id}`} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black">{language === "vi" ? "Xem" : "View"}</a>
                  <button onClick={() => void toggleHomestay(stay)} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black">{stay.isHidden ? t.unhide : t.hide}</button>
                  <button onClick={() => void removeHomestay(stay)} className="rounded-full bg-coral px-4 py-2 text-sm font-black text-white">{t.delete}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === "bookings" && (
        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-3">
            <select value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value as BookingStatus | "all")} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-bold">
              {bookingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus | "all")} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-bold">
              {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="grid gap-3">
            {bookings.map((booking) => (
              <div key={booking._id ?? booking.id} className="grid gap-2 rounded-lg bg-slate-50 p-4 lg:grid-cols-[0.8fr_1fr_0.8fr_0.8fr] lg:items-center">
                <p className="font-black">{booking.bookingCode}</p>
                <p className="text-sm font-semibold text-slate-600">{stayTitle(booking.homestay, booking.homestayTitle)}</p>
                <p className="text-sm font-semibold text-slate-600">{personName(booking.user)} → {personName(booking.host)}</p>
                <p className="text-sm font-black">{booking.status} · {booking.paymentStatus} · {formatPrice(booking.finalTotal ?? booking.totalPriceUsd, language)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === "payments" && (
        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus | "all")} className="mb-4 rounded-lg border border-black/10 px-4 py-2.5 text-sm font-bold">
            {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <div className="grid gap-3">
            {payments.map((payment) => (
              <div key={payment._id ?? payment.id} className="rounded-lg bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-black">{payment.bookingCode}</p>
                  <p className="text-sm font-black">{payment.paymentMethod} · {payment.paymentStatus} · {formatPrice(payment.finalTotal ?? payment.totalPriceUsd, language)}</p>
                </div>
                <p className="mt-2 break-all text-xs font-semibold text-slate-500">{t.paymentId}: {payment.stripeSessionId || "N/A"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === "reviews" && (
        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid gap-3">
            {reviews.map((review) => (
              <div key={review._id ?? review.id} className="rounded-lg bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black">{stayTitle(review.homestay)} · {review.rating}/5</p>
                    <p className="text-sm font-semibold text-slate-500">{review.userName}</p>
                  </div>
                  <button onClick={() => void toggleReview(review)} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black">
                    {review.isHidden ? t.unhide : t.hide}
                  </button>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">{review.comment}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

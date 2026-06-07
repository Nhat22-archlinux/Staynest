import { useEffect, useMemo, useState } from "react";
import { Bath, BedDouble, ChevronLeft, Edit3, MapPin, Star, Users } from "lucide-react";
import { Fact } from "../components/Fact";
import { SEO } from "../components/SEO";
import type { AuthUser, Booking, BookingStatus, Homestay, Language, Review } from "../types";
import { fetchBookings, fetchHomestayReviews, replyToReview, updateBookingStatus } from "../utils/api";
import { formatPrice } from "../utils/currency";
import { getPriceBreakdown } from "../utils/discount";
import { amenityLabels, formatListingType, text } from "../utils/i18n";
import { homestayImageAlt, optimizeCloudinaryImage } from "../utils/seo";

type HostListingPageProps = {
  language: Language;
  stay: Homestay;
  user: AuthUser;
  token: string | null;
  onBack: () => void;
  onEdit: (id: Homestay["id"]) => void;
  onStatusChange?: (booking: Booking) => void;
};

function bookingHomestayId(booking: Booking) {
  if (typeof booking.homestay === "object") {
    return booking.homestay?.id ?? booking.homestay?._id;
  }

  return booking.homestay;
}

function overlaps(first: Booking, second: Booking) {
  return new Date(first.checkIn) < new Date(second.checkOut) && new Date(first.checkOut) > new Date(second.checkIn);
}

export function HostListingPage({ language, stay, user, token, onBack, onEdit, onStatusChange }: HostListingPageProps) {
  const t = text[language];
  const price = getPriceBreakdown(stay);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const ownListing = String(stay.owner) === String(user.id) || stay.host === user.name;

  useEffect(() => {
    if (!token || !ownListing) {
      setBookings([]);
      return;
    }

    fetchBookings(token).then(setBookings).catch(() => setBookings([]));
  }, [token, ownListing]);

  useEffect(() => {
    if (!ownListing) {
      setReviews([]);
      return;
    }

    fetchHomestayReviews(stay.id).then(setReviews).catch(() => setReviews([]));
  }, [ownListing, stay.id]);

  const listingBookings = useMemo(
    () => bookings.filter((booking) => String(bookingHomestayId(booking)) === String(stay.id)),
    [bookings, stay.id],
  );
  const displayedReviewCount = reviews.length || stay.reviews;
  const displayedRating =
    reviews.length > 0 ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2)) : stay.rating;

  const availabilityForBooking = (booking: Booking) => {
    const overlappingBookedRooms = listingBookings.filter((item) => {
      const itemId = item._id ?? item.id;
      const bookingId = booking._id ?? booking.id;
      return itemId !== bookingId && (item.status === "confirmed" || item.status === "completed") && overlaps(item, booking);
    }).length;

    return Math.max(Number(stay.availableRooms ?? stay.totalRooms ?? 0) - overlappingBookedRooms, 0);
  };

  const changeStatus = async (booking: Booking, status: BookingStatus) => {
    if (!token || !booking._id) {
      return;
    }

    try {
      const updated = await updateBookingStatus(booking._id, status, token);
      setBookings((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      onStatusChange?.(updated);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.bookingStatusFailed);
    }
  };

  const submitReply = async (review: Review) => {
    if (!token || !review._id) {
      return;
    }

    const comment = replyDrafts[review._id]?.trim();
    if (!comment) {
      return;
    }

    try {
      setSubmittingReplyId(review._id);
      const updated = await replyToReview(review._id, comment, token);
      setReviews((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setReplyDrafts((current) => ({ ...current, [review._id ?? ""]: "" }));
      setActiveReplyId(null);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.bookingStatusFailed);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  if (!ownListing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <SEO
          title="Host listing access"
          description="Private StayNest host listing management access page."
          canonicalPath={`/host/homestays/${stay.id}`}
          robots="noindex,nofollow"
        />
        <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
          <ChevronLeft size={18} /> {t.hostDashboard}
        </button>
        <section className="rounded-lg border border-black/10 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black">{t.hostOnly}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SEO
        title={`Manage ${stay.title}`}
        description="Private StayNest host listing management page."
        canonicalPath={`/host/homestays/${stay.id}`}
        robots="noindex,nofollow"
      />
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ChevronLeft size={18} /> {t.hostDashboard}
      </button>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3">
          <img src={optimizeCloudinaryImage(stay.image, 1400)} alt={homestayImageAlt(stay, "host management main photo")} className="aspect-[16/10] w-full rounded-lg object-cover" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stay.gallery.map((image, index) => (
              <img
                key={image}
                src={optimizeCloudinaryImage(image, 900)}
                alt={homestayImageAlt(stay, `host gallery photo ${index + 1}`)}
                loading="lazy"
                className="aspect-[4/3] rounded-lg object-cover"
              />
            ))}
          </div>
        </div>

        <div className="self-start rounded-lg border border-black/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ocean/10 px-3 py-1 text-xs font-black text-ocean">{formatListingType(stay.type, language)}</span>
            {price.hasDiscount && <span className="rounded-full bg-coral px-3 py-1 text-xs font-black text-white">-{price.discountPercent}%</span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-3 py-1 text-xs font-black text-coral">
              <Star size={13} fill="currentColor" /> {displayedRating} ({displayedReviewCount} {t.reviews})
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{stay.title}</h1>
          <p className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-600">
            <MapPin size={18} /> {stay.area}, {stay.location}
          </p>
          <p className="mt-5 text-base leading-8 text-slate-700">{stay.description}</p>

          <div className="mt-6 grid grid-cols-1 gap-3 text-center min-[420px]:grid-cols-3">
            <Fact icon={<Users size={20} />} label={`${stay.guests} ${t.guests.toLowerCase()}`} />
            <Fact icon={<BedDouble size={20} />} label={`${stay.beds} ${t.beds}`} />
            <Fact icon={<Bath size={20} />} label={`${stay.baths} ${t.baths}`} />
          </div>

          <div className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm font-bold">
            <div className="flex justify-between">
              <span>{t.price}</span>
              <span>
                {price.hasDiscount && <span className="mr-2 text-slate-400 line-through">{formatPrice(price.originalPrice, language)}</span>}
                {formatPrice(price.nightlyPrice, language)}
              </span>
            </div>
            <div className="flex justify-between"><span>{t.totalRooms}</span><span>{stay.totalRooms ?? 1}</span></div>
            <div className="flex justify-between"><span>{t.availableRooms}</span><span>{stay.availableRooms ?? stay.totalRooms ?? 1}</span></div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {stay.amenities.map((amenity) => (
              <span key={amenity} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-bold">
                {amenityLabels[language][amenity]}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onEdit(stay.id)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ocean px-6 py-3 text-sm font-black text-white"
          >
            <Edit3 size={17} /> {t.editListing}
          </button>
        </div>
      </section>

      <section id="reviews" className="mt-6 scroll-mt-24 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight">{t.bookingRequests}</h2>
        {message && <p className="mt-3 rounded-md bg-coral/10 p-3 text-sm font-bold text-coral">{message}</p>}
        <div className="mt-5 grid gap-4">
          {listingBookings.map((booking) => {
            const roomsForDates = availabilityForBooking(booking);
            const hasConflict = booking.status === "pending" && roomsForDates <= 0;

            return (
            <article key={booking._id ?? booking.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-black">{booking.guestName ?? t.guests}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl font-black text-ocean">{formatPrice(booking.finalTotal ?? booking.totalPriceUsd, language)}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t[booking.status ?? "pending"]}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-700">
                {booking.bookingCode && <span className="rounded-full bg-slate-100 px-3 py-1">{booking.bookingCode}</span>}
                <span className="rounded-full bg-slate-100 px-3 py-1">{booking.guests} {t.guests.toLowerCase()}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{booking.nights} {t.nightsLabel}</span>
                <span className={`rounded-full px-3 py-1 ${hasConflict ? "bg-coral/10 text-coral" : "bg-slate-100"}`}>
                  {hasConflict ? t.dateRangeConflict : `${t.availableForDates}: ${roomsForDates}`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{booking.paymentMethod === "card" ? t.payByCard : t.payAtProperty}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{booking.paymentStatus === "paid" ? t.paid : t.unpaid}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {booking.status === "pending" && (
                  <>
                    <button type="button" disabled={hasConflict} onClick={() => changeStatus(booking, "confirmed")} className="min-w-32 flex-1 rounded-md bg-ocean px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-none">{t.confirm}</button>
                    <button type="button" onClick={() => changeStatus(booking, "rejected")} className="min-w-32 flex-1 rounded-md border border-black/10 px-4 py-2 text-sm font-black hover:bg-slate-50 sm:flex-none">{t.reject}</button>
                  </>
                )}
                {booking.status === "confirmed" && (
                  <>
                    <button type="button" onClick={() => changeStatus(booking, "completed")} className="min-w-32 flex-1 rounded-md bg-ink px-4 py-2 text-sm font-black text-white sm:flex-none">
                      {booking.paymentMethod === "pay_at_property" ? t.completeAndMarkCashCollected : t.markCompleted}
                    </button>
                    <button type="button" onClick={() => changeStatus(booking, "cancelled")} className="min-w-32 flex-1 rounded-md border border-black/10 px-4 py-2 text-sm font-black hover:bg-slate-50 sm:flex-none">{t.cancel}</button>
                  </>
                )}
              </div>
            </article>
            );
          })}
        </div>
        {listingBookings.length === 0 && <p className="mt-4 text-sm font-semibold text-slate-600">{t.noBookingRequests}</p>}
      </section>

      <section className="mt-6 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight">{t.reviewsTitle}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          <Star size={14} className="inline" fill="currentColor" /> {displayedRating} ({displayedReviewCount} {t.reviews})
        </p>
        <div className="mt-5 grid gap-3">
          {reviews.map((review) => (
            <article key={review._id ?? review.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black">{review.userName}</p>
                <p className="text-sm font-black text-coral">{review.rating} ★</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{review.comment}</p>
              {review.hostReply?.comment && (
                <div className="mt-3 rounded-md bg-ocean/10 p-3 text-sm">
                  <p className="font-black text-ocean">{t.hostReply}</p>
                  <p className="mt-1 leading-6 text-slate-700">{review.hostReply.comment}</p>
                </div>
              )}
              {!review.hostReply?.comment && activeReplyId !== (review._id ?? review.id) && (
                <button
                  type="button"
                  onClick={() => setActiveReplyId(review._id ?? review.id ?? null)}
                  className="mt-3 rounded-md border border-black/10 px-4 py-2 text-sm font-black hover:bg-slate-50"
                >
                  {t.replyToReview}
                </button>
              )}
              {!review.hostReply?.comment && activeReplyId === (review._id ?? review.id) && (
                <div className="mt-3 grid gap-2">
                  <textarea
                    value={replyDrafts[review._id ?? ""] ?? ""}
                    onChange={(event) => setReplyDrafts((current) => ({ ...current, [review._id ?? ""]: event.target.value }))}
                    placeholder={t.replyToReview}
                    rows={2}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-ocean"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={submittingReplyId === review._id}
                      onClick={() => submitReply(review)}
                      className="rounded-md bg-ocean px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {submittingReplyId === review._id ? `${t.submitReply}...` : t.submitReply}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveReplyId(null)}
                      className="rounded-md border border-black/10 px-4 py-2 text-sm font-black hover:bg-slate-50"
                    >
                      {t.cancelReply}
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs font-bold text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
            </article>
          ))}
        </div>
        {reviews.length === 0 && <p className="mt-4 text-sm font-semibold text-slate-600">{t.noReviews}</p>}
      </section>
    </main>
  );
}

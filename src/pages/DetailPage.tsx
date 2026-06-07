import { useEffect, useRef, useState } from "react";
import { Bath, BedDouble, ChevronLeft, MapPin, Star, Users, Wifi, X } from "lucide-react";
import { Fact } from "../components/Fact";
import { SEO } from "../components/SEO";
import type { AuthUser, Booking, BookingSearch, Homestay, HomestayAvailability, Language, PaymentMethod, Review, Voucher } from "../types";
import { addDaysToDateString, getDateRangeStatus, getTodayDateString } from "../utils/date";
import { formatPrice } from "../utils/currency";
import { getPriceBreakdown } from "../utils/discount";
import { amenityLabels, formatListingType, text } from "../utils/i18n";
import { createBooking, createReview, createStripeCheckoutSession, fetchBookings, fetchHomestayAvailability, fetchHomestayReviews } from "../utils/api";
import { getHomestayRoute } from "../utils/routes";
import { buildHomestayBreadcrumbJsonLd, buildHomestayDescription, buildHomestayJsonLd, homestayImageAlt, optimizeCloudinaryImage } from "../utils/seo";

type DetailPageProps = {
  language: Language;
  stay: Homestay;
  onBack: () => void;
  onHost: () => void;
  onManageHostListing: (id: Homestay["id"]) => void;
  user: AuthUser | null;
  token: string | null;
  wishlistIds: Homestay["id"][];
  bookingSearch: BookingSearch;
  setBookingSearch: (value: BookingSearch) => void;
  onRequireLogin: () => void;
  onToggleWishlist: (id: Homestay["id"]) => void;
  vouchers: Voucher[];
  onBookingCreated: () => void;
};

export function DetailPage({
  language,
  stay,
  onBack,
  onHost,
  onManageHostListing,
  user,
  token,
  wishlistIds,
  bookingSearch,
  setBookingSearch,
  onRequireLogin,
  onToggleWishlist,
  vouchers,
  onBookingCreated,
}: DetailPageProps) {
  const t = text[language];
  const [checkIn, setCheckIn] = useState(bookingSearch.checkIn);
  const [checkOut, setCheckOut] = useState(bookingSearch.checkOut);
  const [guests, setGuests] = useState(Math.min(bookingSearch.guests, stay.guests));
  const [confirmed, setConfirmed] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_at_property");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [availability, setAvailability] = useState<HomestayAvailability | null>(null);
  const submittingRef = useRef(false);
  const dateRange = getDateRangeStatus(checkIn, checkOut);
  const price = getPriceBreakdown(stay);
  const today = getTodayDateString();
  const checkOutMin = checkIn ? addDaysToDateString(checkIn, 1) : today;
  const dateError = dateRange.isPastCheckIn
    ? t.checkInPast
    : dateRange.isReversed
      ? t.invalidDateRange
      : t.selectDates;
  const nights = dateRange.isValid ? dateRange.nights : 0;
  const total = nights * price.nightlyPrice;
  const availableVouchers = vouchers.filter((voucher) => !voucher.isUsed && new Date(voucher.expiresAt) >= new Date());
  const appliedVoucher = voucherCode.trim()
    ? availableVouchers.find((voucher) => voucher.code.toUpperCase() === voucherCode.trim().toUpperCase())
    : undefined;
  const voucherError = voucherCode.trim() && !appliedVoucher ? t.voucherUnavailable : "";
  const voucherDiscountAmount = appliedVoucher && dateRange.isValid ? Number(((total * appliedVoucher.percent) / 100).toFixed(2)) : 0;
  const finalTotal = Math.max(Number((total - voucherDiscountAmount).toFixed(2)), 0);
  const createdOriginalTotal = createdBooking?.totalPriceUsd ?? total;
  const createdDiscountAmount = createdBooking?.discountAmount ?? voucherDiscountAmount;
  const createdFinalTotal = createdBooking?.finalTotal ?? finalTotal;
  const displayedReviewCount = reviews.length || stay.reviews;
  const displayedRating =
    reviews.length > 0
      ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2))
      : stay.rating;
  const canonicalPath = getHomestayRoute(stay);
  const seoImage = optimizeCloudinaryImage(stay.image || stay.gallery[0], 1200);
  const seoTitle = `${stay.title} in ${stay.area}, ${stay.location}`;
  const seoDescription = buildHomestayDescription(stay);
  const isOwnListing = Boolean(user?.role === "host" && (String(stay.owner) === String(user.id) || stay.host === user.name));
  const canBook = !user || user.role === "guest";
  const noRoomsForDates = Boolean(dateRange.isValid && availability && availability.availableForDateRange <= 0);
  const eligibleBooking = bookings.find((booking) => {
    const bookingHomestay =
      typeof booking.homestay === "object"
        ? booking.homestay?.id ?? (booking.homestay as { _id?: string })._id
        : booking.homestay;
    return String(bookingHomestay) === String(stay.id) && !booking.reviewed && booking.status === "completed";
  });

  useEffect(() => {
    fetchHomestayReviews(stay.id).then(setReviews).catch(() => setReviews([]));
  }, [stay.id]);

  useEffect(() => {
    let isMounted = true;

    if (!dateRange.isValid) {
      setAvailability(null);
      return;
    }

    fetchHomestayAvailability(stay.id, checkIn, checkOut)
      .then((nextAvailability) => {
        if (isMounted) {
          setAvailability(nextAvailability);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailability(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [checkIn, checkOut, dateRange.isValid, stay.id]);

  useEffect(() => {
    setCheckIn(bookingSearch.checkIn);
    setCheckOut(bookingSearch.checkOut);
    setGuests(Math.min(bookingSearch.guests, stay.guests));
  }, [bookingSearch, stay.guests, stay.id]);

  useEffect(() => {
    if (!token || user?.role !== "guest") {
      setBookings([]);
      return;
    }

    fetchBookings(token).then(setBookings).catch(() => setBookings([]));
  }, [token, user]);

  const updateBookingField = <Key extends keyof BookingSearch>(field: Key, value: BookingSearch[Key]) => {
    const nextSearch = { ...bookingSearch, [field]: value };
    setBookingSearch(nextSearch);

    if (field === "checkIn") {
      setCheckIn(String(value));
    }

    if (field === "checkOut") {
      setCheckOut(String(value));
    }

    if (field === "guests") {
      setGuests(Number(value));
    }
  };

  const confirmBooking = async () => {
    if (submittingRef.current) {
      return;
    }

    setBookingError("");

    if (!dateRange.isValid) {
      return;
    }

    if (noRoomsForDates) {
      setBookingError(t.noRoomsSelectedDates);
      return;
    }

    if (!user || !token) {
      onRequireLogin();
      return;
    }

    if (user.role !== "guest" || isOwnListing) {
      return;
    }

    if (voucherCode.trim() && !appliedVoucher) {
      setBookingError(t.voucherUnavailable);
      return;
    }

    submittingRef.current = true;
    setBookingSubmitting(true);
    const clientBookingRequestId = crypto.randomUUID();

    try {
      if (paymentMethod === "card") {
        setPaymentProcessing(true);
        const checkout = await createStripeCheckoutSession({
          homestayId: stay.id,
          homestayTitle: stay.title,
          checkIn,
          checkOut,
          guests,
          nights,
          totalPriceUsd: total,
          paymentMethod,
          voucherCode: appliedVoucher?.code,
          clientBookingRequestId,
          frontendOrigin: window.location.origin,
        }, token);
        window.location.href = checkout.url;
        return;
      }

      const booking = await createBooking({
        homestayId: stay.id,
        homestayTitle: stay.title,
        checkIn,
        checkOut,
        guests,
        nights,
        totalPriceUsd: total,
        paymentMethod,
        voucherCode: appliedVoucher?.code,
        clientBookingRequestId,
      }, token);
      setCreatedBooking(booking);
      onBookingCreated();
      setConfirmed(true);
      window.setTimeout(onBack, 3000);
    } catch (error) {
      if (appliedVoucher || paymentMethod === "card") {
        setPaymentProcessing(false);
        setBookingSubmitting(false);
        submittingRef.current = false;
        setBookingError(error instanceof Error ? error.message : t.voucherUnavailable);
        return;
      }
      // Keep the mock booking flow usable when the backend is offline.
      setConfirmed(true);
      window.setTimeout(onBack, 3000);
    }

    setPaymentProcessing(false);
    setBookingSubmitting(false);
  };

  const submitReview = async () => {
    if (!token || !eligibleBooking?._id) {
      setReviewMessage(t.reviewUnavailable);
      return;
    }

    try {
      const review = await createReview(
        {
          homestayId: stay.id,
          bookingId: eligibleBooking._id,
          rating: reviewRating,
          comment: reviewComment,
        },
        token,
      );
      setReviews((current) => [review, ...current]);
      setBookings((current) => current.map((booking) => (booking._id === eligibleBooking._id ? { ...booking, reviewed: true } : booking)));
      setReviewComment("");
      setReviewRating(5);
      setReviewMessage(t.reviewCreated);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : t.duplicateReview);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalPath={canonicalPath}
        image={seoImage}
        jsonLd={[
          buildHomestayBreadcrumbJsonLd(stay),
          buildHomestayJsonLd(stay, reviews),
        ]}
      />
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ChevronLeft size={18} /> {t.backToStays}
      </button>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3">
          <img
            src={optimizeCloudinaryImage(stay.image, 1400)}
            alt={homestayImageAlt(stay, "main photo")}
            fetchPriority="high"
            className="aspect-[16/10] w-full rounded-lg object-cover"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stay.gallery.map((image, index) => (
              <img
                key={image}
                src={optimizeCloudinaryImage(image, 900)}
                alt={homestayImageAlt(stay, `gallery photo ${index + 1}`)}
                loading="lazy"
                className="aspect-[4/3] rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
        <div className="self-start rounded-lg border border-black/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ocean/10 px-3 py-1 text-xs font-black text-ocean">{formatListingType(stay.type, language)}</span>
            {price.hasDiscount && (
              <span className="rounded-full bg-coral px-3 py-1 text-xs font-black text-white">-{price.discountPercent}%</span>
            )}
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
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-black">{t.amenities}</h2>
            <div className="flex flex-wrap gap-2">
              {stay.amenities.map((amenity) => (
                <span key={amenity} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-bold">
                  {amenity === "Wi-Fi" && <Wifi size={15} />} {amenityLabels[language][amenity]}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-7 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-600">{t.hostedBy}</p>
            <p className="text-xl font-black">{stay.host}</p>
          </div>

          {isOwnListing && (
            <div className="mt-7 rounded-lg border border-ocean/20 bg-ocean/10 p-4">
              <p className="text-sm font-black text-ocean">{t.ownListingNotice}</p>
              <button
                type="button"
                onClick={() => onManageHostListing(stay.id)}
                className="mt-3 rounded-md bg-ocean px-5 py-2.5 text-sm font-black text-white"
              >
                {t.manageListing}
              </button>
            </div>
          )}

          <div className="mt-7 rounded-lg border border-slate-200 p-4">
            <div className="mb-4 flex items-end justify-between gap-3">
              <p>
                {price.hasDiscount && (
                  <span className="mr-2 text-base font-black text-slate-400 line-through">{formatPrice(price.originalPrice, language)}</span>
                )}
                <span className="text-3xl font-black text-ocean">{formatPrice(price.nightlyPrice, language)}</span>
                <span className="font-semibold text-slate-600"> / {t.perNight}</span>
              </p>
              <p className="text-sm font-bold text-slate-500">{t.bookingSummary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t.checkIn}</span>
                <input
                  value={checkIn}
                  onChange={(event) => updateBookingField("checkIn", event.target.value)}
                  type="date"
                  min={today}
                  className="w-full bg-transparent text-sm font-bold outline-none"
                />
              </label>
              <label className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t.checkOut}</span>
                <input
                  value={checkOut}
                  onChange={(event) => updateBookingField("checkOut", event.target.value)}
                  type="date"
                  min={checkOutMin}
                  className="w-full bg-transparent text-sm font-bold outline-none"
                />
              </label>
            </div>
            <label className="mt-3 block rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t.guests}</span>
              <select
                value={guests}
                onChange={(event) => updateBookingField("guests", Number(event.target.value))}
                className="w-full bg-transparent text-sm font-bold outline-none"
              >
                {Array.from({ length: stay.guests }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>{count} {t.guests.toLowerCase()}</option>
                ))}
              </select>
            </label>
            <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-4 text-sm font-bold">
              <div className="flex justify-between"><span>{t.totalNights}</span><span>{nights}</span></div>
              <div className="flex justify-between">
                <span>{t.nightlyRate}</span>
                <span>
                  {price.hasDiscount && <span className="mr-2 text-slate-400 line-through">{formatPrice(price.originalPrice, language)}</span>}
                  {formatPrice(price.nightlyPrice, language)}
                </span>
              </div>
              {user?.role === "guest" && (
                <div className="grid gap-2 border-t border-slate-200 pt-3">
                  <span className="font-black">{t.voucher}</span>
                  <select
                    value={appliedVoucher?.code ?? ""}
                    onChange={(event) => setVoucherCode(event.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-ocean"
                  >
                    <option value="">{t.noVoucher}</option>
                    {availableVouchers.map((voucher) => (
                      <option key={voucher._id} value={voucher.code}>
                        {voucher.code} · {voucher.percent}%
                      </option>
                    ))}
                  </select>
                  <input
                    value={voucherCode}
                    onChange={(event) => setVoucherCode(event.target.value)}
                    placeholder={t.enterVoucherCode}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-ocean"
                  />
                  {voucherError && <span className="text-xs font-bold text-coral">{voucherError}</span>}
                </div>
              )}
              {user?.role === "guest" && (
                <div className="grid gap-2 border-t border-slate-200 pt-3">
                  <span className="font-black">{t.paymentMethod}</span>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                    <input
                      type="radio"
                      checked={paymentMethod === "pay_at_property"}
                      onChange={() => setPaymentMethod("pay_at_property")}
                      className="h-4 w-4 accent-ocean"
                    />
                    <span>{t.payAtProperty}</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                    <input
                      type="radio"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      className="h-4 w-4 accent-ocean"
                    />
                    <span>{t.payByCard}</span>
                  </label>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black">
                <span>{appliedVoucher ? t.originalTotal : t.totalPrice}</span><span>{formatPrice(total, language)}</span>
              </div>
              {appliedVoucher && (
                <>
                  <div className="flex justify-between text-ocean">
                    <span>{t.voucherDiscountAmount}</span><span>-{formatPrice(voucherDiscountAmount, language)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black">
                    <span>{t.finalTotal}</span><span>{formatPrice(finalTotal, language)}</span>
                  </div>
                </>
              )}
            </div>
            {!dateRange.isValid && (
              <p className="mt-3 text-sm font-semibold text-coral">
                {dateError}
              </p>
            )}
            {dateRange.isValid && availability && (
              <p className={`mt-3 text-sm font-black ${noRoomsForDates ? "text-coral" : "text-ocean"}`}>
                {noRoomsForDates ? t.noRoomsSelectedDates : `${t.availableForDates}: ${availability.availableForDateRange}`}
              </p>
            )}
            {(user?.role === "host" || isOwnListing) && (
              <p className="mt-3 text-sm font-semibold text-coral">{t.hostCannotBook}</p>
            )}
            {bookingError && <p className="mt-3 text-sm font-semibold text-coral">{bookingError}</p>}
            <button
              disabled={!dateRange.isValid || noRoomsForDates || !canBook || isOwnListing || Boolean(voucherError) || paymentProcessing || bookingSubmitting}
              onClick={confirmBooking}
              className="mt-4 w-full rounded-md bg-coral px-6 py-3 text-sm font-black text-white hover:bg-[#d85f42] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {paymentProcessing || bookingSubmitting ? t.processingPayment : t.confirmBooking}
            </button>
          </div>
          {user?.role === "host" && (
            <button onClick={onHost} className="mt-3 w-full rounded-md border border-black/10 px-6 py-3 text-sm font-black hover:bg-slate-50">
              {t.hostDashboard}
            </button>
          )}
          {user?.role !== "host" && (
            <button
              onClick={() => (user ? onToggleWishlist(stay.id) : onRequireLogin())}
              className="mt-3 w-full rounded-md border border-black/10 px-6 py-3 text-sm font-black hover:bg-slate-50"
            >
              {wishlistIds.includes(stay.id) ? t.savedWishlist : t.saveWishlist}
            </button>
          )}
        </div>
      </section>
      <section id="reviews" className="mt-6 scroll-mt-24 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{t.reviewsTitle}</h2>
            <p className="text-sm font-semibold text-slate-600">
              <Star size={14} className="inline" fill="currentColor" /> {displayedRating} ({displayedReviewCount} {t.reviews})
            </p>
          </div>
        </div>

        {user?.role === "guest" && (
          <div className="mb-6 rounded-lg bg-slate-50 p-4">
            <h3 className="text-lg font-black">{t.leaveReview}</h3>
            {eligibleBooking ? (
              <div className="mt-3 grid gap-3">
                <select
                  value={reviewRating}
                  onChange={(event) => setReviewRating(Number(event.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-ocean"
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} ★</option>
                  ))}
                </select>
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder={t.reviewComment}
                  rows={3}
                  className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
                />
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={!reviewComment.trim()}
                  className="justify-self-start rounded-md bg-ocean px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {t.submitReview}
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-600">{t.reviewUnavailable}</p>
            )}
            {reviewMessage && <p className="mt-3 text-sm font-bold text-ocean">{reviewMessage}</p>}
          </div>
        )}

        <div className="grid gap-3">
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
              <p className="mt-2 text-xs font-bold text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
            </article>
          ))}
        </div>
        {reviews.length === 0 && <p className="text-sm font-semibold text-slate-600">{t.noReviews}</p>}
      </section>
      {confirmed && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-ocean">{t.bookingConfirmed}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">{stay.title}</h2>
              </div>
              <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10">
                <X size={17} />
              </button>
            </div>
            <p className="text-sm leading-6 text-slate-600">{t.confirmationCopy}</p>
            <div className="mt-5 grid gap-2 rounded-md bg-slate-50 p-4 text-sm font-bold">
              <div className="flex justify-between"><span>{t.checkIn}</span><span>{checkIn}</span></div>
              <div className="flex justify-between"><span>{t.checkOut}</span><span>{checkOut}</span></div>
              {createdBooking?.bookingCode && <div className="flex justify-between"><span>{t.bookingCode}</span><span>{createdBooking.bookingCode}</span></div>}
              <div className="flex justify-between"><span>{t.guests}</span><span>{guests}</span></div>
              <div className="flex justify-between"><span>{t.paymentMethod}</span><span>{paymentMethod === "card" ? t.payByCard : t.payAtProperty}</span></div>
              <div className="flex justify-between"><span>{t.paymentStatus}</span><span>{createdBooking?.paymentStatus === "paid" ? t.paid : t.unpaid}</span></div>
              <div className="flex justify-between"><span>{t.totalNights}</span><span>{nights}</span></div>
              <div className="flex justify-between"><span>{t.originalTotal}</span><span>{formatPrice(createdOriginalTotal, language)}</span></div>
              {createdDiscountAmount > 0 && (
                <>
                  <div className="flex justify-between text-ocean"><span>{createdBooking?.voucherCode ?? appliedVoucher?.code ?? t.voucherDiscountAmount}</span><span>-{formatPrice(createdDiscountAmount, language)}</span></div>
                </>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black">
                <span>{t.finalTotal}</span><span>{formatPrice(createdFinalTotal, language)}</span>
              </div>
            </div>
            <button onClick={onBack} className="mt-5 w-full rounded-md bg-ink px-6 py-3 text-sm font-black text-white">
              {t.close}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

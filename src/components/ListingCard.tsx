import { MapPin, Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { BookingSearch, Homestay, Language } from "../types";
import { fetchHomestayAvailability } from "../utils/api";
import { formatPrice } from "../utils/currency";
import { getDateRangeStatus } from "../utils/date";
import { getPriceBreakdown } from "../utils/discount";
import { formatListingType, text } from "../utils/i18n";

type ListingCardProps = {
  language: Language;
  stay: Homestay;
  bookingSearch?: BookingSearch;
  onSelect: () => void;
};

export function ListingCard({ language, stay, bookingSearch, onSelect }: ListingCardProps) {
  const t = text[language];
  const dateRange = bookingSearch ? getDateRangeStatus(bookingSearch.checkIn, bookingSearch.checkOut) : null;
  const price = getPriceBreakdown(stay);
  const [availableForDateRange, setAvailableForDateRange] = useState<number | null>(null);
  const hasTotalPrice = Boolean(dateRange?.isValid);
  const availabilityCount = hasTotalPrice ? availableForDateRange : stay.availableRooms;
  const showLowAvailability = typeof availabilityCount === "number" && availabilityCount <= 5;
  const totalPrice = (dateRange?.nights ?? 0) * price.nightlyPrice;
  const nightlyPriceLabel = `${formatPrice(price.nightlyPrice, language)}/${t.perNight}`;
  const totalPriceLabel =
    hasTotalPrice && dateRange
      ? language === "vi"
        ? `${dateRange.nights} ${t.nightsLabel} · ${t.totalShort} ${formatPrice(totalPrice, language)}`
        : `${dateRange.nights} ${t.nightsLabel} · ${formatPrice(totalPrice, language)} ${t.totalShort}`
      : "";

  useEffect(() => {
    let isMounted = true;

    if (!dateRange?.isValid || !bookingSearch?.checkIn || !bookingSearch.checkOut) {
      setAvailableForDateRange(null);
      return;
    }

    fetchHomestayAvailability(stay.id, bookingSearch.checkIn, bookingSearch.checkOut)
      .then((availability) => {
        if (isMounted) {
          setAvailableForDateRange(availability.availableForDateRange);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailableForDateRange(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [bookingSearch?.checkIn, bookingSearch?.checkOut, dateRange?.isValid, stay.id]);

  return (
    <article className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <button onClick={onSelect} className="block w-full text-left">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={stay.image} alt={stay.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-ink shadow-sm">
            {formatListingType(stay.type, language)}
          </span>
          {price.hasDiscount && (
            <span className="absolute left-3 top-11 rounded-full bg-coral px-3 py-1 text-xs font-black text-white shadow-sm">
              -{price.discountPercent}%
            </span>
          )}
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/85 px-3 py-1 text-xs font-black text-white">
            <Star size={13} fill="currentColor" /> {stay.rating}
          </span>
        </div>
        <div className="p-4">
          <div className="mb-2 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
            <div>
              <h3 className="line-clamp-1 text-lg font-black tracking-tight">{stay.title}</h3>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-600">
                <MapPin size={15} /> {stay.area}
              </p>
              {showLowAvailability && (
                <p className="mt-2 text-xs font-black text-coral">
                  {availabilityCount === 0
                    ? t.noRoomsSelectedDates
                    : language === "vi"
                      ? `Chỉ còn ${availabilityCount} phòng trống`
                      : `Only ${availabilityCount} rooms left`}
                </p>
              )}
            </div>
            <div className="shrink-0 text-left min-[420px]:text-right">
              {price.hasDiscount && (
                <p className="whitespace-nowrap text-xs font-black leading-4 text-slate-400 line-through">
                  {formatPrice(price.originalPrice, language)}/{t.perNight}
                </p>
              )}
              <p className="whitespace-nowrap text-lg font-black leading-5 text-ocean">{nightlyPriceLabel}</p>
              {hasTotalPrice && (
                <p className="mt-1 max-w-[150px] text-xs font-black leading-4 text-slate-600 sm:max-w-[180px]">
                  {totalPriceLabel}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-slate-600">
            <span>{stay.guests} {t.guests.toLowerCase()}</span>
            <span>{stay.beds} {t.beds}</span>
            <span>{stay.reviews} {t.reviews}</span>
          </div>
        </div>
      </button>
    </article>
  );
}

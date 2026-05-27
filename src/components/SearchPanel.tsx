import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import type { BookingSearch, Language } from "../types";
import { addDaysToDateString, getDateRangeStatus, getTodayDateString } from "../utils/date";
import { text } from "../utils/i18n";
import { SearchField } from "./SearchField";

type SearchPanelProps = {
  language: Language;
  bookingSearch: BookingSearch;
  setBookingSearch: (value: BookingSearch) => void;
};

export function SearchPanel({ language, bookingSearch, setBookingSearch }: SearchPanelProps) {
  const t = text[language];
  const today = getTodayDateString();
  const checkOutMin = bookingSearch.checkIn ? addDaysToDateString(bookingSearch.checkIn, 1) : today;
  const dateRange = getDateRangeStatus(bookingSearch.checkIn, bookingSearch.checkOut);
  const dateError = dateRange.isPastCheckIn
    ? t.checkInPast
    : dateRange.isReversed
      ? t.invalidDateRange
      : "";
  const updateSearch = <Key extends keyof BookingSearch>(field: Key, value: BookingSearch[Key]) => {
    setBookingSearch({ ...bookingSearch, [field]: value });
  };

  return (
    <div className="rounded-lg bg-white p-3 shadow-soft">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.9fr_auto]">
        <SearchField icon={<MapPin size={19} />} label={t.location}>
          <input
            value={bookingSearch.location}
            onChange={(event) => updateSearch("location", event.target.value)}
            placeholder={t.locationPlaceholder}
            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
          />
        </SearchField>
        <SearchField icon={<CalendarDays size={19} />} label={t.checkIn}>
          <input
            type="date"
            min={today}
            value={bookingSearch.checkIn}
            onChange={(event) => updateSearch("checkIn", event.target.value)}
            className="w-full bg-transparent text-sm font-bold outline-none"
          />
        </SearchField>
        <SearchField icon={<CalendarDays size={19} />} label={t.checkOut}>
          <input
            type="date"
            min={checkOutMin}
            value={bookingSearch.checkOut}
            onChange={(event) => updateSearch("checkOut", event.target.value)}
            className="w-full bg-transparent text-sm font-bold outline-none"
          />
        </SearchField>
        <SearchField icon={<Users size={19} />} label={t.guests}>
          <select
            value={bookingSearch.guests}
            onChange={(event) => updateSearch("guests", Number(event.target.value))}
            className="w-full bg-transparent text-sm font-bold outline-none"
          >
            {[2, 4, 6, 8].map((count) => (
              <option key={count} value={count}>
                {count} {t.guests.toLowerCase()}
              </option>
            ))}
          </select>
        </SearchField>
        <button className="flex min-h-14 items-center justify-center gap-2 rounded-md bg-coral px-6 text-sm font-black text-white transition hover:bg-[#d85f42] md:col-span-2 lg:col-span-1">
          <Search size={18} /> {t.search}
        </button>
      </div>
      {dateError && <p className="mt-3 px-2 text-sm font-bold text-coral">{dateError}</p>}
    </div>
  );
}

export function calculateNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = parseDateInput(checkIn);
  const end = parseDateInput(checkOut);
  const diff = end.getTime() - start.getTime();

  return diff > 0 ? Math.ceil(diff / 86400000) : 0;
}

export function getDateRangeStatus(checkIn: string, checkOut: string) {
  const isPastCheckIn = Boolean(checkIn && isPastDate(checkIn));
  const isPastCheckOut = Boolean(checkOut && isPastDate(checkOut));

  if (!checkIn || !checkOut) {
    return {
      hasDates: false,
      isValid: false,
      isReversed: false,
      isPastCheckIn,
      isPastCheckOut,
      nights: 0,
    };
  }

  const nights = calculateNights(checkIn, checkOut);
  const isReversed = nights === 0;

  return {
    hasDates: true,
    isValid: nights > 0 && !isPastCheckIn && !isPastCheckOut,
    isReversed,
    isPastCheckIn,
    isPastCheckOut,
    nights: isReversed || isPastCheckIn || isPastCheckOut ? 0 : nights,
  };
}

export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateString: string, days: number) {
  const date = parseDateInput(dateString);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isPastDate(dateString: string) {
  return parseDateInput(dateString).getTime() < parseDateInput(getTodayDateString()).getTime();
}

function parseDateInput(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

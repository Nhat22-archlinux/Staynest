import type { DiscountSettings, Homestay } from "../types";

const maxDiscountPercent = 95;

export function cleanDiscountPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(value), 0), maxDiscountPercent);
}

export function normalizeDiscount(discount?: DiscountSettings): DiscountSettings {
  if (!discount || discount.type === "none" || discount.isActive === false) {
    return { type: "none", percent: 0, isActive: false, schedules: [] };
  }

  if (discount.type === "manual") {
    const percent = cleanDiscountPercent(Number(discount.percent) || 0);

    return {
      type: "manual",
      percent,
      isActive: percent > 0,
      schedules: [],
    };
  }

  const schedules = [...(discount.schedules ?? []), ...(discount.ranges ?? [])];

  return {
    type: "scheduled",
    percent: 0,
    isActive: discount.isActive !== false && schedules.length > 0,
    schedules: schedules.map((schedule) => ({
      ...schedule,
      percent: cleanDiscountPercent(Number(schedule.percent) || 0),
    })),
  };
}

export function getActiveDiscountPercent(discount?: DiscountSettings, now = new Date()) {
  const normalizedDiscount = normalizeDiscount(discount);

  if (normalizedDiscount.type === "manual") {
    return normalizedDiscount.percent ?? 0;
  }

  if (normalizedDiscount.type !== "scheduled") {
    return 0;
  }

  return normalizedDiscount.schedules.reduce((activePercent, schedule) => {
    const start = new Date(schedule.startAt);
    const end = new Date(schedule.endAt);
    const isActive = schedule.percent > 0 && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && now >= start && now <= end;

    return isActive ? Math.max(activePercent, schedule.percent) : activePercent;
  }, 0);
}

export function getPriceBreakdown(stay: Homestay, now = new Date()) {
  const discountPercent = getActiveDiscountPercent(stay.discount, now);
  const discountedPrice = discountPercent > 0 ? stay.price * (1 - discountPercent / 100) : stay.price;

  return {
    originalPrice: stay.price,
    nightlyPrice: discountedPrice,
    discountPercent,
    hasDiscount: discountPercent > 0,
  };
}

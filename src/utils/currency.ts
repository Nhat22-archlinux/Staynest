import type { Language } from "../types";

export const USD_TO_VND = 25000;

export function convertUsdToVnd(usd: number) {
  return usd * USD_TO_VND;
}

export function formatPrice(usd: number, language: Language) {
  if (language === "vi") {
    return `${Math.round(convertUsdToVnd(usd)).toLocaleString("vi-VN")}₫`;
  }

  return `$${Math.round(usd).toLocaleString("en-US")}`;
}

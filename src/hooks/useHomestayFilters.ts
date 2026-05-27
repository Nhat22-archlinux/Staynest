import { useMemo } from "react";
import type { Amenity, Homestay } from "../types";
import { getPriceBreakdown } from "../utils/discount";

export function useHomestayFilters(
  stays: Homestay[],
  query: string,
  maxPrice: number,
  minRating: number,
  activeAmenities: Amenity[],
) {
  return useMemo(() => {
    return stays.filter((stay) => {
      const searchableText = `${stay.location} ${stay.area} ${stay.title}`.toLowerCase();
      const matchesQuery = searchableText.includes(query.toLowerCase());
      const matchesPrice = getPriceBreakdown(stay).nightlyPrice <= maxPrice;
      const matchesRating = stay.rating >= minRating;
      const matchesAmenities = activeAmenities.every((amenity) => stay.amenities.includes(amenity));

      return matchesQuery && matchesPrice && matchesRating && matchesAmenities;
    });
  }, [activeAmenities, maxPrice, minRating, query, stays]);
}

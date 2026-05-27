import { SlidersHorizontal } from "lucide-react";
import { amenities } from "../data/amenities";
import type { Amenity, Language } from "../types";
import { formatPrice } from "../utils/currency";
import { amenityLabels, text } from "../utils/i18n";

type FilterSidebarProps = {
  language: Language;
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  minRating: number;
  setMinRating: (value: number) => void;
  activeAmenities: Amenity[];
  toggleAmenity: (amenity: Amenity) => void;
};

export function FilterSidebar(props: FilterSidebarProps) {
  const t = text[props.language];

  return (
    <aside className="h-fit rounded-lg border border-black/10 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-black">{t.filters}</h3>
        <SlidersHorizontal size={18} className="text-ocean" />
      </div>
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold">
            <span>{t.maxPrice}</span>
            <span>{formatPrice(props.maxPrice, props.language)}/{t.perNight}</span>
          </div>
          <input
            type="range"
            min="60"
            max="200"
            value={props.maxPrice}
            onChange={(event) => props.setMaxPrice(Number(event.target.value))}
            className="w-full accent-ocean"
          />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold">
            <span>{t.minRating}</span>
            <span>{props.minRating.toFixed(1)}+</span>
          </div>
          <input
            type="range"
            min="4.5"
            max="5"
            step="0.1"
            value={props.minRating}
            onChange={(event) => props.setMinRating(Number(event.target.value))}
            className="w-full accent-ocean"
          />
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">{t.amenities}</p>
          <div className="grid gap-2">
            {amenities.map((amenity) => (
              <label key={amenity} className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={props.activeAmenities.includes(amenity)}
                  onChange={() => props.toggleAmenity(amenity)}
                  className="h-4 w-4 accent-ocean"
                />
                {amenityLabels[props.language][amenity]}
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

import { SlidersHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";
import { FilterSidebar } from "../components/FilterSidebar";
import { ListingCard } from "../components/ListingCard";
import { SearchPanel } from "../components/SearchPanel";
import { SEO } from "../components/SEO";
import type { Amenity, BookingSearch, Homestay, Language } from "../types";
import { text } from "../utils/i18n";
import { buildHomeJsonLd } from "../utils/seo";

type HomePageProps = {
  language: Language;
  bookingSearch: BookingSearch;
  setBookingSearch: (value: BookingSearch) => void;
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  minRating: number;
  setMinRating: (value: number) => void;
  activeAmenities: Amenity[];
  toggleAmenity: (amenity: Amenity) => void;
  stays: Homestay[];
  onSelect: (stay: Homestay) => void;
};

export function HomePage(props: HomePageProps) {
  const t = text[props.language];
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasQueryParams = window.location.search.length > 1;
  const canonicalPath = /^\/homestays\/?$/.test(window.location.pathname) ? "/homestays" : "/";

  return (
    <main>
      <SEO
        title="StayNest Homestay Booking Marketplace"
        description="Find and book curated homestays, villas, and local stays in Vietnam with StayNest. Search by location, dates, guests, amenities, rating, and price."
        canonicalPath={canonicalPath}
        robots={hasQueryParams ? "noindex,follow" : "index,follow"}
        jsonLd={buildHomeJsonLd()}
      />
      <section className="relative overflow-hidden bg-ink">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85"
          alt="Modern homestay with a pool and mountain view"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover opacity-65"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        <div className="relative mx-auto grid min-h-[560px] max-w-7xl content-end px-4 pb-6 pt-20 sm:min-h-[620px] sm:px-6 sm:pb-8 lg:px-8">
          <div className="max-w-3xl pb-8 text-white">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold backdrop-blur sm:text-sm">
              <Sparkles size={16} /> {t.heroBadge}
            </p>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              {t.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">{t.heroCopy}</p>
          </div>
          <SearchPanel
            language={props.language}
            bookingSearch={props.bookingSearch}
            setBookingSearch={props.setBookingSearch}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <div className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          <FilterSidebar
            language={props.language}
            maxPrice={props.maxPrice}
            setMaxPrice={props.setMaxPrice}
            minRating={props.minRating}
            setMinRating={props.setMinRating}
            activeAmenities={props.activeAmenities}
            toggleAmenity={props.toggleAmenity}
          />
        </div>
        <div>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{t.featured}</h2>
              <p className="text-sm font-medium text-slate-600">{props.stays.length} {t.staysMatch}</p>
            </div>
            <button onClick={() => setFiltersOpen((open) => !open)} className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm lg:hidden">
              <SlidersHorizontal size={16} /> {t.filters}
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {props.stays.map((stay) => (
              <ListingCard
                key={stay.id}
                language={props.language}
                stay={stay}
                bookingSearch={props.bookingSearch}
                onSelect={() => props.onSelect(stay)}
              />
            ))}
          </div>
          {props.stays.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-lg font-bold">{t.noStays}</p>
              <p className="mt-1 text-sm text-slate-600">{t.noStaysCopy}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

import { ChevronLeft } from "lucide-react";
import { ListingCard } from "../components/ListingCard";
import { SEO } from "../components/SEO";
import type { Homestay, Language } from "../types";
import { text } from "../utils/i18n";

type WishlistPageProps = {
  language: Language;
  stays: Homestay[];
  onBack: () => void;
  onSelect: (stay: Homestay) => void;
};

export function WishlistPage({ language, stays, onBack, onSelect }: WishlistPageProps) {
  const t = text[language];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SEO
        title="Wishlist"
        description="Private StayNest wishlist."
        canonicalPath="/wishlist"
        robots="noindex,nofollow"
      />
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ChevronLeft size={18} /> {t.backMarketplace}
      </button>
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black tracking-tight">{t.wishlist}</h1>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {stays.map((stay) => (
            <ListingCard key={stay.id} language={language} stay={stay} onSelect={() => onSelect(stay)} />
          ))}
        </div>
        {stays.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-black">{t.wishlistEmpty}</p>
          </div>
        )}
      </section>
    </main>
  );
}

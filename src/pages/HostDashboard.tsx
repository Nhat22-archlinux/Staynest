import { useEffect, useState } from "react";
import { ChevronLeft, Edit3, Home, ImagePlus, MapPin, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { ControlledField } from "../components/ControlledField";
import { DashboardStat } from "../components/DashboardStat";
import { MiniMetric } from "../components/MiniMetric";
import { amenities } from "../data/amenities";
import type { Amenity, AuthUser, Booking, DiscountRange, DiscountType, Homestay, Language, Review } from "../types";
import { deleteHomestayImages, fetchBookings, fetchHostReviews, uploadHomestayImages } from "../utils/api";
import { formatPrice } from "../utils/currency";
import { cleanDiscountPercent, getPriceBreakdown } from "../utils/discount";
import { amenityLabels, formatListingType, text } from "../utils/i18n";

type ListingForm = {
  title: string;
  location: string;
  area: string;
  price: string;
  guests: string;
  beds: string;
  baths: string;
  type: Homestay["type"];
  description: string;
  amenities: Amenity[];
  image: string;
  gallery: string[];
  discountType: DiscountType;
  discountPercent: string;
  discountRanges: Array<Omit<DiscountRange, "percent"> & { percent: string }>;
};

const emptyListingForm: ListingForm = {
  title: "",
  location: "",
  area: "",
  price: "",
  guests: "2",
  beds: "1",
  baths: "1",
  type: "Rent",
  description: "",
  amenities: ["Wi-Fi"],
  image: "",
  gallery: [],
  discountType: "none",
  discountPercent: "",
  discountRanges: [],
};

const fallbackListingImage =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=85";

type HostDashboardProps = {
  language: Language;
  stays: Homestay[];
  user: AuthUser;
  token: string | null;
  onBack: () => void;
  onCreateNew: () => void;
  onManage: (id: Homestay["id"]) => void;
  onEdit: (id: Homestay["id"]) => void;
  onCreate: (stay: Homestay) => Promise<void>;
  onUpdate: (id: Homestay["id"], stay: Homestay) => Promise<void>;
  onDelete: (id: Homestay["id"]) => Promise<void>;
};

function formFromStay(stay: Homestay): ListingForm {
  return {
    title: stay.title,
    location: stay.location,
    area: stay.area,
    price: String(stay.price),
    guests: String(stay.guests),
    beds: String(stay.beds),
    baths: String(stay.baths),
    type: stay.type,
    description: stay.description,
    amenities: stay.amenities,
    image: stay.image,
    gallery: stay.gallery,
    discountType: stay.discount?.type ?? "none",
    discountPercent: stay.discount?.percent ? String(stay.discount.percent) : "",
    discountRanges:
      stay.discount?.ranges.map((range) => ({
        id: range.id,
        startAt: range.startAt ? range.startAt.slice(0, 16) : "",
        endAt: range.endAt ? range.endAt.slice(0, 16) : "",
        percent: String(range.percent),
      })) ?? [],
  };
}

function uniqueImages(images: string[]) {
  return [...new Set(images.filter(Boolean))];
}

const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

export function HostDashboard({ language, stays, user, token, onBack, onCreateNew, onManage, onEdit, onCreate, onUpdate, onDelete }: HostDashboardProps) {
  const t = text[language];
  const [editingId, setEditingId] = useState<Homestay["id"] | null>(null);
  const [form, setForm] = useState<ListingForm>(emptyListingForm);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [hostReviews, setHostReviews] = useState<Review[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);

  const hostListings = stays.filter((stay) => stay.owner === user.id || stay.host === user.name);
  const existingImageUrls = uniqueImages([form.image, ...form.gallery]);
  const now = new Date();
  const monthlyCompletedPaidBookings = hostBookings.filter((booking) => {
    const completedAt = booking.updatedAt ? new Date(booking.updatedAt) : new Date(booking.checkOut);
    return booking.status === "completed" && booking.paymentStatus === "paid" && completedAt.getMonth() === now.getMonth() && completedAt.getFullYear() === now.getFullYear();
  });
  const monthlyRevenue = monthlyCompletedPaidBookings.reduce((sum, booking) => sum + Number(booking.finalTotal ?? booking.totalPriceUsd ?? 0), 0);
  const pendingUnpaidAmount = hostBookings
    .filter((booking) => (booking.status === "pending" || booking.status === "confirmed") && booking.paymentStatus === "unpaid")
    .reduce((sum, booking) => sum + Number(booking.finalTotal ?? booking.totalPriceUsd ?? 0), 0);
  const averageRating =
    hostListings.length > 0 ? hostListings.reduce((sum, stay) => sum + stay.rating, 0) / hostListings.length : 0;

  useEffect(() => {
    if (!token) {
      setHostReviews([]);
      setHostBookings([]);
      return;
    }

    fetchHostReviews(token).then(setHostReviews).catch(() => setHostReviews([]));
    fetchBookings(token).then(setHostBookings).catch(() => setHostBookings([]));
  }, [token]);

  const updateForm = (field: keyof ListingForm, value: string | Amenity[] | string[]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateDiscountRange = (id: string, field: "startAt" | "endAt" | "percent", value: string) => {
    setForm((current) => ({
      ...current,
      discountRanges: current.discountRanges.map((range) => (range.id === id ? { ...range, [field]: value } : range)),
    }));
  };

  const addDiscountRange = () => {
    setForm((current) => ({
      ...current,
      discountRanges: [
        ...current.discountRanges,
        { id: crypto.randomUUID(), startAt: "", endAt: "", percent: "" },
      ],
    }));
  };

  const removeDiscountRange = (id: string) => {
    setForm((current) => ({
      ...current,
      discountRanges: current.discountRanges.filter((range) => range.id !== id),
    }));
  };

  const toggleFormAmenity = (amenity: Amenity) => {
    setForm((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }));
  };

  const handleImages = (files: FileList | null) => {
    setUploadError("");
    if (!files?.length) {
      return;
    }

    const nextFiles = Array.from(files);
    const unsupportedFile = nextFiles.find((file) => !allowedImageTypes.includes(file.type));
    if (unsupportedFile) {
      setUploadError(t.uploadUnsupported);
      return;
    }

    const oversizedFile = nextFiles.find((file) => file.size > maxImageSize);
    if (oversizedFile) {
      setUploadError(t.uploadTooLarge);
      return;
    }

    setSelectedFiles((current) => [...current, ...nextFiles]);
    setPreviewUrls((current) => [...current, ...nextFiles.map((file) => URL.createObjectURL(file))]);
  };

  const removeSelectedImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((current) => current.filter((_, imageIndex) => imageIndex !== index));
    setPreviewUrls((current) => current.filter((_, imageIndex) => imageIndex !== index));
  };

  const removeExistingImage = (imageUrl: string) => {
    const remainingImages = existingImageUrls.filter((image) => image !== imageUrl);

    if (imageUrl.includes("res.cloudinary.com")) {
      setRemovedImageUrls((current) => (current.includes(imageUrl) ? current : [...current, imageUrl]));
    }

    setForm((current) => ({
      ...current,
      image: remainingImages[0] ?? "",
      gallery: remainingImages,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyListingForm);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setSelectedFiles([]);
    setRemovedImageUrls([]);
    setUploadError("");
    setUploading(false);
  };

  const editListing = (stay: Homestay) => {
    onEdit(stay.id);
  };

  const deleteListing = async (id: Homestay["id"]) => {
    await onDelete(id);
    if (editingId === id) {
      resetForm();
    }
  };

  const saveListing = async () => {
    let cloudinaryUrls: string[] = [];

    if (selectedFiles.length > 0) {
      if (!token) {
        setUploadError(t.uploadFailed);
        return;
      }

      try {
        setUploading(true);
        setUploadError("");
        const uploadedImages = await uploadHomestayImages(selectedFiles, token);
        cloudinaryUrls = uploadedImages.map((image) => image.url);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : t.uploadFailed);
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    const listingImages = uniqueImages([...existingImageUrls, ...cloudinaryUrls]);
    const existingListing = editingId ? stays.find((stay) => stay.id === editingId) : undefined;
    const discount = {
      type: form.discountType,
      percent: form.discountType === "manual" ? cleanDiscountPercent(Number(form.discountPercent) || 0) : 0,
      ranges:
        form.discountType === "scheduled"
          ? form.discountRanges
              .filter((range) => range.startAt && range.endAt && Number(range.percent) > 0)
              .map((range) => ({
                id: range.id,
                startAt: range.startAt,
                endAt: range.endAt,
                percent: cleanDiscountPercent(Number(range.percent) || 0),
              }))
          : [],
    };
    const listing: Homestay = {
      id: editingId ?? Date.now(),
      title: form.title || t.untitled,
      location: form.location || "Da Nang, Vietnam",
      area: form.area || t.centralDistrict,
      price: Number(form.price) || 90,
      rating: existingListing?.rating ?? 4.8,
      reviews: existingListing?.reviews ?? 0,
      guests: Number(form.guests) || 2,
      beds: Number(form.beds) || 1,
      baths: Number(form.baths) || 1,
      image: listingImages[0] || fallbackListingImage,
      gallery: listingImages.length > 0 ? listingImages : [fallbackListingImage],
      amenities: form.amenities.length > 0 ? form.amenities : ["Wi-Fi"],
      host: user.name,
      owner: user.id,
      type: form.type,
      description: form.description || t.defaultDescription,
      discount,
    };

    if (editingId) {
      await onUpdate(editingId, listing);
    } else {
      await onCreate(listing);
    }

    if (removedImageUrls.length > 0 && token) {
      deleteHomestayImages(removedImageUrls, token).catch(() => undefined);
    }

    resetForm();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ChevronLeft size={18} /> {t.backMarketplace}
      </button>

      <section className="relative overflow-hidden rounded-lg bg-ink p-6 text-white shadow-soft sm:p-8">
        <img
          src="https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=85"
          alt="Well designed host property"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_520px] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
              <Home size={16} /> {t.hostDashboard}
            </p>
            <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">{t.hostTitle}</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/80">{t.hostCopy}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardStat label={t.listings} value={String(hostListings.length)} />
            <DashboardStat label={t.avgRating} value={averageRating.toFixed(2)} />
            <DashboardStat label={t.thisMonthRevenue} value={formatPrice(monthlyRevenue, language)} />
            <DashboardStat label={t.completedThisMonth} value={String(monthlyCompletedPaidBookings.length)} />
            <DashboardStat label={t.pendingUnpaidAmount} value={formatPrice(pendingUnpaidAmount, language)} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6">
        {false && <form className="h-fit rounded-lg border border-black/10 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{editingId ? t.editListing : t.createListing}</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">{t.mockState}</p>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="grid gap-4">
            <ControlledField label={t.homestayTitle} value={form.title} onChange={(value) => updateForm("title", value)} placeholder={t.titlePlaceholder} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <ControlledField label={t.location} value={form.location} onChange={(value) => updateForm("location", value)} placeholder="Da Nang, Vietnam" />
              <ControlledField label={t.area} value={form.area} onChange={(value) => updateForm("area", value)} placeholder={t.areaPlaceholder} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ControlledField label={`${t.price} (USD)`} value={form.price} onChange={(value) => updateForm("price", value)} placeholder="120" />
              <label>
                <span className="mb-2 block text-sm font-black">{t.listingType}</span>
                <select
                  value={form.type}
                  onChange={(event) => updateForm("type", event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
                >
                  <option value="Rent">{t.forRent}</option>
                  <option value="Sale">{t.forSale}</option>
                </select>
              </label>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-black">{t.discountSettings}</p>
              <label>
                <span className="mb-2 block text-sm font-black">{t.discountType}</span>
                <select
                  value={form.discountType}
                  onChange={(event) => updateForm("discountType", event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
                >
                  <option value="none">{t.noDiscount}</option>
                  <option value="manual">{t.manualDiscount}</option>
                  <option value="scheduled">{t.scheduledDiscount}</option>
                </select>
              </label>
              {form.discountType === "manual" && (
                <ControlledField
                  label={t.discountPercent}
                  value={form.discountPercent}
                  onChange={(value) => updateForm("discountPercent", value)}
                  placeholder="20"
                />
              )}
              {form.discountType === "scheduled" && (
                <div className="mt-4 grid gap-3">
                  {form.discountRanges.map((range) => (
                    <div key={range.id} className="rounded-md border border-slate-200 bg-white p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t.discountStart}</span>
                          <input
                            type="datetime-local"
                            value={range.startAt}
                            onChange={(event) => updateDiscountRange(range.id ?? "", "startAt", event.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-ocean"
                          />
                        </label>
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t.discountEnd}</span>
                          <input
                            type="datetime-local"
                            value={range.endAt}
                            onChange={(event) => updateDiscountRange(range.id ?? "", "endAt", event.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-ocean"
                          />
                        </label>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <ControlledField
                          label={t.discountPercent}
                          value={range.percent}
                          onChange={(value) => updateDiscountRange(range.id ?? "", "percent", value)}
                          placeholder="15"
                        />
                        <button
                          type="button"
                          onClick={() => removeDiscountRange(range.id ?? "")}
                          className="self-end rounded-md border border-black/10 px-4 py-3 text-sm font-black hover:bg-slate-50"
                        >
                          {t.remove}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addDiscountRange} className="rounded-md border border-black/10 px-4 py-3 text-sm font-black hover:bg-white">
                    {t.addDiscountRange}
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ControlledField label={t.guests} value={form.guests} onChange={(value) => updateForm("guests", value)} placeholder="6" />
              <ControlledField label={t.beds} value={form.beds} onChange={(value) => updateForm("beds", value)} placeholder="3" />
              <ControlledField label={t.baths} value={form.baths} onChange={(value) => updateForm("baths", value)} placeholder="2" />
            </div>
            <label>
              <span className="mb-2 block text-sm font-black">{t.description}</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder={t.descriptionPlaceholder}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-sm font-black">{t.amenities}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {amenities.map((amenity) => (
                <label key={amenity} className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(amenity)}
                    onChange={() => toggleFormAmenity(amenity)}
                    className="h-4 w-4 accent-ocean"
                  />
                  {amenityLabels[language][amenity]}
                </label>
              ))}
            </div>
          </div>

          <label className="mt-5 block cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-ocean">
            <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-ocean/10 text-ocean">
              <Upload size={20} />
            </span>
            <span className="block text-sm font-black">{t.uploadImages}</span>
            <span className="mt-1 block text-sm text-slate-600">{uploading ? t.uploadingImages : t.uploadCopy}</span>
            <input type="file" multiple accept="image/*" className="sr-only" onChange={(event) => handleImages(event.target.files)} />
          </label>
          {uploadError && <p className="mt-3 rounded-md bg-coral/10 p-3 text-sm font-bold text-coral">{uploadError}</p>}
          {selectedFiles.length > 0 && !uploadError && (
            <p className="mt-3 rounded-md bg-ocean/10 p-3 text-sm font-bold text-ocean">
              {selectedFiles.length} {t.uploadReady}
            </p>
          )}

          {(previewUrls.length > 0 || existingImageUrls.length > 0) && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {existingImageUrls.slice(0, 6).map((image) => (
                <div key={image} className="relative">
                  <img src={image} alt="Listing upload preview" className="aspect-square rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(image)}
                    aria-label={t.removeImage}
                    title={t.removeImage}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-coral hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              {previewUrls.slice(0, Math.max(0, 6 - existingImageUrls.length)).map((image, index) => (
                <div key={`${image}-${index}`} className="relative">
                  <img src={image} alt="Listing upload preview" className="aspect-square rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => removeSelectedImage(index)}
                    aria-label={t.removeImage}
                    title={t.removeImage}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-coral hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetForm} className="rounded-md border border-black/10 px-6 py-3 text-sm font-black">
              {t.clear}
            </button>
            <button
              type="button"
              onClick={saveListing}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ocean px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {editingId ? <Save size={17} /> : <Plus size={17} />} {editingId ? t.saveChanges : t.createListingButton}
            </button>
          </div>
        </form>}

        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{t.yourListings}</h2>
              <p className="text-sm font-medium text-slate-600">{t.yourListingsCopy}</p>
            </div>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-sm"
            >
              <Plus size={17} /> {t.createNewListing}
            </button>
          </div>

          <div className="grid gap-4">
            {hostListings.map((stay) => {
              const price = getPriceBreakdown(stay);
              const showLowAvailability = typeof stay.availableRooms === "number" && stay.availableRooms <= 5;

              return (
              <article key={stay.id} className="grid overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm md:grid-cols-[220px_1fr]">
                <button type="button" onClick={() => onManage(stay.id)} className="relative aspect-[4/3] text-left md:aspect-auto">
                  <img src={stay.image} alt={stay.title} className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-ink shadow-sm">
                    {formatListingType(stay.type, language)}
                  </span>
                  {price.hasDiscount && (
                    <span className="absolute left-3 top-11 rounded-full bg-coral px-3 py-1 text-xs font-black text-white shadow-sm">
                      -{price.discountPercent}%
                    </span>
                  )}
                </button>
                <div className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <button type="button" onClick={() => onManage(stay.id)} className="text-left">
                        <h3 className="text-xl font-black tracking-tight hover:text-ocean">{stay.title}</h3>
                      </button>
                      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-600">
                        <MapPin size={15} /> {stay.area}, {stay.location}
                      </p>
                      {showLowAvailability && (
                        <p className="mt-2 text-sm font-black text-coral">
                          {language === "vi" ? `Chỉ còn ${stay.availableRooms} phòng trống` : `Only ${stay.availableRooms} rooms left`}
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      {price.hasDiscount && <p className="text-sm font-black text-slate-400 line-through">{formatPrice(price.originalPrice, language)}</p>}
                      <p className="text-2xl font-black text-ocean">{formatPrice(price.nightlyPrice, language)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <MiniMetric label={`${stay.guests} ${t.guests.toLowerCase()}`} />
                    <MiniMetric label={`${stay.beds} ${t.beds}`} />
                    <MiniMetric label={`${stay.baths} ${t.baths}`} />
                    <MiniMetric label={`${stay.rating} ${t.rating}`} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stay.amenities.slice(0, 4).map((amenity) => (
                      <span key={amenity} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {amenityLabels[language][amenity]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    <button
                      type="button"
                      onClick={() => onManage(stay.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-2.5 text-sm font-black hover:bg-slate-50"
                    >
                      {t.manageListing}
                    </button>
                    <button
                      type="button"
                      onClick={() => editListing(stay)}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-2.5 text-sm font-black hover:bg-slate-50"
                    >
                      <Edit3 size={16} /> {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteListing(stay.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-coral px-4 py-2.5 text-sm font-black text-white hover:bg-[#d85f42]"
                    >
                      <Trash2 size={16} /> {t.listingDeleteAction}
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
          {hostListings.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <ImagePlus size={34} className="mx-auto text-ocean" />
              <p className="mt-3 text-lg font-black">{t.noHostListings}</p>
              <p className="mt-1 text-sm text-slate-600">{t.noHostListingsCopy}</p>
            </div>
          )}

          <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight">{t.reviewsTitle}</h2>
            <div className="mt-4 grid gap-3">
              {hostReviews.map((review) => {
                const homestay = typeof review.homestay === "object" ? review.homestay : undefined;
                return (
                  <article key={review._id ?? review.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-black">{homestay?.title ?? t.homestays}</p>
                        <p className="text-sm font-semibold text-slate-600">{review.userName}</p>
                      </div>
                      <p className="text-sm font-black text-coral">{review.rating} ★</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{review.comment}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </article>
                );
              })}
            </div>
            {hostReviews.length === 0 && <p className="mt-3 text-sm font-semibold text-slate-600">{t.noReviews}</p>}
          </section>
        </div>
      </section>
    </main>
  );
}

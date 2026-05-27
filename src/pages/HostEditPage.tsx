import { useEffect, useState } from "react";
import { ChevronLeft, Save, Upload, X } from "lucide-react";
import { ControlledField } from "../components/ControlledField";
import { amenities } from "../data/amenities";
import type { Amenity, AuthUser, DiscountRange, DiscountType, Homestay, Language } from "../types";
import { deleteHomestayImages, uploadHomestayImages } from "../utils/api";
import { cleanDiscountPercent } from "../utils/discount";
import { amenityLabels, text } from "../utils/i18n";

type ListingForm = {
  title: string;
  location: string;
  area: string;
  price: string;
  guests: string;
  beds: string;
  baths: string;
  totalRooms: string;
  availableRooms: string;
  type: Homestay["type"];
  description: string;
  amenities: Amenity[];
  image: string;
  gallery: string[];
  discountType: DiscountType;
  discountPercent: string;
  discountRanges: Array<Omit<DiscountRange, "percent"> & { percent: string }>;
};

type HostEditPageProps = {
  language: Language;
  stay?: Homestay;
  user: AuthUser;
  token: string | null;
  mode?: "create" | "edit";
  onBack: () => void;
  onCreate?: (stay: Homestay) => Promise<void>;
  onSave?: (id: Homestay["id"], stay: Homestay) => Promise<void>;
};

const fallbackListingImage =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=85";
const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

const emptyListingForm: ListingForm = {
  title: "",
  location: "",
  area: "",
  price: "",
  guests: "2",
  beds: "1",
  baths: "1",
  totalRooms: "1",
  availableRooms: "1",
  type: "Rent",
  description: "",
  amenities: ["Wi-Fi"],
  image: "",
  gallery: [],
  discountType: "none",
  discountPercent: "",
  discountRanges: [],
};

function uniqueImages(images: string[]) {
  return [...new Set(images.filter(Boolean))];
}

function formFromStay(stay: Homestay): ListingForm {
  return {
    title: stay.title,
    location: stay.location,
    area: stay.area,
    price: String(stay.price),
    guests: String(stay.guests),
    beds: String(stay.beds),
    baths: String(stay.baths),
    totalRooms: String(stay.totalRooms ?? 1),
    availableRooms: String(stay.availableRooms ?? stay.totalRooms ?? 1),
    type: stay.type,
    description: stay.description,
    amenities: stay.amenities,
    image: stay.image,
    gallery: stay.gallery,
    discountType: stay.discount?.isActive === false ? "none" : stay.discount?.type ?? "none",
    discountPercent: stay.discount?.percent ? String(stay.discount.percent) : "",
    discountRanges:
      (stay.discount?.schedules ?? stay.discount?.ranges ?? []).map((range) => ({
        id: range.id,
        startAt: range.startAt ? range.startAt.slice(0, 16) : "",
        endAt: range.endAt ? range.endAt.slice(0, 16) : "",
        percent: String(range.percent),
      })) ?? [],
  };
}

export function HostEditPage({ language, stay, user, token, mode = "edit", onBack, onCreate, onSave }: HostEditPageProps) {
  const t = text[language];
  const [form, setForm] = useState<ListingForm>(() => (stay ? formFromStay(stay) : emptyListingForm));
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const existingImageUrls = uniqueImages([form.image, ...form.gallery]);

  useEffect(() => {
    setForm(stay ? formFromStay(stay) : emptyListingForm);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setSelectedFiles([]);
    setRemovedImageUrls([]);
    setUploadError("");
  }, [stay?.id, mode]);

  const updateForm = (field: keyof ListingForm, value: string | Amenity[] | string[]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleFormAmenity = (amenity: Amenity) => {
    setForm((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }));
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
      discountRanges: [...current.discountRanges, { id: crypto.randomUUID(), startAt: "", endAt: "", percent: "" }],
    }));
  };

  const removeDiscountRange = (id: string) => {
    setForm((current) => ({
      ...current,
      discountRanges: current.discountRanges.filter((range) => range.id !== id),
    }));
  };

  const handleImages = (files: FileList | null) => {
    setUploadError("");
    if (!files?.length) {
      return;
    }

    const nextFiles = Array.from(files);
    if (nextFiles.some((file) => !allowedImageTypes.includes(file.type))) {
      setUploadError(t.uploadUnsupported);
      return;
    }

    if (nextFiles.some((file) => file.size > maxImageSize)) {
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
    const schedules =
      form.discountType === "scheduled"
        ? form.discountRanges
            .filter((range) => range.startAt && range.endAt && Number(range.percent) > 0)
            .map((range) => ({
              id: range.id,
              startAt: range.startAt,
              endAt: range.endAt,
              percent: cleanDiscountPercent(Number(range.percent) || 0),
            }))
        : [];
    const manualPercent = form.discountType === "manual" ? cleanDiscountPercent(Number(form.discountPercent) || 0) : 0;
    const totalRooms = Math.max(Number(form.totalRooms) || 1, 1);
    const availableRooms = Math.min(Math.max(Number(form.availableRooms) || 0, 0), totalRooms);
    const discount = {
      type: form.discountType,
      percent: manualPercent,
      isActive: form.discountType === "manual" ? manualPercent > 0 : form.discountType === "scheduled" && schedules.length > 0,
      schedules,
    };

    const listing: Homestay = {
      ...(stay ?? {
        id: Date.now(),
        rating: 4.8,
        reviews: 0,
      }),
      title: form.title || t.untitled,
      location: form.location || "Da Nang, Vietnam",
      area: form.area || t.centralDistrict,
      price: Number(form.price) || 90,
      guests: Number(form.guests) || 2,
      beds: Number(form.beds) || 1,
      baths: Number(form.baths) || 1,
      totalRooms,
      availableRooms,
      image: listingImages[0] || fallbackListingImage,
      gallery: listingImages.length > 0 ? listingImages : [fallbackListingImage],
      amenities: form.amenities.length > 0 ? form.amenities : ["Wi-Fi"],
      host: user.name,
      owner: user.id,
      type: form.type,
      description: form.description || t.defaultDescription,
      discount,
    };

    if (mode === "create") {
      await onCreate?.(listing);
    } else if (stay) {
      await onSave?.(stay.id, listing);
    }

    if (removedImageUrls.length > 0 && token) {
      deleteHomestayImages(removedImageUrls, token).catch(() => undefined);
    }

    onBack();
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ChevronLeft size={18} /> {t.hostDashboard}
      </button>

      <form className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h1 className="text-3xl font-black tracking-tight">{mode === "create" ? t.createListing : t.editListing}</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">{mode === "create" ? t.createListingCopy : stay?.title}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ControlledField label={t.homestayTitle} value={form.title} onChange={(value) => updateForm("title", value)} placeholder={t.titlePlaceholder} />
          <ControlledField label={t.location} value={form.location} onChange={(value) => updateForm("location", value)} placeholder="Da Nang, Vietnam" />
          <ControlledField label={t.area} value={form.area} onChange={(value) => updateForm("area", value)} placeholder={t.areaPlaceholder} />
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

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ControlledField label={t.guests} value={form.guests} onChange={(value) => updateForm("guests", value)} placeholder="6" />
          <ControlledField label={t.beds} value={form.beds} onChange={(value) => updateForm("beds", value)} placeholder="3" />
          <ControlledField label={t.baths} value={form.baths} onChange={(value) => updateForm("baths", value)} placeholder="2" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ControlledField label={t.totalRooms} value={form.totalRooms} onChange={(value) => updateForm("totalRooms", value)} placeholder="8" />
          <ControlledField label={t.availableRooms} value={form.availableRooms} onChange={(value) => updateForm("availableRooms", value)} placeholder="3" />
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-black">{t.description}</span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
            placeholder={t.descriptionPlaceholder}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
          />
        </label>

        <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
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
            <div className="mt-3">
              <ControlledField label={t.discountPercent} value={form.discountPercent} onChange={(value) => updateForm("discountPercent", value)} placeholder="20" />
            </div>
          )}
          {form.discountType === "scheduled" && (
            <div className="mt-4 grid gap-3">
              {form.discountRanges.map((range) => (
                <div key={range.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t.discountStart}</span>
                      <input type="datetime-local" value={range.startAt} onChange={(event) => updateDiscountRange(range.id ?? "", "startAt", event.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-ocean" />
                    </label>
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t.discountEnd}</span>
                      <input type="datetime-local" value={range.endAt} onChange={(event) => updateDiscountRange(range.id ?? "", "endAt", event.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-ocean" />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <ControlledField label={t.discountPercent} value={range.percent} onChange={(value) => updateDiscountRange(range.id ?? "", "percent", value)} placeholder="15" />
                    <button type="button" onClick={() => removeDiscountRange(range.id ?? "")} className="self-end rounded-md border border-black/10 px-4 py-3 text-sm font-black hover:bg-slate-50">
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
        </section>

        <section className="mt-5">
          <p className="mb-3 text-sm font-black">{t.amenities}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => (
              <label key={amenity} className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-semibold">
                <input type="checkbox" checked={form.amenities.includes(amenity)} onChange={() => toggleFormAmenity(amenity)} className="h-4 w-4 accent-ocean" />
                {amenityLabels[language][amenity]}
              </label>
            ))}
          </div>
        </section>

        <label className="mt-5 block cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-ocean">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-ocean/10 text-ocean">
            <Upload size={20} />
          </span>
          <span className="block text-sm font-black">{t.uploadImages}</span>
          <span className="mt-1 block text-sm text-slate-600">{uploading ? t.uploadingImages : t.uploadCopy}</span>
          <input type="file" multiple accept="image/*" className="sr-only" onChange={(event) => handleImages(event.target.files)} />
        </label>
        {uploadError && <p className="mt-3 rounded-md bg-coral/10 p-3 text-sm font-bold text-coral">{uploadError}</p>}

        {(previewUrls.length > 0 || existingImageUrls.length > 0) && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {existingImageUrls.map((image) => (
              <div key={image} className="relative">
                <img src={image} alt="Listing upload preview" className="aspect-square rounded-md object-cover" />
                <button type="button" onClick={() => removeExistingImage(image)} aria-label={t.removeImage} title={t.removeImage} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-coral hover:text-white">
                  <X size={15} />
                </button>
              </div>
            ))}
            {previewUrls.map((image, index) => (
              <div key={`${image}-${index}`} className="relative">
                <img src={image} alt="Listing upload preview" className="aspect-square rounded-md object-cover" />
                <button type="button" onClick={() => removeSelectedImage(index)} aria-label={t.removeImage} title={t.removeImage} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-coral hover:text-white">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onBack} className="rounded-md border border-black/10 px-6 py-3 text-sm font-black">
            {t.close}
          </button>
          <button type="button" onClick={saveListing} disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-md bg-ocean px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            <Save size={17} /> {mode === "create" ? t.createListingButton : t.saveChanges}
          </button>
        </div>
      </form>
    </main>
  );
}

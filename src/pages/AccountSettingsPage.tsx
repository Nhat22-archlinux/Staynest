import { useState } from "react";
import { ChevronLeft, Save } from "lucide-react";
import { ControlledField } from "../components/ControlledField";
import { SEO } from "../components/SEO";
import type { AuthUser, Language, Voucher } from "../types";
import { text } from "../utils/i18n";

type AccountSettingsPageProps = {
  language: Language;
  user: AuthUser;
  vouchers: Voucher[];
  onBack: () => void;
  onSave: (payload: { name?: string; password?: string }) => Promise<void>;
};

export function AccountSettingsPage({ language, user, vouchers, onBack, onSave }: AccountSettingsPageProps) {
  const t = text[language];
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      setMessage("");
      await onSave({ name, password: password || undefined });
      setPassword("");
      setMessage(t.accountUpdated);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.authError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <SEO
        title="Account settings"
        description="Private StayNest account settings."
        canonicalPath="/account"
        robots="noindex,nofollow"
      />
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ChevronLeft size={18} /> {t.backMarketplace}
      </button>
      <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t.accountSettings}</h1>
        <div className="mt-6 grid gap-4">
          <ControlledField label={t.name} value={name} onChange={setName} placeholder={t.name} />
          <ControlledField label={t.email} value={user.email} onChange={() => undefined} placeholder={t.email} />
          <ControlledField label={t.accountType} value={user.role === "host" ? t.hostAccount : t.guestAccount} onChange={() => undefined} placeholder={t.accountType} />
          <ControlledField label={t.newPassword} value={password} onChange={setPassword} placeholder={t.newPasswordPlaceholder} />
        </div>
        {message && <p className="mt-4 rounded-md bg-ocean/10 p-3 text-sm font-bold text-ocean">{message}</p>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ocean px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        >
          <Save size={17} /> {t.saveChanges}
        </button>
      </section>
      <section className="mt-5 rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black tracking-tight sm:text-2xl">{t.vouchers}</h2>
        <div className="mt-4 grid gap-3">
          {vouchers.map((voucher) => (
            <article key={voucher._id} className="flex flex-col gap-2 rounded-lg border border-black/10 bg-[#f7f4ef] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-ink">{voucher.code}</p>
                <p className="text-sm font-bold text-slate-600">
                  {voucher.percent}% {t.voucherDiscount} · {t.expires} {new Date(voucher.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${voucher.isUsed ? "bg-slate-200 text-slate-600" : "bg-ocean/10 text-ocean"}`}>
                {voucher.isUsed ? t.used : t.available}
              </span>
            </article>
          ))}
        </div>
        {vouchers.length === 0 && <p className="mt-4 text-sm font-semibold text-slate-600">{t.noVouchers}</p>}
      </section>
    </main>
  );
}

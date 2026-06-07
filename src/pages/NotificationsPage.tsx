import { ChevronLeft } from "lucide-react";
import { SEO } from "../components/SEO";
import type { Language, Notification } from "../types";
import { text } from "../utils/i18n";

type NotificationsPageProps = {
  language: Language;
  notifications: Notification[];
  onBack: () => void;
  onMarkRead: (id: string) => Promise<void> | void;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: Notification) => void;
};

export function NotificationsPage({ language, notifications, onBack, onMarkRead, onMarkAllRead, onOpenNotification }: NotificationsPageProps) {
  const t = text[language];

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <SEO
        title="Notifications"
        description="Private StayNest notifications."
        canonicalPath="/notifications"
        robots="noindex,nofollow"
      />
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ChevronLeft size={18} /> {t.backMarketplace}
      </button>
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-black tracking-tight">{t.notifications}</h1>
          <button type="button" onClick={onMarkAllRead} className="rounded-md border border-black/10 px-4 py-2 text-sm font-black hover:bg-slate-50">
            {t.markAllRead}
          </button>
        </div>
        <div className="mt-6 grid gap-3">
          {notifications.map((notification) => (
            <article key={notification._id} className={`rounded-lg border p-4 ${notification.read ? "border-slate-200" : "border-ocean/30 bg-ocean/5"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button type="button" onClick={() => onOpenNotification(notification)} className="min-w-0 flex-1 text-left">
                  <p className="font-black">{language === "vi" ? notification.messageVi ?? notification.message : notification.messageEn ?? notification.message}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
                </button>
                {!notification.read && (
                  <button type="button" onClick={(event) => { event.stopPropagation(); void onMarkRead(notification._id); }} className="rounded-md bg-ocean px-4 py-2 text-sm font-black text-white">
                    {t.markRead}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {notifications.length === 0 && <p className="mt-6 text-sm font-semibold text-slate-600">{t.noNotifications}</p>}
      </section>
    </main>
  );
}

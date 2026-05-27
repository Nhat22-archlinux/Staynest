import { Bell, Home, Menu } from "lucide-react";
import { useState } from "react";
import type { AuthUser, Language } from "../types";
import { text } from "../utils/i18n";

type HeaderProps = {
  language: Language;
  setLanguage: (language: Language) => void;
  onHome: () => void;
  onHost: () => void;
  onAdmin: () => void;
  onLogin: () => void;
  onSignup: () => void;
  onBookings: () => void;
  onWishlist: () => void;
  onNotifications: () => void;
  onAccount: () => void;
  onLogout: () => void;
  user: AuthUser | null;
  unreadCount: number;
};

export function Header({ language, setLanguage, onHome, onHost, onAdmin, onLogin, onSignup, onBookings, onWishlist, onNotifications, onAccount, onLogout, user, unreadCount }: HeaderProps) {
  const t = text[language];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f7f4ef]/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <button onClick={onHome} className="flex items-center gap-2 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ocean text-white">
            <Home size={21} />
          </span>
          <span>
            <span className="block text-lg font-black tracking-tight">StayNest</span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:block">{t.homestays}</span>
          </span>
        </button>
        <div className="hidden items-center gap-7 text-sm font-semibold text-slate-700 md:flex">
          <button onClick={onHome} className="hover:text-ocean">{t.explore}</button>
          {user?.role !== "host" && user?.role !== "admin" && <button onClick={onWishlist} className="hover:text-ocean">{t.wishlist}</button>}
          <button onClick={onBookings} className="hover:text-ocean">{user?.role === "host" ? t.hostBookings : t.bookingHistory}</button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="h-10 max-w-[112px] rounded-full border border-black/10 bg-white px-3 text-sm font-black text-ink shadow-sm outline-none focus:border-ocean sm:max-w-none"
            aria-label="Language"
          >
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
          {user && (
            <button
              onClick={onNotifications}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-ink shadow-sm"
              aria-label={t.notifications}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-coral px-1.5 py-0.5 text-center text-[11px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
          {user?.role === "host" && (
            <button
              onClick={onHost}
              className="hidden rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-ocean sm:inline-flex"
            >
              {t.hostDashboard}
            </button>
          )}
          {user?.role === "admin" && (
            <button
              onClick={onAdmin}
              className="hidden rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-ocean sm:inline-flex"
            >
              {t.adminDashboard}
            </button>
          )}
          {user ? (
            <button onClick={onLogout} className="hidden rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold shadow-sm sm:inline-flex">
              {t.logout}
            </button>
          ) : (
            <>
              <button onClick={onLogin} className="hidden rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold shadow-sm sm:inline-flex">
                {t.login}
              </button>
              <button onClick={onSignup} className="hidden rounded-full bg-ocean px-4 py-2.5 text-sm font-bold text-white shadow-sm sm:inline-flex">
                {t.signup}
              </button>
            </>
          )}
          <div className="relative">
            <button onClick={() => setMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-ink shadow-sm">
              <Menu size={20} />
            </button>
            {menuOpen && (
              <>
                <button className="fixed inset-0 z-40 cursor-default bg-black/10 md:hidden" aria-label={t.close} onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-lg border border-black/10 bg-white py-2 text-sm font-bold shadow-soft sm:w-72">
                  <button onClick={() => { setMenuOpen(false); onHome(); }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">{t.explore}</button>
                  {user ? (
                    <>
                      {user.role !== "host" && user.role !== "admin" && <button onClick={() => { setMenuOpen(false); onWishlist(); }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">{t.wishlist}</button>}
                      <button onClick={() => { setMenuOpen(false); onBookings(); }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">{user.role === "host" ? t.hostBookings : t.bookingHistory}</button>
                      <button onClick={() => { setMenuOpen(false); onNotifications(); }} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                        <span>{t.notifications}</span>
                        {unreadCount > 0 && <span className="rounded-full bg-coral px-2 py-0.5 text-xs text-white">{unreadCount}</span>}
                      </button>
                      <button onClick={() => { setMenuOpen(false); onAccount(); }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">{t.accountSettings}</button>
                      {user.role === "host" && <button onClick={() => { setMenuOpen(false); onHost(); }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">{t.hostDashboard}</button>}
                      {user.role === "admin" && <button onClick={() => { setMenuOpen(false); onAdmin(); }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">{t.adminDashboard}</button>}
                      <button onClick={() => { setMenuOpen(false); onLogout(); }} className="block w-full px-4 py-3 text-left text-coral hover:bg-slate-50">{t.logout}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setMenuOpen(false); onLogin(); }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">{t.login}</button>
                      <button onClick={() => { setMenuOpen(false); onSignup(); }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">{t.signup}</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

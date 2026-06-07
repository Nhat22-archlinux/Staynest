import { lazy, Suspense, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { homestays } from "./data/homestays";
import { useHomestayFilters } from "./hooks/useHomestayFilters";
import { DetailPage } from "./pages/DetailPage";
import { HomePage } from "./pages/HomePage";
import type { Amenity, AuthUser, BookingSearch, Homestay, Language, Notification, View, Voucher } from "./types";
import {
  createHomestay,
  deleteHomestay,
  fetchHomestayById,
  fetchHomestays,
  fetchNotifications,
  fetchVouchers,
  fetchWishlist,
  markAllNotificationsRead,
  markNotificationRead,
  removeWishlistItem,
  saveWishlistItem,
  updateAccount,
  updateHomestay,
} from "./utils/api";
import { initializeAppVersion } from "./utils/appVersion";
import { text } from "./utils/i18n";
import { getHomestayRoute, parseHomestayRoute } from "./utils/routes";

initializeAppVersion();

const HostDashboard = lazy(() => import("./pages/HostDashboard").then((module) => ({ default: module.HostDashboard })));
const HostEditPage = lazy(() => import("./pages/HostEditPage").then((module) => ({ default: module.HostEditPage })));
const HostListingPage = lazy(() => import("./pages/HostListingPage").then((module) => ({ default: module.HostListingPage })));
const AccountSettingsPage = lazy(() => import("./pages/AccountSettingsPage").then((module) => ({ default: module.AccountSettingsPage })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const AuthPage = lazy(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const BookingsPage = lazy(() => import("./pages/BookingsPage").then((module) => ({ default: module.BookingsPage })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const GoogleOAuthSuccessPage = lazy(() => import("./pages/GoogleOAuthSuccessPage").then((module) => ({ default: module.GoogleOAuthSuccessPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const PaymentCancelPage = lazy(() => import("./pages/PaymentCancelPage").then((module) => ({ default: module.PaymentCancelPage })));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage").then((module) => ({ default: module.PaymentSuccessPage })));
const ProtectedMessage = lazy(() => import("./pages/ProtectedMessage").then((module) => ({ default: module.ProtectedMessage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })));
const WishlistPage = lazy(() => import("./pages/WishlistPage").then((module) => ({ default: module.WishlistPage })));

function getRouteHomestayId() {
  return parseHomestayRoute(window.location.pathname)?.homestayId ?? null;
}

function getRouteHostEditId() {
  return window.location.pathname.match(/^\/host\/homestays\/([^/]+)\/edit\/?$/)?.[1] ?? null;
}

function getRouteHostListingId() {
  return window.location.pathname.match(/^\/host\/homestays\/(?!new\/?$)([^/]+)\/?$/)?.[1] ?? null;
}

function isRouteHostDashboard() {
  return /^\/host\/dashboard\/?$/.test(window.location.pathname) || /^\/host\/?$/.test(window.location.pathname);
}

function isRouteHostCreate() {
  return /^\/host\/homestays\/new\/?$/.test(window.location.pathname);
}

type AdminSection = "dashboard" | "users" | "homestays" | "bookings" | "payments" | "reviews";

function getAdminSection(): AdminSection | null {
  const match = window.location.pathname.match(/^\/admin\/(dashboard|users|homestays|bookings|payments|reviews)\/?$/);
  return (match?.[1] as AdminSection | undefined) ?? null;
}

function getStaticRouteView(): View | null {
  if (/^\/auth\/google\/success\/?$/.test(window.location.pathname)) {
    return "googleSuccess";
  }

  if (/^\/payment\/success\/?$/.test(window.location.pathname)) {
    return "paymentSuccess";
  }

  if (/^\/payment\/cancel\/?$/.test(window.location.pathname)) {
    return "paymentCancel";
  }

  if (/^\/forgot-password\/?$/.test(window.location.pathname)) {
    return "forgotPassword";
  }

  if (/^\/reset-password\/?$/.test(window.location.pathname)) {
    return "resetPassword";
  }

  if (/^\/login\/?$/.test(window.location.pathname) || /^\/signup\/?$/.test(window.location.pathname)) {
    return "auth";
  }

  if (/^\/notifications\/?$/.test(window.location.pathname)) {
    return "notifications";
  }

  if (/^\/booking-history\/?$/.test(window.location.pathname)) {
    return "bookings";
  }

  if (/^\/account\/?$/.test(window.location.pathname)) {
    return "account";
  }

  return null;
}

function getRouteAuthMode() {
  return /^\/signup\/?$/.test(window.location.pathname) ? "signup" : "login";
}

function hasGoogleError() {
  return new URLSearchParams(window.location.search).get("googleError") === "1";
}

function App() {
  const [view, setView] = useState<View>(() => getStaticRouteView() ?? (getAdminSection() ? "admin" : isRouteHostCreate() ? "hostCreate" : getRouteHostEditId() ? "hostEdit" : getRouteHostListingId() ? "hostListing" : isRouteHostDashboard() ? "host" : getRouteHomestayId() ? "detail" : "home"));
  const [stays, setStays] = useState<Homestay[]>(homestays);
  const [selectedStay, setSelectedStay] = useState<Homestay | null>(getRouteHomestayId() ? null : homestays[0]);
  const [hostEditId, setHostEditId] = useState<Homestay["id"] | null>(() => getRouteHostEditId());
  const [hostListingId, setHostListingId] = useState<Homestay["id"] | null>(() => getRouteHostListingId());
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLanguage = localStorage.getItem("staynest_language");
    return storedLanguage === "vi" || storedLanguage === "en" ? storedLanguage : "en";
  });
  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem("staynest_language", nextLanguage);
  };
  const [bookingSearch, setBookingSearch] = useState<BookingSearch>({
    location: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
  });
  const [authMode, setAuthMode] = useState<"login" | "signup">(() => getRouteAuthMode());
  const [googleError, setGoogleError] = useState(() => hasGoogleError());
  const [protectedMessage, setProtectedMessage] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem("staynest_user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("staynest_token"));
  const [wishlistIds, setWishlistIds] = useState<Homestay["id"][]>([]);
  const [wishlistStays, setWishlistStays] = useState<Homestay[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [maxPrice, setMaxPrice] = useState(180);
  const [minRating, setMinRating] = useState(4.6);
  const [activeAmenities, setActiveAmenities] = useState<Amenity[]>(["Wi-Fi"]);
  const [adminSection, setAdminSection] = useState<AdminSection>(() => getAdminSection() ?? "dashboard");

  const filteredStays = useHomestayFilters(stays, bookingSearch.location, maxPrice, minRating, activeAmenities);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const hostEditStay = hostEditId ? stays.find((stay) => String(stay.id) === String(hostEditId)) : null;
  const hostListingStay = hostListingId ? stays.find((stay) => String(stay.id) === String(hostListingId)) : null;

  const loadHomestayDetail = async (id: Homestay["id"], availableStays = stays) => {
    const localStay = availableStays.find((stay) => String(stay.id) === String(id)) ?? homestays.find((stay) => String(stay.id) === String(id));

    try {
      const apiStay = await fetchHomestayById(id);
      setSelectedStay(apiStay);
      setView("detail");
    } catch {
      if (localStay) {
        setSelectedStay(localStay);
        setView("detail");
      } else {
        setView("home");
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const routeHomestayId = getRouteHomestayId();
    const routeHostEditId = getRouteHostEditId();
    const routeHostListingId = getRouteHostListingId();
    const routeHostCreate = isRouteHostCreate();
    const staticRouteView = getStaticRouteView();
    const routeAdminSection = getAdminSection();

    fetchHomestays()
      .then((apiStays) => {
        if (isMounted) {
          const initialStays = apiStays.length > 0 ? apiStays : homestays;
          setStays(initialStays);
          if (staticRouteView) {
            if (staticRouteView === "auth") {
              setAuthMode(getRouteAuthMode());
              setGoogleError(hasGoogleError());
            }
            setView(staticRouteView);
          } else if (routeAdminSection) {
            setAdminSection(routeAdminSection);
            setView("admin");
          } else if (routeHostCreate) {
            setView("hostCreate");
          } else if (routeHostEditId) {
            setHostEditId(routeHostEditId);
            setView("hostEdit");
          } else if (routeHostListingId) {
            setHostListingId(routeHostListingId);
            setView("hostListing");
          } else if (isRouteHostDashboard()) {
            setView("host");
          } else if (routeHomestayId) {
            void loadHomestayDetail(routeHomestayId, initialStays);
          } else {
            setSelectedStay(initialStays[0]);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setStays(homestays);
          if (staticRouteView) {
            if (staticRouteView === "auth") {
              setAuthMode(getRouteAuthMode());
              setGoogleError(hasGoogleError());
            }
            setView(staticRouteView);
          } else if (routeAdminSection) {
            setAdminSection(routeAdminSection);
            setView("admin");
          } else if (routeHostCreate) {
            setView("hostCreate");
          } else if (routeHostEditId) {
            setHostEditId(routeHostEditId);
            setView("hostEdit");
          } else if (routeHostListingId) {
            setHostListingId(routeHostListingId);
            setView("hostListing");
          } else if (isRouteHostDashboard()) {
            setView("host");
          } else if (routeHomestayId) {
            void loadHomestayDetail(routeHomestayId, homestays);
          } else {
            setSelectedStay(homestays[0]);
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const routeHomestayId = getRouteHomestayId();
      const routeHostEditId = getRouteHostEditId();
      const routeHostListingId = getRouteHostListingId();
      const staticRouteView = getStaticRouteView();
      const routeAdminSection = getAdminSection();
      if (staticRouteView) {
        if (staticRouteView === "auth") {
          setAuthMode(getRouteAuthMode());
          setGoogleError(hasGoogleError());
        }
        setView(staticRouteView);
      } else if (routeAdminSection) {
        setAdminSection(routeAdminSection);
        setView("admin");
      } else if (isRouteHostCreate()) {
        setHostEditId(null);
        setView("hostCreate");
      } else if (routeHostEditId) {
        setHostEditId(routeHostEditId);
        setView("hostEdit");
      } else if (routeHostListingId) {
        setHostListingId(routeHostListingId);
        setView("hostListing");
      } else if (isRouteHostDashboard()) {
        setHostEditId(null);
        setView("host");
      } else if (routeHomestayId) {
        void loadHomestayDetail(routeHomestayId);
      } else {
        setView("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  });

  useEffect(() => {
    scrollToHash();
  }, [view, selectedStay, hostListingId]);

  useEffect(() => {
    if (!token || user?.role !== "guest") {
      setWishlistIds([]);
      setWishlistStays([]);
      return;
    }

    fetchWishlist(token)
      .then((items) => {
        setWishlistStays(items);
        setWishlistIds(items.map((stay) => stay.id));
      })
      .catch(() => {
        setWishlistIds([]);
        setWishlistStays([]);
      });
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) {
      setNotifications([]);
      setVouchers([]);
      return;
    }

    fetchNotifications(token).then(setNotifications).catch(() => setNotifications([]));
    fetchVouchers(token).then(setVouchers).catch(() => setVouchers([]));
  }, [token, user]);

  const refreshAccountData = () => {
    if (!token || !user) {
      return;
    }

    fetchNotifications(token).then(setNotifications).catch(() => setNotifications([]));
    fetchVouchers(token).then(setVouchers).catch(() => setVouchers([]));
  };

  const openStay = (stay: Homestay) => {
    setSelectedStay(stay);
    setView("detail");
    window.history.pushState({}, "", getHomestayRoute(stay));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateHome = () => {
    setHostEditId(null);
    setHostListingId(null);
    setView("home");
    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateHost = () => {
    setHostEditId(null);
    setHostListingId(null);
    setView("host");
    window.history.pushState({}, "", "/host/dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateAdmin = (section: AdminSection = "dashboard") => {
    setAdminSection(section);
    setView("admin");
    window.history.pushState({}, "", `/admin/${section}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openHostEdit = (id: Homestay["id"]) => {
    setHostEditId(id);
    setHostListingId(null);
    setView("hostEdit");
    window.history.pushState({}, "", `/host/homestays/${id}/edit`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openHostCreate = () => {
    setHostEditId(null);
    setHostListingId(null);
    setView("hostCreate");
    window.history.pushState({}, "", "/host/homestays/new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openHostListing = (id: Homestay["id"]) => {
    setHostListingId(id);
    setHostEditId(null);
    setView("hostListing");
    window.history.pushState({}, "", `/host/homestays/${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const syncBookingHomestay = (booking: { homestay?: Homestay | string }) => {
    if (typeof booking.homestay !== "object" || !booking.homestay) {
      return;
    }

    const updatedStay = booking.homestay;
    setStays((current) => current.map((stay) => (String(stay.id) === String(updatedStay.id) || String(stay.id) === String(updatedStay._id) ? { ...stay, ...updatedStay, id: updatedStay._id ?? updatedStay.id } : stay)));
    setSelectedStay((current) => (current && (String(current.id) === String(updatedStay.id) || String(current.id) === String(updatedStay._id)) ? { ...current, ...updatedStay, id: updatedStay._id ?? updatedStay.id } : current));
  };

  const toggleAmenity = (amenity: Amenity) => {
    setActiveAmenities((current) =>
      current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity],
    );
  };

  const saveNewHomestay = async (stay: Homestay) => {
    let savedStay = stay;
    try {
      savedStay = await createHomestay(stay, token ?? undefined);
    } catch {
      savedStay = stay;
    }

    setStays((current) => [savedStay, ...current]);
  };

  const saveExistingHomestay = async (id: Homestay["id"], stay: Homestay) => {
    let savedStay = stay;
    try {
      savedStay = typeof id === "string" ? await updateHomestay(id, stay, token ?? undefined) : stay;
    } catch {
      savedStay = stay;
    }

    setStays((current) => current.map((item) => (String(item.id) === String(id) ? savedStay : item)));
    setSelectedStay((current) => (current && String(current.id) === String(id) ? savedStay : current));
  };

  const removeHomestay = async (id: Homestay["id"]) => {
    try {
      if (typeof id === "string") {
        await deleteHomestay(id, token ?? undefined);
      }
    } finally {
      setStays((current) => current.filter((stay) => stay.id !== id));
    }
  };

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setGoogleError(false);
    setView("auth");
    window.history.pushState({}, "", mode === "signup" ? "/signup" : "/login");
  };

  const openForgotPassword = () => {
    setView("forgotPassword");
    window.history.pushState({}, "", "/forgot-password");
  };

  const openResetPassword = (email = "") => {
    setResetEmail(email);
    setView("resetPassword");
    window.history.pushState({}, "", "/reset-password");
  };

  const handleAuthed = (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("staynest_user", JSON.stringify(nextUser));
    localStorage.setItem("staynest_token", nextToken);
    setGoogleError(false);
    setView("home");
    window.history.replaceState({}, "", "/");
  };

  const handleGoogleFailure = () => {
    setAuthMode("login");
    setGoogleError(true);
    setView("auth");
    window.history.replaceState({}, "", "/login?googleError=1");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setWishlistIds([]);
    setWishlistStays([]);
    setNotifications([]);
    setVouchers([]);
    localStorage.removeItem("staynest_user");
    localStorage.removeItem("staynest_token");
    setView("home");
  };

  const openNotifications = () => {
    if (!user) {
      requireLogin();
      return;
    }

    setView("notifications");
    window.history.pushState({}, "", "/notifications");
  };

  const openAccount = () => {
    if (!user) {
      requireLogin();
      return;
    }

    setView("account");
    window.history.pushState({}, "", "/account");
  };

  const saveAccount = async (payload: { name?: string; password?: string }) => {
    if (!token) {
      requireLogin();
      return;
    }

    const updated = await updateAccount(payload, token);
    setUser(updated.user);
    setToken(updated.token);
    localStorage.setItem("staynest_user", JSON.stringify(updated.user));
    localStorage.setItem("staynest_token", updated.token);
  };

  const readNotification = async (id: string) => {
    if (!token) {
      return;
    }

    const updated = await markNotificationRead(id, token);
    setNotifications((current) => current.map((notification) => (notification._id === id ? updated : notification)));
  };

  const scrollToHash = () => {
    const hash = window.location.hash;
    if (!hash) {
      return;
    }

    window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const openNotificationLink = async (notification: Notification) => {
    await readNotification(notification._id);

    if (!notification.link) {
      return;
    }

    window.history.pushState({}, "", notification.link);
    const staticRouteView = getStaticRouteView();
    const routeAdminSection = getAdminSection();
    const routeHostListingId = getRouteHostListingId();
    const routeHomestayId = getRouteHomestayId();

    if (staticRouteView) {
      setView(staticRouteView);
    } else if (routeAdminSection) {
      setAdminSection(routeAdminSection);
      setView("admin");
    } else if (routeHostListingId) {
      setHostListingId(routeHostListingId);
      setHostEditId(null);
      setView("hostListing");
    } else if (routeHomestayId) {
      await loadHomestayDetail(routeHomestayId);
    }

    scrollToHash();
  };

  const readAllNotifications = async () => {
    if (!token) {
      return;
    }

    const updated = await markAllNotificationsRead(token);
    setNotifications(updated);
  };

  const requireLogin = () => {
    setProtectedMessage("signInRequired");
    setView("protected");
  };

  const openHost = () => {
    if (!user) {
      requireLogin();
      return;
    }

    if (user.role !== "host") {
      setProtectedMessage("hostOnly");
      setView("protected");
      return;
    }

    navigateHost();
  };

  const openAdmin = () => {
    if (!user) {
      requireLogin();
      return;
    }

    if (user.role !== "admin") {
      setProtectedMessage("adminOnly");
      setView("protected");
      return;
    }

    navigateAdmin();
  };

  const toggleWishlist = async (id: Homestay["id"]) => {
    if (!token || user?.role !== "guest") {
      requireLogin();
      return;
    }

    try {
      const nextWishlist = wishlistIds.includes(id)
        ? await removeWishlistItem(id, token)
        : await saveWishlistItem(id, token);
      setWishlistStays(nextWishlist);
      setWishlistIds(nextWishlist.map((stay) => stay.id));
    } catch {
      setWishlistIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-ink">
      <Header
        language={language}
        setLanguage={setLanguage}
        onHome={navigateHome}
        onHost={openHost}
        onAdmin={openAdmin}
        onLogin={() => openAuth("login")}
        onSignup={() => openAuth("signup")}
        onBookings={() => (user ? setView("bookings") : requireLogin())}
        onWishlist={() => (user ? setView("wishlist") : requireLogin())}
        onNotifications={openNotifications}
        onAccount={openAccount}
        onLogout={logout}
        user={user}
        unreadCount={unreadCount}
      />

      <Suspense fallback={<main className="mx-auto max-w-7xl px-4 py-8 text-sm font-bold text-slate-600 sm:px-6 lg:px-8">Loading...</main>}>
      {view === "home" && (
        <HomePage
          language={language}
          bookingSearch={bookingSearch}
          setBookingSearch={setBookingSearch}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          minRating={minRating}
          setMinRating={setMinRating}
          activeAmenities={activeAmenities}
          toggleAmenity={toggleAmenity}
          stays={filteredStays}
          onSelect={openStay}
        />
      )}

      {view === "detail" && selectedStay && (
        <DetailPage
          language={language}
          stay={selectedStay}
          onBack={navigateHome}
          onHost={openHost}
          onManageHostListing={openHostListing}
          user={user}
          token={token}
          wishlistIds={wishlistIds}
          bookingSearch={bookingSearch}
          setBookingSearch={setBookingSearch}
          onRequireLogin={requireLogin}
          onToggleWishlist={toggleWishlist}
          vouchers={vouchers}
          onBookingCreated={refreshAccountData}
        />
      )}

      {view === "host" && user?.role === "host" && (
        <HostDashboard
          language={language}
          stays={stays}
          user={user}
          token={token}
          onBack={navigateHome}
          onCreateNew={openHostCreate}
          onManage={openHostListing}
          onEdit={openHostEdit}
          onCreate={saveNewHomestay}
          onUpdate={saveExistingHomestay}
          onDelete={removeHomestay}
        />
      )}

      {view === "admin" && user?.role === "admin" && token && (
        <AdminDashboard
          language={language}
          token={token}
          section={adminSection}
          onSectionChange={navigateAdmin}
          onBack={navigateHome}
        />
      )}

      {view === "admin" && (!user || user.role !== "admin") && (
        <ProtectedMessage
          language={language}
          message={user ? text[language].adminOnly : text[language].signInRequired}
          onBack={navigateHome}
          onLogin={() => openAuth("login")}
        />
      )}

      {view === "hostListing" && user?.role === "host" && hostListingStay && (
        <HostListingPage
          language={language}
          stay={hostListingStay}
          user={user}
          token={token}
          onBack={navigateHost}
          onEdit={openHostEdit}
          onStatusChange={syncBookingHomestay}
        />
      )}

      {view === "hostListing" && (!user || user.role !== "host") && (
        <ProtectedMessage
          language={language}
          message={user ? text[language].hostOnly : text[language].signInRequired}
          onBack={navigateHome}
          onLogin={() => openAuth("login")}
        />
      )}

      {view === "host" && (!user || user.role !== "host") && (
        <ProtectedMessage
          language={language}
          message={user ? text[language].hostOnly : text[language].signInRequired}
          onBack={navigateHome}
          onLogin={() => openAuth("login")}
        />
      )}

      {view === "hostCreate" && user?.role === "host" && (
        <HostEditPage
          language={language}
          user={user}
          token={token}
          mode="create"
          onBack={navigateHost}
          onCreate={saveNewHomestay}
        />
      )}

      {view === "hostEdit" && user?.role === "host" && hostEditStay && (
        <HostEditPage
          language={language}
          stay={hostEditStay}
          user={user}
          token={token}
          onBack={navigateHost}
          onSave={saveExistingHomestay}
        />
      )}

      {view === "hostEdit" && (!user || user.role !== "host") && (
        <ProtectedMessage
          language={language}
          message={user ? text[language].hostOnly : text[language].signInRequired}
          onBack={navigateHome}
          onLogin={() => openAuth("login")}
        />
      )}

      {view === "hostCreate" && (!user || user.role !== "host") && (
        <ProtectedMessage
          language={language}
          message={user ? text[language].hostOnly : text[language].signInRequired}
          onBack={navigateHome}
          onLogin={() => openAuth("login")}
        />
      )}

      {view === "auth" && (
        <AuthPage
          language={language}
          mode={authMode}
          googleError={googleError}
          onBack={navigateHome}
          onAuthed={handleAuthed}
          onForgotPassword={openForgotPassword}
        />
      )}

      {view === "forgotPassword" && (
        <ForgotPasswordPage
          language={language}
          onBack={navigateHome}
          onReset={openResetPassword}
        />
      )}

      {view === "resetPassword" && (
        <ResetPasswordPage
          language={language}
          initialEmail={resetEmail}
          onBack={navigateHome}
          onLogin={() => openAuth("login")}
        />
      )}

      {view === "googleSuccess" && (
        <GoogleOAuthSuccessPage
          language={language}
          onAuthed={handleAuthed}
          onFailure={handleGoogleFailure}
        />
      )}

      {view === "paymentSuccess" && (
        <PaymentSuccessPage language={language} token={token} onDone={navigateHome} />
      )}

      {view === "paymentCancel" && (
        <PaymentCancelPage language={language} onBack={navigateHome} />
      )}

      {view === "bookings" && <BookingsPage language={language} token={token} user={user} onBack={navigateHome} />}

      {view === "notifications" && user && (
        <NotificationsPage
          language={language}
          notifications={notifications}
          onBack={navigateHome}
          onMarkRead={readNotification}
          onMarkAllRead={readAllNotifications}
          onOpenNotification={openNotificationLink}
        />
      )}

      {view === "account" && user && (
        <AccountSettingsPage language={language} user={user} vouchers={vouchers} onBack={navigateHome} onSave={saveAccount} />
      )}

      {view === "wishlist" && (
        <WishlistPage language={language} stays={wishlistStays} onBack={navigateHome} onSelect={openStay} />
      )}

      {view === "protected" && (
        <ProtectedMessage
          language={language}
          message={protectedMessage === "hostOnly" ? text[language].hostOnly : protectedMessage === "adminOnly" ? text[language].adminOnly : text[language].signInRequired}
          onBack={navigateHome}
          onLogin={() => openAuth("login")}
        />
      )}
      </Suspense>
    </div>
  );
}

export default App;

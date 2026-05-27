import type { AdminStats, AdminUser, AuthUser, Booking, BookingStatus, Homestay, HomestayAvailability, Notification, PaymentMethod, PaymentStatus, Review, UserRole, Voucher } from "../types";

const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl) {
  throw new Error("Missing VITE_API_URL. Add it to your frontend .env file, for example VITE_API_URL=http://your-backend-host:5000/api");
}

const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "");
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

if (import.meta.env.DEV) {
  console.info(`[StayNest] API URL: ${API_BASE_URL}`);
  console.info(`[StayNest] Stripe publishable key configured: ${STRIPE_PUBLISHABLE_KEY ? "yes" : "no"}`);
}

type BackendHomestay = Omit<Homestay, "id"> & {
  _id?: string;
  id?: string | number;
};

type BookingPayload = {
  homestayId: Homestay["id"];
  homestayTitle: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalPriceUsd: number;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  clientBookingRequestId?: string;
  frontendOrigin?: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  email?: string;
  messageVi?: string;
  lockRemainingSeconds?: number;
  resendCooldownSeconds?: number;
  resendLockRemainingSeconds?: number;
  verificationLockRemainingSeconds?: number;
  resetLockRemainingSeconds?: number;
  attemptsRemaining?: number;
  demoCode?: string;

  constructor(message: string, status: number, body?: Record<string, unknown> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = typeof body?.code === "string" ? body.code : undefined;
    this.email = typeof body?.email === "string" ? body.email : undefined;
    this.messageVi = typeof body?.messageVi === "string" ? body.messageVi : undefined;
    this.lockRemainingSeconds = typeof body?.lockRemainingSeconds === "number" ? body.lockRemainingSeconds : undefined;
    this.resendCooldownSeconds = typeof body?.resendCooldownSeconds === "number" ? body.resendCooldownSeconds : undefined;
    this.resendLockRemainingSeconds = typeof body?.resendLockRemainingSeconds === "number" ? body.resendLockRemainingSeconds : undefined;
    this.verificationLockRemainingSeconds = typeof body?.verificationLockRemainingSeconds === "number" ? body.verificationLockRemainingSeconds : undefined;
    this.resetLockRemainingSeconds = typeof body?.resetLockRemainingSeconds === "number" ? body.resetLockRemainingSeconds : undefined;
    this.attemptsRemaining = typeof body?.attemptsRemaining === "number" ? body.attemptsRemaining : undefined;
    this.demoCode = typeof body?.demoCode === "string" ? body.demoCode : undefined;
  }
}

type SignupResponse = AuthResponse | {
  requiresVerification: true;
  email: string;
  message: string;
  resendCooldownSeconds?: number;
  demoCode?: string;
};

type VerificationResponse = AuthResponse;

type ResendVerificationResponse = {
  message: string;
  email?: string;
  resendCooldownSeconds?: number;
  resendLockRemainingSeconds?: number;
  demoCode?: string;
};

type AuthPayload = {
  name?: string;
  email: string;
  password: string;
  role?: UserRole;
};

type UploadedImage = {
  url: string;
  publicId: string;
};

function normalizeHomestay(stay: BackendHomestay): Homestay {
  return {
    ...stay,
    id: stay._id ?? stay.id ?? crypto.randomUUID(),
  };
}

async function request<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(errorBody?.message ?? `API request failed: ${response.status}`, response.status, errorBody);
  }

  return response.json();
}

async function uploadRequest<T>(path: string, body: FormData, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message ?? `Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchHomestays() {
  const stays = await request<BackendHomestay[]>("/homestays");
  return stays.map(normalizeHomestay);
}

export async function fetchHomestayById(id: Homestay["id"]) {
  const stay = await request<BackendHomestay>(`/homestays/${id}`);
  return normalizeHomestay(stay);
}

export async function fetchHomestayAvailability(id: Homestay["id"], checkIn: string, checkOut: string) {
  const params = new URLSearchParams({ checkIn, checkOut });
  return request<HomestayAvailability>(`/homestays/${id}/availability?${params}`);
}

export async function signup(payload: AuthPayload) {
  return request<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: AuthPayload) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyCode(payload: { email: string; code: string }) {
  return request<VerificationResponse>("/auth/verify-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendVerificationCode(email: string) {
  return request<ResendVerificationResponse>("/auth/resend-verification-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function forgotPassword(email: string) {
  return request<{ message: string; messageVi?: string; code?: string; demoCode?: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(payload: { email: string; code: string; password: string; confirmPassword: string }) {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMe(token: string) {
  return request<AuthUser>("/auth/me", undefined, token);
}

export function getGoogleAuthUrl() {
  return `${API_BASE_URL}/auth/google`;
}

export async function createHomestay(stay: Homestay, token?: string) {
  const created = await request<BackendHomestay>("/homestays", {
    method: "POST",
    body: JSON.stringify(stay),
  }, token);

  return normalizeHomestay(created);
}

export async function updateHomestay(id: Homestay["id"], stay: Homestay, token?: string) {
  const updated = await request<BackendHomestay>(`/homestays/${id}`, {
    method: "PUT",
    body: JSON.stringify(stay),
  }, token);

  return normalizeHomestay(updated);
}

export async function deleteHomestay(id: Homestay["id"], token?: string) {
  await request<{ message: string }>(`/homestays/${id}`, {
    method: "DELETE",
  }, token);
}

export async function createBooking(payload: BookingPayload, token?: string) {
  return request<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function createStripeCheckoutSession(payload: BookingPayload, token: string) {
  return request<{ sessionId: string; url: string }>("/payments/create-checkout-session", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function finalizeStripeCheckoutSession(sessionId: string, token: string) {
  return request<Booking>(`/payments/success?session_id=${encodeURIComponent(sessionId)}`, undefined, token);
}

export async function fetchBookings(token: string) {
  return request<Booking[]>("/bookings", undefined, token);
}

export async function updateBookingStatus(id: string, status: BookingStatus, token: string) {
  return request<Booking>(`/bookings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, token);
}

export async function fetchWishlist(token: string) {
  const stays = await request<BackendHomestay[]>("/wishlist", undefined, token);
  return stays.map(normalizeHomestay);
}

export async function saveWishlistItem(id: Homestay["id"], token: string) {
  const stays = await request<BackendHomestay[]>(`/wishlist/${id}`, { method: "POST" }, token);
  return stays.map(normalizeHomestay);
}

export async function removeWishlistItem(id: Homestay["id"], token: string) {
  const stays = await request<BackendHomestay[]>(`/wishlist/${id}`, { method: "DELETE" }, token);
  return stays.map(normalizeHomestay);
}

export async function fetchHomestayReviews(id: Homestay["id"]) {
  return request<Review[]>(`/reviews/homestays/${id}`);
}

export async function fetchHostReviews(token: string) {
  return request<Review[]>("/reviews/host", undefined, token);
}

export async function createReview(
  payload: { homestayId: Homestay["id"]; bookingId: string; rating: number; comment: string },
  token: string,
) {
  return request<Review>("/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function replyToReview(id: string, comment: string, token: string) {
  return request<Review>(`/reviews/${id}/reply`, {
    method: "PATCH",
    body: JSON.stringify({ comment }),
  }, token);
}

export async function fetchNotifications(token: string) {
  return request<Notification[]>("/notifications", undefined, token);
}

export async function markNotificationRead(id: string, token: string) {
  return request<Notification>(`/notifications/${id}/read`, { method: "PATCH" }, token);
}

export async function markAllNotificationsRead(token: string) {
  return request<Notification[]>("/notifications/read-all", { method: "PATCH" }, token);
}

export async function updateAccount(payload: { name?: string; password?: string }, token: string) {
  return request<{ token: string; user: AuthUser }>("/auth/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  }, token);
}

export async function fetchVouchers(token: string) {
  return request<Voucher[]>("/vouchers", undefined, token);
}

export async function uploadHomestayImages(files: File[], token: string) {
  const body = new FormData();
  files.forEach((file) => body.append("images", file));

  const response = await uploadRequest<{ images: UploadedImage[] }>("/upload/homestay-images", body, token);
  return response.images;
}

export async function deleteHomestayImages(urls: string[], token: string) {
  return request<{ deleted: Array<{ publicId: string; result: string }> }>("/upload/homestay-images", {
    method: "DELETE",
    body: JSON.stringify({ urls }),
  }, token);
}

export async function fetchAdminStats(token: string) {
  const stats = await request<Omit<AdminStats, "lowRatedListings"> & { lowRatedListings: BackendHomestay[] }>("/admin/dashboard", undefined, token);
  return {
    ...stats,
    lowRatedListings: stats.lowRatedListings.map(normalizeHomestay),
  };
}

export async function fetchAdminUsers(token: string, filters: { search?: string; role?: UserRole | "all" } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.role && filters.role !== "all") params.set("role", filters.role);
  return request<AdminUser[]>(`/admin/users${params.toString() ? `?${params}` : ""}`, undefined, token);
}

export async function updateAdminUser(id: string, payload: { role?: UserRole; isDisabled?: boolean }, token: string) {
  return request<AdminUser>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function fetchAdminHomestays(token: string, filters: { host?: string; location?: string; status?: "all" | "visible" | "hidden" } = {}) {
  const params = new URLSearchParams();
  if (filters.host) params.set("host", filters.host);
  if (filters.location) params.set("location", filters.location);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  const stays = await request<BackendHomestay[]>(`/admin/homestays${params.toString() ? `?${params}` : ""}`, undefined, token);
  return stays.map(normalizeHomestay);
}

export async function updateAdminHomestay(id: Homestay["id"], payload: { isHidden?: boolean }, token: string) {
  const stay = await request<BackendHomestay>(`/admin/homestays/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
  return normalizeHomestay(stay);
}

export async function deleteAdminHomestay(id: Homestay["id"], token: string) {
  return request<{ message: string }>(`/admin/homestays/${id}`, { method: "DELETE" }, token);
}

export async function fetchAdminBookings(token: string, filters: { status?: BookingStatus | "all"; paymentStatus?: PaymentStatus | "all" } = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.paymentStatus && filters.paymentStatus !== "all") params.set("paymentStatus", filters.paymentStatus);
  return request<Booking[]>(`/admin/bookings${params.toString() ? `?${params}` : ""}`, undefined, token);
}

export async function fetchAdminPayments(token: string, paymentStatus: PaymentStatus | "all" = "all") {
  const params = new URLSearchParams();
  if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
  return request<Booking[]>(`/admin/payments${params.toString() ? `?${params}` : ""}`, undefined, token);
}

export async function fetchAdminReviews(token: string) {
  return request<Review[]>("/admin/reviews", undefined, token);
}

export async function updateAdminReview(id: string, payload: { isHidden?: boolean }, token: string) {
  return request<Review>(`/admin/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

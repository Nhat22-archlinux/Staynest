export type Amenity = "Wi-Fi" | "Pool" | "Kitchen" | "Parking" | "Pet friendly" | "Workspace";

export type DiscountType = "none" | "manual" | "scheduled";

export type DiscountSchedule = {
  id?: string;
  startAt: string;
  endAt: string;
  percent: number;
};

export type DiscountRange = DiscountSchedule;

export type DiscountSettings = {
  type: DiscountType;
  percent: number;
  isActive: boolean;
  schedules: DiscountSchedule[];
  ranges?: DiscountSchedule[];
};

export type Homestay = {
  _id?: string;
  id: string | number;
  owner?: string;
  title: string;
  location: string;
  area: string;
  price: number;
  rating: number;
  reviews: number;
  guests: number;
  beds: number;
  baths: number;
  totalRooms?: number;
  availableRooms?: number;
  image: string;
  gallery: string[];
  amenities: Amenity[];
  host: string;
  type: "Rent" | "Sale";
  description: string;
  discount?: DiscountSettings;
  isHidden?: boolean;
};

export type Language = "en" | "vi";

export type View = "home" | "detail" | "host" | "hostCreate" | "hostEdit" | "hostListing" | "admin" | "auth" | "forgotPassword" | "resetPassword" | "googleSuccess" | "paymentSuccess" | "paymentCancel" | "bookings" | "wishlist" | "notifications" | "account" | "protected";

export type UserRole = "guest" | "host" | "admin";

export type BookingStatus = "pending" | "confirmed" | "rejected" | "completed" | "cancelled" | "expired";
export type PaymentMethod = "pay_at_property" | "card";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authProvider?: "local" | "google";
  emailVerified?: boolean;
  isDisabled?: boolean;
};

export type Booking = {
  id?: string;
  _id?: string;
  homestayTitle: string;
  guestName?: string;
  bookingCode?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalPriceUsd: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  voucherCode?: string;
  voucherPercent?: number;
  discountAmount?: number;
  finalTotal?: number;
  status?: BookingStatus;
  homestay?: Homestay | string;
  user?: AuthUser | string;
  host?: AuthUser | string;
  reviewed?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Review = {
  id?: string;
  _id?: string;
  homestay: Homestay | string;
  booking: string;
  user: string;
  userName: string;
  rating: number;
  comment: string;
  hostReply?: {
    comment: string;
    createdAt?: string;
  };
  isHidden?: boolean;
  createdAt: string;
};

export type Notification = {
  _id: string;
  type: string;
  message: string;
  messageEn?: string;
  messageVi?: string;
  read: boolean;
  link?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  homestay?: string;
  booking?: string;
  review?: string;
  createdAt: string;
};

export type Voucher = {
  _id: string;
  code: string;
  percent: number;
  owner: string;
  booking?: string;
  usedForBooking?: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt?: string;
};

export type AdminUser = AuthUser & {
  _id: string;
  createdAt?: string;
};

export type AdminStats = {
  totalUsers: number;
  totalHosts: number;
  totalHomestays: number;
  totalBookings: number;
  monthlyPlatformRevenue: number;
  pendingBookings: number;
  lowRatedListings: Homestay[];
};

export type BookingSearch = {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export type HomestayAvailability = {
  homestayId: string;
  totalRooms: number;
  availableRooms: number;
  availableForDateRange: number;
  overlappingBookingsCount: number;
  isValidDateRange: boolean;
};

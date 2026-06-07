import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import bookingRoutes from "./routes/bookingRoutes.js";
import homestayRoutes from "./routes/homestayRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import voucherRoutes from "./routes/voucherRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import { passport } from "./config/passport.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

const defaultAllowedOrigins = [
  "https://staynest.nniisworking1606.id.vn",
  "http://192.168.0.110:4173",
  "http://localhost:4173",
  "http://localhost:5173",
];

const configuredOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
const allowedOrigins = [...new Set([
  ...defaultAllowedOrigins,
  process.env.FRONTEND_URL,
  ...configuredOrigins,
].filter(Boolean))];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "staynest-dev-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/homestays", homestayRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

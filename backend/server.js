import dotenv from "dotenv";
import app from "./app.js";
import { configureCloudinary } from "./config/cloudinary.js";
import { connectDB } from "./config/db.js";
import { verifyEmailTransporter } from "./utils/emailVerification.js";
import { getFrontendUrl } from "./utils/env.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  configureCloudinary();
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`[StayNest] NODE_ENV: ${process.env.NODE_ENV || "development"}`);
    console.log(`[StayNest] FRONTEND_URL: ${getFrontendUrl()}`);
  });

  verifyEmailTransporter().catch((error) => {
    console.error(`[StayNest] SMTP transporter verification failed: ${error.message}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend server:", error.message);
  process.exit(1);
});

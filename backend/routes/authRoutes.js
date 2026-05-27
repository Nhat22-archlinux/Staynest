import express from "express";
import { forgotPassword, getMe, login, resendVerificationCode, resetPassword, signup, updateMe, verifyCode } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { passport, isGoogleOAuthConfigured } from "../config/passport.js";
import { generateToken } from "../utils/generateToken.js";
import { getFrontendUrl } from "../utils/env.js";

const router = express.Router();

function redirectGoogleError(res) {
  res.redirect(`${getFrontendUrl()}/login?googleError=1`);
}

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-code", verifyCode);
router.post("/resend-verification-code", resendVerificationCode);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.get("/google", (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[StayNest] Google OAuth login attempted without OAuth environment variables.");
    }
    redirectGoogleError(res);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[StayNest] Starting Google OAuth login.");
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: true,
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    redirectGoogleError(res);
    return;
  }

  passport.authenticate("google", { failureRedirect: `${getFrontendUrl()}/login?googleError=1` }, (error, user) => {
    if (error || !user) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[StayNest] Google OAuth failed.", error);
      }
      redirectGoogleError(res);
      return;
    }

    req.logIn(user, { session: false }, (loginError) => {
      if (loginError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[StayNest] Google OAuth session login failed.", loginError);
        }
        redirectGoogleError(res);
        return;
      }

      const token = generateToken(user);
      if (process.env.NODE_ENV !== "production") {
        console.info(`[StayNest] Google OAuth succeeded for ${user.email}.`);
      }
      res.redirect(`${getFrontendUrl()}/auth/google/success?token=${encodeURIComponent(token)}`);
    });
  })(req, res, next);
});

export default router;

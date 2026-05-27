import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { fileURLToPath } from "url";
import { User } from "../models/User.js";
import { createWelcomeBenefits } from "../utils/welcomeBenefits.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
dotenv.config();

const isGoogleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL,
);

if (isGoogleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();

          if (!email) {
            return done(new Error("Google account email is required"));
          }

          let user = await User.findOne({ email });

          if (user) {
            if (user.isDisabled) {
              return done(new Error("Account is disabled"));
            }

            user.googleId = user.googleId ?? profile.id;
            user.emailVerified = true;
            await user.save();
            return done(null, user);
          }

          user = await User.create({
            name: profile.displayName || email.split("@")[0],
            email,
            googleId: profile.id,
            authProvider: "google",
            emailVerified: true,
            role: "guest",
          });

          await createWelcomeBenefits(user._id);

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
} else if (process.env.NODE_ENV !== "production") {
  console.warn("[StayNest] Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.");
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export { passport, isGoogleOAuthConfigured };

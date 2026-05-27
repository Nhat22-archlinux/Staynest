import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { createWelcomeBenefits } from "../utils/welcomeBenefits.js";
import { sendPasswordResetCode, sendVerificationCode } from "../utils/emailVerification.js";

const LOCK_DURATIONS_SECONDS = [15, 60, 180, 300];
const INITIAL_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_SECONDS = 300;
const RESET_MAX_ATTEMPTS = 5;
const RESET_LOCK_SECONDS = 300;

function sendAuthResponse(res, user, statusCode = 200) {
  res.status(statusCode).json({
    token: generateToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      emailVerified: user.emailVerified,
      isDisabled: user.isDisabled,
    },
  });
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function genericResetResponse(res, delivery) {
  res.json({
    message: "If an account exists for this email, a password reset code has been sent.",
    ...demoCodePayload(delivery),
  });
}

function demoCodePayload(delivery) {
  return process.env.NODE_ENV !== "production" && delivery?.fallbackCode ? { demoCode: delivery.fallbackCode } : {};
}

async function setVerificationCode(user) {
  const code = generateVerificationCode();
  user.verificationCodeHash = await bcrypt.hash(code, 10);
  user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.verificationAttemptCount = 0;
  user.verificationLockedUntil = undefined;
  await user.save();
  const delivery = await sendVerificationCode({ email: user.email, code });

  return { code, delivery };
}

function remainingSecondsUntil(date) {
  return Math.max(Math.ceil((date.getTime() - Date.now()) / 1000), 0);
}

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role = "guest" } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  if (!["guest", "host"].includes(role)) {
    res.status(400);
    throw new Error("Invalid role");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    authProvider: "local",
    emailVerified: false,
  });
  const verification = await setVerificationCode(user);

  res.status(201).json({
    requiresVerification: true,
    email: user.email,
    message: "Verification code sent",
    resendCooldownSeconds: INITIAL_RESEND_COOLDOWN_SECONDS,
    ...demoCodePayload(verification.delivery),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (user.authProvider === "local" && user.loginLockUntil && user.loginLockUntil > new Date()) {
    res.status(423).json({
      message: "Login temporarily locked. Please try again later.",
      lockRemainingSeconds: Math.ceil((user.loginLockUntil.getTime() - Date.now()) / 1000),
    });
    return;
  }

  if (user.isDisabled) {
    res.status(403);
    throw new Error("Account is disabled");
  }

  if (!(await user.matchPassword(password))) {
    user.failedLoginAttempts = Number(user.failedLoginAttempts ?? 0) + 1;

    if (user.failedLoginAttempts >= 3) {
      const lockLevel = Number(user.loginLockLevel ?? 0);
      const duration = LOCK_DURATIONS_SECONDS[Math.min(lockLevel, LOCK_DURATIONS_SECONDS.length - 1)];
      user.loginLockUntil = new Date(Date.now() + duration * 1000);
      user.loginLockLevel = lockLevel + 1;
      user.failedLoginAttempts = 0;
      await user.save();

      res.status(423).json({
        message: "Login temporarily locked. Please try again later.",
        lockRemainingSeconds: duration,
      });
      return;
    }

    await user.save();
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (user.authProvider === "local" && !user.emailVerified) {
    res.status(403).json({
      message: "Please verify your email before logging in.",
      messageVi: "Vui lòng xác minh email trước khi đăng nhập.",
      code: "EMAIL_UNVERIFIED",
      email: user.email,
    });
    return;
  }

  user.failedLoginAttempts = 0;
  user.loginLockUntil = undefined;
  user.loginLockLevel = 0;
  await user.save();
  sendAuthResponse(res, user);
});

export const verifyCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    res.status(400);
    throw new Error("Email and verification code are required");
  }

  const user = await User.findOne({ email }).select("+verificationCodeHash");
  if (!user || user.authProvider === "google") {
    res.status(400);
    throw new Error("Invalid verification request");
  }

  if (user.emailVerified) {
    sendAuthResponse(res, user);
    return;
  }

  if (user.verificationLockedUntil && user.verificationLockedUntil > new Date()) {
    res.status(429).json({
      message: "Too many incorrect codes. Please try again later.",
      messageVi: "Bạn đã nhập sai mã quá nhiều lần. Vui lòng thử lại sau.",
      verificationLockRemainingSeconds: remainingSecondsUntil(user.verificationLockedUntil),
    });
    return;
  }

  if (!user.verificationCodeHash || !user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
    res.status(400);
    throw new Error("Verification code has expired");
  }

  const codeMatches = await bcrypt.compare(String(code), user.verificationCodeHash);
  if (!codeMatches) {
    user.verificationAttemptCount = Number(user.verificationAttemptCount ?? 0) + 1;

    if (user.verificationAttemptCount >= OTP_MAX_ATTEMPTS) {
      user.verificationLockedUntil = new Date(Date.now() + OTP_LOCK_SECONDS * 1000);
      user.verificationAttemptCount = 0;
      await user.save();
      res.status(429).json({
        message: "Too many incorrect codes. Please try again later.",
        messageVi: "Bạn đã nhập sai mã quá nhiều lần. Vui lòng thử lại sau.",
        verificationLockRemainingSeconds: OTP_LOCK_SECONDS,
      });
      return;
    }

    await user.save();
    res.status(400).json({
      message: "Invalid verification code",
      attemptsRemaining: OTP_MAX_ATTEMPTS - user.verificationAttemptCount,
    });
    return;
  }

  user.emailVerified = true;
  user.verificationCodeHash = undefined;
  user.verificationCodeExpires = undefined;
  user.verificationAttemptCount = 0;
  user.verificationLockedUntil = undefined;
  user.verificationResendCount = 0;
  user.verificationResendLockedUntil = undefined;
  await user.save();
  await createWelcomeBenefits(user._id);

  sendAuthResponse(res, user);
});

export const resendVerificationCode = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email }).select("+verificationCodeHash");
  if (!user || user.authProvider === "google" || user.emailVerified) {
    res.json({ message: "If the account needs verification, a new code has been sent." });
    return;
  }

  if (user.verificationResendLockedUntil && user.verificationResendLockedUntil > new Date()) {
    res.status(429).json({
      message: "Verification resend is temporarily locked. Please try again later.",
      messageVi: "Tạm thời không thể gửi lại mã. Vui lòng thử lại sau.",
      resendLockRemainingSeconds: remainingSecondsUntil(user.verificationResendLockedUntil),
    });
    return;
  }

  const nextResendCount = Number(user.verificationResendCount ?? 0) + 1;
  user.verificationResendCount = nextResendCount;

  let resendCooldownSeconds = INITIAL_RESEND_COOLDOWN_SECONDS;
  let resendLockRemainingSeconds = 0;

  if (nextResendCount === 3) {
    resendLockRemainingSeconds = 5 * 60;
    user.verificationResendLockedUntil = new Date(Date.now() + resendLockRemainingSeconds * 1000);
  } else if (nextResendCount >= 4) {
    resendLockRemainingSeconds = 15 * 60;
    user.verificationResendLockedUntil = new Date(Date.now() + resendLockRemainingSeconds * 1000);
  } else {
    user.verificationResendLockedUntil = undefined;
  }

  const verification = await setVerificationCode(user);
  res.json({
    message: "Verification code sent",
    email: user.email,
    resendCooldownSeconds,
    resendLockRemainingSeconds,
    ...demoCodePayload(verification.delivery),
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email }).select("+password +resetPasswordCodeHash");
  if (!user) {
    genericResetResponse(res);
    return;
  }

  if (user.authProvider === "google" && !user.password) {
    res.json({
      message: "This account uses Google login. Please continue with Google.",
      messageVi: "Tài khoản này sử dụng đăng nhập Google. Vui lòng tiếp tục với Google.",
      code: "GOOGLE_ACCOUNT",
    });
    return;
  }

  const code = generateVerificationCode();
  user.resetPasswordCodeHash = await bcrypt.hash(code, 10);
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.resetPasswordAttemptCount = 0;
  user.resetPasswordLockedUntil = undefined;
  await user.save();

  const delivery = await sendPasswordResetCode({ email: user.email, code });
  genericResetResponse(res, delivery);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password, confirmPassword } = req.body;

  if (!email || !code || !password || !confirmPassword) {
    res.status(400);
    throw new Error("Email, reset code, new password, and confirmation are required");
  }

  if (password !== confirmPassword) {
    res.status(400);
    throw new Error("New password and confirmation must match");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const user = await User.findOne({ email }).select("+password +resetPasswordCodeHash");
  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset code");
  }

  if (user.authProvider === "google" && !user.password) {
    res.status(400).json({
      message: "This account uses Google login. Please continue with Google.",
      messageVi: "Tài khoản này sử dụng đăng nhập Google. Vui lòng tiếp tục với Google.",
      code: "GOOGLE_ACCOUNT",
    });
    return;
  }

  if (user.resetPasswordLockedUntil && user.resetPasswordLockedUntil > new Date()) {
    res.status(429).json({
      message: "Too many incorrect reset attempts. Please try again later.",
      messageVi: "Bạn đã nhập sai mã đặt lại quá nhiều lần. Vui lòng thử lại sau.",
      resetLockRemainingSeconds: remainingSecondsUntil(user.resetPasswordLockedUntil),
    });
    return;
  }

  if (!user.resetPasswordCodeHash || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
    res.status(400);
    throw new Error("Invalid or expired reset code");
  }

  const codeMatches = await bcrypt.compare(String(code), user.resetPasswordCodeHash);
  if (!codeMatches) {
    user.resetPasswordAttemptCount = Number(user.resetPasswordAttemptCount ?? 0) + 1;

    if (user.resetPasswordAttemptCount >= RESET_MAX_ATTEMPTS) {
      user.resetPasswordLockedUntil = new Date(Date.now() + RESET_LOCK_SECONDS * 1000);
      user.resetPasswordAttemptCount = 0;
      await user.save();
      res.status(429).json({
        message: "Too many incorrect reset attempts. Please try again later.",
        messageVi: "Bạn đã nhập sai mã đặt lại quá nhiều lần. Vui lòng thử lại sau.",
        resetLockRemainingSeconds: RESET_LOCK_SECONDS,
      });
      return;
    }

    await user.save();
    res.status(400).json({
      message: "Invalid or expired reset code",
      attemptsRemaining: RESET_MAX_ATTEMPTS - user.resetPasswordAttemptCount,
    });
    return;
  }

  user.password = password;
  user.authProvider = user.authProvider ?? "local";
  user.emailVerified = true;
  user.resetPasswordCodeHash = undefined;
  user.resetPasswordExpires = undefined;
  user.resetPasswordAttemptCount = 0;
  user.resetPasswordLockedUntil = undefined;
  user.failedLoginAttempts = 0;
  user.loginLockUntil = undefined;
  user.loginLockLevel = 0;
  await user.save();

  res.json({ message: "Password reset successful" });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    authProvider: req.user.authProvider,
    emailVerified: req.user.emailVerified,
    isDisabled: req.user.isDisabled,
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (name?.trim()) {
    user.name = name.trim();
  }

  if (password) {
    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }
    user.password = password;
    user.authProvider = user.authProvider ?? "local";
  }

  await user.save();
  sendAuthResponse(res, user);
});

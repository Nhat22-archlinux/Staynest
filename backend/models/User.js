import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function requirePassword() {
        return this.authProvider !== "google";
      },
      minlength: 6,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationCodeHash: {
      type: String,
      select: false,
    },
    verificationCodeExpires: {
      type: Date,
    },
    verificationResendCount: {
      type: Number,
      default: 0,
    },
    verificationResendLockedUntil: {
      type: Date,
    },
    verificationAttemptCount: {
      type: Number,
      default: 0,
    },
    verificationLockedUntil: {
      type: Date,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["guest", "host", "admin"],
      default: "guest",
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    loginLockUntil: {
      type: Date,
    },
    loginLockLevel: {
      type: Number,
      default: 0,
    },
    resetPasswordCodeHash: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
    },
    resetPasswordAttemptCount: {
      type: Number,
      default: 0,
    },
    resetPasswordLockedUntil: {
      type: Date,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    next();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model("User", userSchema);

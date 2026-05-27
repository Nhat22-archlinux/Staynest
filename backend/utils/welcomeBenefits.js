import { Notification } from "../models/Notification.js";
import { Voucher } from "../models/Voucher.js";

function buildWelcomeVoucherCode() {
  return `WELCOME5-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createWelcomeBenefits(userId) {
  let voucher = await Voucher.findOne({ owner: userId, code: /^WELCOME5-/ });

  if (!voucher) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    voucher = await Voucher.create({
      code: buildWelcomeVoucherCode(),
      percent: 5,
      owner: userId,
      expiresAt,
      isUsed: false,
    });
  }

  const welcomeNotification = await Notification.findOne({ user: userId, type: "welcome" });
  if (!welcomeNotification) {
    await Notification.create({
      user: userId,
      type: "welcome",
      message: "Welcome to StayNest! Start exploring homestays for your next trip.",
      messageEn: "Welcome to StayNest! Start exploring homestays for your next trip.",
      messageVi: "Chào mừng bạn đến với StayNest! Hãy bắt đầu khám phá homestay cho chuyến đi tiếp theo.",
    });
  }

  const voucherNotification = await Notification.findOne({ user: userId, type: "welcome_voucher" });
  if (!voucherNotification) {
    await Notification.create({
      user: userId,
      type: "welcome_voucher",
      message: "You received a 5% welcome voucher.",
      messageEn: "You received a 5% welcome voucher.",
      messageVi: "Bạn đã nhận được voucher chào mừng giảm 5%.",
    });
  }

  return voucher;
}

import { Voucher } from "../models/Voucher.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

function buildVoucherCode(prefix = "STAY5") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createDemoVoucher({ user, booking, prefix = "STAY5" }) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  return Voucher.create({
    code: buildVoucherCode(prefix),
    percent: 5,
    owner: user,
    booking,
    expiresAt,
    isUsed: false,
  });
}

export async function awardCompletedStayVoucher({ user, booking }) {
  return createDemoVoucher({ user, booking, prefix: "STAY5" });
}

export async function awardWelcomeVoucher({ user }) {
  return createDemoVoucher({ user, prefix: "WELCOME5" });
}

export const getMyVouchers = asyncHandler(async (req, res) => {
  const vouchers = await Voucher.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json(vouchers);
});

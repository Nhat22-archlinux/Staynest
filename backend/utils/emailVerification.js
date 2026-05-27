import nodemailer from "nodemailer";

let transporter;

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  };
}

function isSmtpConfigured() {
  const config = getSmtpConfig();
  return Boolean(config.host && config.port && config.auth.user && config.auth.pass && config.from);
}

function getTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!transporter) {
    const config = getSmtpConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  return transporter;
}

function buildVerificationEmail({ code }) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f7f4ef;font-family:Arial,Helvetica,sans-serif;color:#17202a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#0f4c5c;color:#ffffff;padding:24px 28px;">
                    <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;">StayNest</div>
                    <div style="font-size:13px;opacity:0.85;margin-top:4px;">Secure account verification</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#17202a;">Verify your email</h1>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#52606d;">
                      Use this 6-digit verification code to finish creating your StayNest account.
                    </p>
                    <div style="margin:24px 0;padding:18px 22px;border-radius:10px;background:#f7f4ef;text-align:center;font-size:32px;font-weight:800;letter-spacing:0.24em;color:#0f4c5c;">
                      ${code}
                    </div>
                    <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#52606d;">
                      This code expires in 10 minutes.
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#b6402a;font-weight:700;">
                      If you did not request this code, you can ignore this email. Do not share this code with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildPasswordResetEmail({ code }) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f7f4ef;font-family:Arial,Helvetica,sans-serif;color:#17202a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#0f4c5c;color:#ffffff;padding:24px 28px;">
                    <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;">StayNest</div>
                    <div style="font-size:13px;opacity:0.85;margin-top:4px;">Password reset</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#17202a;">Reset your password</h1>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#52606d;">
                      Use this 6-digit code to reset your StayNest password.
                    </p>
                    <div style="margin:24px 0;padding:18px 22px;border-radius:10px;background:#f7f4ef;text-align:center;font-size:32px;font-weight:800;letter-spacing:0.24em;color:#0f4c5c;">
                      ${code}
                    </div>
                    <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#52606d;">
                      This code expires in 10 minutes.
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#b6402a;font-weight:700;">
                      If you did not request a password reset, ignore this email and keep your password unchanged.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function verifyEmailTransporter() {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.warn("[StayNest] SMTP email is not configured. OTP emails will use development fallback only outside production.");
    return false;
  }

  try {
    await activeTransporter.verify();
    console.log("[StayNest] SMTP transporter verified.");
    return true;
  } catch (error) {
    console.error(`[StayNest] SMTP transporter verification failed: ${error.message}`);
    return false;
  }
}

export async function sendVerificationCode({ email, code }) {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[StayNest] SMTP not configured. Development OTP for ${email}: ${code}`);
      return { delivered: false, fallbackCode: code, error: "SMTP not configured" };
    }

    return { delivered: false, error: "SMTP not configured" };
  }

  try {
    const config = getSmtpConfig();
    await activeTransporter.sendMail({
      from: config.from,
      to: email,
      subject: "StayNest verification code",
      html: buildVerificationEmail({ code }),
      text: `Your StayNest verification code is ${code}. This code expires in 10 minutes. If you did not request this code, ignore this email.`,
    });

    return { delivered: true };
  } catch (error) {
    console.error(`[StayNest] Failed to send verification email to ${email}: ${error.message}`);

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[StayNest] Development OTP fallback for ${email}: ${code}`);
      return { delivered: false, fallbackCode: code, error: error.message };
    }

    return { delivered: false, error: error.message };
  }
}

export async function sendPasswordResetCode({ email, code }) {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[StayNest] SMTP not configured. Development password reset OTP for ${email}: ${code}`);
      return { delivered: false, fallbackCode: code, error: "SMTP not configured" };
    }

    return { delivered: false, error: "SMTP not configured" };
  }

  try {
    const config = getSmtpConfig();
    await activeTransporter.sendMail({
      from: config.from,
      to: email,
      subject: "StayNest password reset code",
      html: buildPasswordResetEmail({ code }),
      text: `Your StayNest password reset code is ${code}. This code expires in 10 minutes. If you did not request this, ignore this email.`,
    });

    return { delivered: true };
  } catch (error) {
    console.error(`[StayNest] Failed to send password reset email to ${email}: ${error.message}`);

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[StayNest] Development password reset OTP fallback for ${email}: ${code}`);
      return { delivered: false, fallbackCode: code, error: error.message };
    }

    return { delivered: false, error: error.message };
  }
}

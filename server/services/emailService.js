const nodemailer = require('nodemailer');

const createTransporter = () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    if (emailUser && emailPass && emailUser !== 'your-email@gmail.com') {
        return { transporter: nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } }), fromAddr: emailUser, real: true };
    }
    return null;
};

exports.sendResetCode = async (toEmail, code, username) => {
    const t = createTransporter();
    if (!t) return { error: 'Email service not configured.' };

    try {
        await t.transporter.sendMail({
            from: `"PPE Monitoring" <${t.fromAddr}>`,
            to: toEmail,
            subject: 'Your Password Reset Code - PPE Monitoring',
            text: `Hi ${username}, your reset code is: ${code}\n\nThis code expires in 15 minutes.`,
            html: `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:12px;font-weight:800;color:#16a34a;letter-spacing:3px;text-transform:uppercase;">PPE Monitoring System</span>
  </div>
  <h2 style="text-align:center;color:#111827;font-size:22px;margin:0 0 8px;">Password Reset Code</h2>
  <p style="text-align:center;color:#6b7280;font-size:14px;margin:0 0 28px;">
    Hi <strong style="color:#111827;">${username}</strong>, here is your one-time reset code:
  </p>
  <div style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:28px 20px;text-align:center;margin-bottom:28px;">
    <span style="font-size:48px;font-weight:900;letter-spacing:14px;color:#16a34a;font-family:monospace;">${code}</span>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:13px;margin:0;">
    This code expires in <strong>15 minutes</strong>.<br/>
    Do not share this code with anyone. If you did not request a reset, ignore this email.
  </p>
</div>`
        });
        console.log('[EMAIL] Reset code sent to:', toEmail, '| Code:', code);
        return { ok: true };
    } catch (err) {
        console.error('[EMAIL] sendResetCode failed:', err.code, err.message);
        if (err.code === 'EAUTH' || err.responseCode === 535) return { error: 'Email authentication failed. Check Gmail App Password.' };
        return { error: 'Failed to send email. Please try again.' };
    }
};

exports.sendResetEmail = async (email, resetLink) => {
    const t = createTransporter();
    if (!t) return { error: 'Email service not configured.' };
    try {
        await t.transporter.sendMail({
            from: `"PPE Monitoring" <${t.fromAddr}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `<a href="${resetLink}">Reset Password</a><p>Expires in 15 minutes.</p>`
        });
        return { ok: true };
    } catch (err) {
        return { error: err.message };
    }
};

import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

export class MailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  /**
   * Initializes Nodemailer transporter with Brevo SMTP configuration
   */
  initTransporter() {
    const smtp = config.smtp;
    if (!smtp.user || !smtp.pass) {
      // In dev without credentials, transporter remains null or mocked
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure, // false for 587 STARTTLS
      auth: {
        user: smtp.user,
        pass: smtp.pass
      },
      tls: {
        rejectUnauthorized: true
      }
    });
  }

  /**
   * Verifies SMTP connection health
   * @returns {Promise<{ ok: boolean, message: string }>}
   */
  async verifyConnection() {
    if (!this.transporter) {
      return {
        ok: false,
        message: 'SMTP transporter is not configured. Missing SMTP_USER or SMTP_PASS.'
      };
    }

    try {
      await this.transporter.verify();
      return {
        ok: true,
        message: 'Brevo SMTP connection verified successfully.'
      };
    } catch (err) {
      return {
        ok: false,
        message: err.message || 'SMTP connection verification failed.'
      };
    }
  }

  /**
   * Sends an OTP email to the user
   * @param {Object} options
   * @param {string} options.to Recipient email address
   * @param {string} options.otp 5-digit numeric OTP code
   * @param {string} [options.name] Recipient name
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendOtpEmail({ to, otp, name }) {
    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      const err = new Error('Email service is not currently configured.');
      err.statusCode = 503;
      throw err;
    }

    const greeting = name && name.trim() ? `Hello ${name.trim()},` : 'Hello,';
    const fromAddress = `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code - INVITE STUDIO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f3eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #34232b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f3eb; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #fffdfc; border: 1px solid #e9ded1; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(64, 21, 38, 0.06);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #401526; padding: 32px 28px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="width: 44px; height: 44px; background-color: #5c2032; border: 1px solid #d8b66e; border-radius: 50%; line-height: 44px; text-align: center; color: #d8b66e; font-size: 20px; font-weight: bold; font-family: Georgia, serif; margin: 0 auto 12px auto;">
                      I
                    </div>
                    <div style="font-size: 14px; letter-spacing: 0.3em; color: #fffdfc; font-weight: 600; text-transform: uppercase;">
                      INVITE STUDIO
                    </div>
                    <div style="font-size: 10px; letter-spacing: 0.18em; color: #d8b66e; text-transform: uppercase; margin-top: 4px;">
                      Luxe Celebrations &amp; Invitations
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; color: #34232b;">
                ${greeting}
              </p>
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; color: #57464e;">
                Your one-time verification code for <strong>INVITE STUDIO</strong> is:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f8f3eb; border: 1px solid #e9ded1; border-radius: 12px; padding: 20px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #401526; display: inline-block;">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.6; margin: 0 0 12px 0; color: #887a78;">
                • This code is valid for <strong>5 minutes</strong> and can only be used once.
              </p>
              <p style="font-size: 13px; line-height: 1.6; margin: 0 0 24px 0; color: #887a78;">
                • If you did not request this verification code, please ignore this email.
              </p>

              <hr style="border: none; border-top: 1px solid #e9ded1; margin: 24px 0;" />

              <p style="font-size: 12px; line-height: 1.5; margin: 0; color: #a69a98; text-align: center;">
                For security reasons, never share this verification code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f3eb; border-top: 1px solid #e9ded1; padding: 20px 24px; text-align: center;">
              <p style="font-size: 11px; color: #887a78; margin: 0;">
                &copy; ${new Date().getFullYear()} INVITE STUDIO. All rights reserved.
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

    const textContent = `
INVITE STUDIO - Verification Code

${greeting}

Your one-time verification code is: ${otp}

This code is valid for 5 minutes and can only be used once.
If you did not request this verification code, please ignore this email.

Never share this code with anyone.
    `.trim();

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to,
        subject: `Your INVITE STUDIO Verification Code: ${otp}`,
        text: textContent,
        html: htmlContent
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (err) {
      const error = new Error('Failed to deliver verification email. Please verify your email address.');
      error.statusCode = 502;
      error.original = err.message;
      throw error;
    }
  }
}

export const mailService = new MailService();
export default mailService;

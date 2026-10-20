import nodemailer from 'nodemailer';
import { env, isDevelopment } from '../config/env';
import { logger } from './logger';

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

/**
 * Sends email when SMTP is configured. In development without SMTP,
 * logs the message so flows remain testable without credentials.
 * Never throws — auth flows must still succeed if mail is unavailable.
 */
export async function sendMail(input: SendMailInput): Promise<{ delivered: boolean }> {
  if (!isSmtpConfigured()) {
    // Never log full verification/reset URLs or tokens — redact query strings.
    const safePreview = isDevelopment
      ? input.text.replace(/\?token=[^\s)]+/gi, '?token=[redacted]')
      : undefined;
    logger.warn('SMTP not configured — email not delivered', {
      to: input.to,
      subject: input.subject,
      preview: safePreview,
    });
    return { delivered: false };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: Boolean(env.SMTP_SECURE),
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { delivered: true };
  } catch (error) {
    logger.error('Failed to send email', {
      message: error instanceof Error ? error.message : String(error),
    });
    return { delivered: false };
  }
}

export function buildFrontendUrl(path: string): string {
  const base = env.FRONTEND_ORIGIN.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

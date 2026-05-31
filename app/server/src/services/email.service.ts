import { env } from '../config/env';

interface EmailOptions {
  to:      string;
  subject: string;
  html:    string;
}

async function send(options: EmailOptions) {
  if (env.NODE_ENV === 'development' || !env.SMTP_USER) {
    console.log(`📧 [Email stub] To: ${options.to} | Subject: ${options.subject}`);
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  await transporter.sendMail({ from: env.EMAIL_FROM, ...options });
}

export async function sendApplicationReceived(to: string, candidateName: string, jobTitle: string) {
  await send({
    to,
    subject: `Application received: ${jobTitle}`,
    html: `<p>Hi ${candidateName},</p><p>Your application for <strong>${jobTitle}</strong> has been received. We'll be in touch soon.</p>`,
  });
}

export async function sendStatusChanged(to: string, candidateName: string, jobTitle: string, status: string) {
  await send({
    to,
    subject: `Application update: ${jobTitle}`,
    html: `<p>Hi ${candidateName},</p><p>Your application for <strong>${jobTitle}</strong> has been updated to <strong>${status}</strong>.</p>`,
  });
}

export async function sendInterviewScheduled(to: string, candidateName: string, jobTitle: string, scheduledAt: Date, meetLink?: string) {
  await send({
    to,
    subject: `Interview scheduled: ${jobTitle}`,
    html: `<p>Hi ${candidateName},</p><p>Your interview for <strong>${jobTitle}</strong> is scheduled for <strong>${scheduledAt.toLocaleString()}</strong>.</p>${meetLink ? `<p><a href="${meetLink}">Join meeting</a></p>` : ''}`,
  });
}

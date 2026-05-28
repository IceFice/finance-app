// Mailer — sends transactional email via SMTP (nodemailer).
//
// Provider-agnostic: any SMTP host works (Mailtrap, Resend, SendGrid, Gmail
// app password, Postfix, ...). Configured entirely by SMTP_* env vars.
//
// When SMTP_HOST is missing we fall back to a console transport that just
// logs the message — that way local dev and CI keep working without
// external dependencies, while production gets real email as soon as the
// VPS .env gains SMTP_HOST/USER/PASS.

import nodemailer, { Transporter } from 'nodemailer';

interface MailerConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  secure?: boolean;
}

let transporter: Transporter | null = null;
let cachedFrom = 'Бабкосчёт <noreply@babkoschet.ru>';

function build(): { transporter: Transporter; isReal: boolean } {
  const cfg: MailerConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    secure: process.env.SMTP_SECURE === 'true',
  };
  if (cfg.from) cachedFrom = cfg.from;

  if (!cfg.host) {
    // Stream transport — nodemailer hands us the serialized message instead
    // of sending it. We log a single line so devs see what would be sent.
    const t = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
    return { transporter: t, isReal: false };
  }

  const t = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port ?? 587,
    secure: cfg.secure ?? false,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  return { transporter: t, isReal: true };
}

function get(): { transporter: Transporter; isReal: boolean } {
  if (!transporter) {
    const built = build();
    transporter = built.transporter;
    return built;
  }
  return { transporter, isReal: !!process.env.SMTP_HOST };
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { transporter: t, isReal } = get();
  try {
    const info = (await t.sendMail({
      from: cachedFrom,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })) as { messageId?: string };
    if (!isReal) {
      console.log(`[mailer:dev] to=${input.to} subject="${input.subject}"`);
      console.log(`[mailer:dev] body:\n${input.text}`);
    } else {
      console.log(`[mailer] sent to=${input.to} messageId=${info.messageId ?? '?'}`);
    }
  } catch (e) {
    // Don't crash the request — log and swallow. The user-facing endpoint
    // always returns 200 (no enumeration), so the mailer failure must not
    // change the response shape. Surface in logs for ops investigation.
    console.error('[mailer] send failed', e instanceof Error ? e.message : e);
  }
}

import { APP_NAME } from '../../shared/branding'

export interface SendMagicLinkEmailInput {
  to: string
  url: string
  /** Minutes until the link expires, shown in the email copy. */
  ttlMinutes: number
}

export interface SendMailResult {
  /** True when handed off to an SMTP server; false when only logged (dev). */
  delivered: boolean
}

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

function readSmtpConfig(): SmtpConfig | null {
  const config = useRuntimeConfig()
  const smtp = config.smtp ?? {}
  const host = String(smtp.host ?? '').trim()
  if (!host) return null

  const port = Number(smtp.port) || 587
  const secureFlag = String(smtp.secure ?? '')
    .trim()
    .toLowerCase()
  return {
    host,
    port,
    // Implicit TLS for port 465, STARTTLS otherwise (overridable via env).
    secure: secureFlag === 'true' ? true : port === 465,
    user: String(smtp.user ?? '').trim(),
    pass: String(smtp.pass ?? ''),
    from: String(smtp.from ?? '').trim() || `${APP_NAME} <no-reply@freiwerk.local>`,
  }
}

function renderMagicLinkEmail(url: string, ttlMinutes: number): {
  subject: string
  text: string
  html: string
} {
  const subject = `Dein Anmeldelink für ${APP_NAME}`
  const text = [
    `Hallo,`,
    ``,
    `klicke auf den folgenden Link, um dich bei ${APP_NAME} anzumelden:`,
    url,
    ``,
    `Der Link ist ${ttlMinutes} Minuten gültig und kann nur einmal verwendet werden.`,
    `Wenn du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
    ``,
    `— ${APP_NAME}`,
  ].join('\n')

  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;background:#f4f6fb;padding:24px;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(3,45,103,0.12);">
            <tr>
              <td style="background:#032D67;padding:24px 28px;">
                <span style="color:#FFE000;font-size:20px;font-weight:700;">${APP_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:20px;">Bei ${APP_NAME} anmelden</h1>
                <p style="margin:0 0 20px;line-height:1.55;color:#334155;">
                  Klicke auf den Knopf, um dich passwortlos anzumelden. Der Link ist
                  <strong>${ttlMinutes} Minuten</strong> gültig und funktioniert nur einmal.
                </p>
                <p style="margin:0 0 24px;">
                  <a href="${url}" style="display:inline-block;background:#FFE000;color:#032D67;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:999px;">
                    Jetzt anmelden
                  </a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
                  Falls der Knopf nicht funktioniert, kopiere diesen Link in deinen Browser:
                </p>
                <p style="margin:0;font-size:13px;word-break:break-all;">
                  <a href="${url}" style="color:#00A7E7;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                Du hast diese Anmeldung nicht angefordert? Dann ignoriere diese E-Mail einfach.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}

/**
 * Send a passwordless login email. When SMTP is not configured (typical for
 * local/demo runs) the link is logged to the server console instead, so the
 * flow stays fully testable without a real mail server.
 */
export async function sendMagicLinkEmail(
  input: SendMagicLinkEmailInput,
): Promise<SendMailResult> {
  const smtp = readSmtpConfig()
  const { subject, text, html } = renderMagicLinkEmail(input.url, input.ttlMinutes)

  if (!smtp) {
    console.info(
      `\n[email] SMTP not configured — magic link for ${input.to}:\n${input.url}\n`,
    )
    return { delivered: false }
  }

  // Imported lazily so the app boots even if the optional dependency is absent
  // (e.g. console-only dev setups that never configure SMTP).
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  })

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject,
    text,
    html,
  })

  return { delivered: true }
}

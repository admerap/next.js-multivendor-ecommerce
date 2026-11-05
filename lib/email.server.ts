import "server-only";

/**
 * Transactional email. Sends through Resend (https://resend.com) when RESEND_API_KEY is set — plain REST,
 * no SDK. Without a key:
 *  - development: the message is printed to the server console instead (links included), so flows like
 *    password reset can be built and tested before an email account exists;
 *  - production: nothing is sent and the failure is logged (never the message body — it can hold a link).
 *
 * Env: RESEND_API_KEY · EMAIL_FROM (e.g. "Sundry <no-reply@your-domain.com>", a domain verified in Resend).
 */

export type Email = { to: string; subject: string; html: string; text: string };

const FROM = process.env.EMAIL_FROM ?? "Sundry <onboarding@resend.dev>";

export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[email:dev] To: ${email.to}\n[email:dev] Subject: ${email.subject}\n${email.text}\n`);
      return true;
    }
    console.error("[email] RESEND_API_KEY is not set — email not sent:", email.subject);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[email] Resend refused the message:", res.status, email.subject);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] couldn't reach Resend:", error instanceof Error ? error.name : error, email.subject);
    return false;
  }
}

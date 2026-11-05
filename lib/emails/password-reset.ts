import type { Email } from "@/lib/email.server";

/**
 * Email colours. Email clients can't read CSS variables, so these literals mirror the design tokens in
 * app/globals.css (DESIGN_SYSTEM §11) — the one place outside the token file where they're written out.
 */
const C = {
  primary: "#6A2FD6", // --color-primary = --iris-600
  ink: "#1A1A23", // --text-strong = --neutral-900
  body: "#3E3E4E", // --text-body = --neutral-700
  muted: "#78788A", // --text-muted = --neutral-500
  page: "#FAFAFB", // --surface-page = --neutral-50
  card: "#FFFFFF", // --surface-card = --neutral-0
  line: "#E6E6EC", // --border-subtle = --neutral-200
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** "Reset your Sundry password" — the link is single-use and expires in `minutes`. */
export function passwordResetEmail({ to, name, link, minutes }: { to: string; name: string | null; link: string; minutes: number }): Email {
  const hi = name ? `Hi ${name.split(/\s+/)[0]},` : "Hi,";
  const text = [
    hi,
    "",
    "We got a request to reset the password for your Sundry account.",
    `Open this link to choose a new one (it works once and expires in ${minutes} minutes):`,
    "",
    link,
    "",
    "If you didn't ask for this, you can ignore this email — your password won't change.",
    "",
    "— The Sundry team",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your Sundry password</title></head>
<body style="margin:0;padding:0;background:${C.page};font-family:Manrope,Segoe UI,Arial,sans-serif;color:${C.body}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:36px 32px">
        <tr><td style="font-size:22px;font-weight:800;color:${C.primary};letter-spacing:-0.02em;padding-bottom:24px">Sundry</td></tr>
        <tr><td style="font-size:22px;font-weight:800;color:${C.ink};padding-bottom:12px">Reset your password</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;padding-bottom:8px">${esc(hi)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;padding-bottom:24px">We got a request to reset the password for your Sundry account. Tap the button to choose a new one.</td></tr>
        <tr><td style="padding-bottom:24px">
          <a href="${esc(link)}" style="display:inline-block;background:${C.primary};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px">Choose a new password</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:${C.muted};padding-bottom:16px">This link works once and expires in ${minutes} minutes. If the button doesn't work, paste this into your browser:<br><a href="${esc(link)}" style="color:${C.primary};word-break:break-all">${esc(link)}</a></td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:${C.muted};border-top:1px solid ${C.line};padding-top:16px">Didn't ask for this? You can ignore this email — your password won't change.</td></tr>
      </table>
      <p style="font-size:12px;color:${C.muted};margin:16px 0 0">© 2026 Sundry Marketplace</p>
    </td></tr>
  </table>
</body></html>`;

  return { to, subject: "Reset your Sundry password", html, text };
}

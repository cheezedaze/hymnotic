import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

export async function sendInvitationEmail(
  email: string,
  inviteUrl: string,
  inviterName?: string
) {
  const fromEmail = process.env.EMAIL_FROM || "Hymnotic <onboarding@resend.dev>";

  const resend = getResend();
  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "You're invited to Hymnotic",
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; color: #e0e0e0; background-color: #141A24;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: #00FFFB; margin: 0;">Hymnotic</h1>
        </div>
        <h2 style="font-size: 20px; color: #ffffff; margin-bottom: 16px;">You're Invited</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #b0b0b0;">
          ${inviterName ? `${inviterName} has invited you` : "You've been invited"} to join Hymnotic &mdash; a sacred music experience.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #00FFFB; color: #141A24; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 8px;">
            Set Up Your Account
          </a>
        </div>
        <p style="font-size: 13px; color: #888;">This invitation link expires in 7 days.</p>
      </div>
    `,
  });
}

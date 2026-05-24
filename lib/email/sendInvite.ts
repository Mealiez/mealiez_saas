import { resend } from './resend';
import { getInviteEmailTemplate } from './templates/invite';

export async function sendInviteEmail(
  userEmail: string,
  orgName: string,
  tempPassword: string,
  loginUrl: string
) {
  const template = getInviteEmailTemplate(orgName, userEmail, tempPassword, loginUrl);
  let retries = 3;
  let lastError;

  const emailAddress = process.env.EMAIL_FROM || "no-reply@notify.mealiez.in";

  while (retries > 0) {
    try {
      const { data, error } = await resend.emails.send({
        from: `Mealiez <${emailAddress}>`,
        to: userEmail,
        subject: 'Welcome to Mealiez',
        html: template,
      });

      if (error) {
        throw new Error(error.message);
      }
      
      console.log(`[RESEND] Invite email sent to ${userEmail}, id: ${data?.id}`);
      return { success: true };
    } catch (err: any) {
      lastError = err;
      retries--;
      console.warn(`[RESEND] Failed to send invite, retries left: ${retries}. Error: ${err.message}`);
      if (retries > 0) {
        // Wait 1s before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  console.error(`[RESEND] Final failure sending invite to ${userEmail}`, lastError);
  return { success: false, error: lastError };
}

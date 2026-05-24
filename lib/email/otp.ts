import { resend } from './resend';
import { getOtpEmailTemplate } from './templates/otp';
import { createAdminClient } from '@/lib/supabase/admin';

export async function sendOtpEmail(email: string, type: 'registration' | 'email_change', metadata: any = {}) {
  const supabase = createAdminClient();
  
  // 1. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  // 2. Store in DB
  const { error: dbError } = await supabase
    .from('pending_otps')
    .insert({
      email,
      otp,
      type,
      metadata,
      expires_at: expiresAt.toISOString()
    });

  if (dbError) throw dbError;

  // 3. Send via Resend
  const template = getOtpEmailTemplate(otp, type);
  
  const { error: resendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Mealiez <no-reply@notify.mealiez.in>',
    to: email,
    subject: type === 'registration' ? 'Verify your Mealiez account' : 'Confirm your email change',
    html: template
  });

  if (resendError) {
    console.error('[RESEND_OTP_ERROR]', resendError);
    throw new Error('Failed to send verification email');
  }

  return { success: true };
}

export async function verifyCustomOtp(email: string, otp: string, type: 'registration' | 'email_change') {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pending_otps')
    .select('*')
    .eq('email', email)
    .eq('otp', otp)
    .eq('type', type)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: 'Invalid or expired code' };
  }

  // Delete the used OTP
  await supabase.from('pending_otps').delete().eq('id', data.id);

  return { success: true, metadata: data.metadata };
}

export function getOtpEmailTemplate(otp: string, action: string) {
  const actionLabel = action === 'registration' ? 'Verify your new account' : 'Confirm email change';
  const actionDesc = action === 'registration' 
    ? 'Thank you for choosing Mealiez. Please use the verification code below to complete your registration.'
    : 'We received a request to change the email address for your Mealiez account. Use the code below to confirm this change.';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code - Mealiez</title>
        <style>
          body { font-family: sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 20px; text-align: center; }
          .otp-box { background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e5e7eb; letter-spacing: 0.5em; font-size: 32px; font-weight: 900; color: #4f46e5; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #4f46e5; margin: 0;">Mealiez</h1>
          </div>
          <div class="content">
            <h2 style="color: #111827; margin-bottom: 10px;">${actionLabel}</h2>
            <p style="color: #4b5563;">${actionDesc}</p>
            <div class="otp-box">
              ${otp}
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mealiez. All rights reserved.</p>
            <p>If you did not request this code, please ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

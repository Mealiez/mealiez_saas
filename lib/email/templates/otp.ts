export function getOtpEmailTemplate(otp: string, action: string) {
  const isRegistration = action === 'registration';
  const actionLabel = isRegistration ? 'Welcome to Mealiez!' : 'Confirm email change';
  const actionDesc = isRegistration 
    ? 'We\'re excited to help you streamline your mess management. Use the verification code below to complete your administrator registration and start setting up your organization.'
    : 'We received a request to change the email address for your Mealiez account. Use the code below to confirm this change.';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isRegistration ? 'Welcome to Mealiez' : 'Verification Code'}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #ffffff; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; padding-bottom: 30px; }
          .content { padding: 0; text-align: center; }
          .otp-box { background: #fff7ed; padding: 30px; border-radius: 16px; margin: 30px 0; border: 2px dashed #fdba74; letter-spacing: 0.5em; font-size: 36px; font-weight: 900; color: #f97316; }
          .footer { margin-top: 40px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 20px; }
          .welcome-text { font-size: 18px; color: #4b5563; margin-bottom: 25px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #f97316; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em;">Mealiez</h1>
          </div>
          <div class="content">
            <h2 style="color: #111827; margin-bottom: 15px; font-size: 24px;">${actionLabel}</h2>
            <p class="welcome-text">${actionDesc}</p>
            <div class="otp-box">
              ${otp}
            </div>
            <p style="color: #6b7280; font-size: 14px;">This verification code will expire in 15 minutes.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mealiez. All rights reserved.</p>
            <p>If you did not request this code, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

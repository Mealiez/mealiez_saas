export function getInviteEmailTemplate(orgName: string, email: string, tempPassword: string, loginUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Mealiez</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #ffffff; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; padding-bottom: 30px; }
          .content { padding: 0; }
          .highlight { background: #fff7ed; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #fdba74; }
          .button { display: inline-block; padding: 14px 28px; background-color: #f97316; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
          .footer { margin-top: 40px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 20px; }
          code { background: #ffedd5; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #ea580c; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #f97316; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em;">Mealiez</h1>
          </div>
          <div class="content">
            <h2 style="color: #111827; margin-bottom: 15px; font-size: 24px;">Welcome to the Team!</h2>
            <p style="font-size: 16px; color: #4b5563;">You have been invited to join <strong>${orgName}</strong> on Mealiez.</p>
            <p style="font-size: 16px; color: #4b5563;">Please use the credentials below to log in for the first time:</p>
            <div class="highlight">
              <p style="margin: 0 0 12px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0; font-size: 15px;"><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
            </div>
            <p style="color: #6b7280; font-size: 14px; background: #fffbeb; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <strong>Security Note:</strong> You will be required to change your password immediately after your first login.
            </p>
            <p style="text-align: center; margin-top: 40px;">
              <a href="${loginUrl}" class="button">Log In & Start Tracking</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mealiez. All rights reserved.</p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

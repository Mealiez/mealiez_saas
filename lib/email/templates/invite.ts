export function getInviteEmailTemplate(orgName: string, email: string, tempPassword: string, loginUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Mealiez</title>
        <style>
          body { font-family: sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 20px; border-radius: 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white !important; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af; }
          code { background: #eee; padding: 2px 4px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #4f46e5; margin: 0;">Mealiez</h1>
          </div>
          <div class="content">
            <h2 style="color: #111827;">Welcome!</h2>
            <p>You have been invited to join <strong>${orgName}</strong> on Mealiez.</p>
            <p>Please use the credentials below to log in for the first time:</p>
            <div class="highlight">
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0;"><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
            </div>
            <p style="color: #6b7280; font-size: 14px;"><em>Important: You will be required to change your password immediately after logging in.</em></p>
            <p style="text-align: center; margin-top: 35px;">
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

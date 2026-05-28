# Future SMS Invitation & Login Flow

This document outlines the planned implementation for a production-grade SMS invitation flow once DLT (Distributed Ledger Technology) registration is completed.

## Current Limitations (Interim Flow)
Due to pending DLT registration for SMS templates:
- We currently generate temporary passwords and store them in the database for manual export.
- This is a security workaround to allow account creation without immediate SMS delivery.

## Future Production Flow (Post-DLT)

### 1. SMS Service Provider Integration
- **Preferred Providers**: Twilio, Msg91, or Plivo.
- **DLT Requirement**: Ensure all invitation and OTP templates are registered and approved on the DLT platform (required for India).
- **Environment Variables**:
  ```env
  SMS_PROVIDER=twilio
  SMS_API_KEY=your_key
  SMS_FROM_NUMBER=your_approved_sender_id
  ```

### 2. Invitation Logic Refactor
Once active, the `POST /api/users` route should:
1. Generate a strong temporary password (as it does now).
2. Create the auth user in Supabase with the phone number.
3. **Trigger Real SMS**: Use the SMS provider API to send the approved DLT template.
4. **Security**: Stop storing the temporary password in the `users` table. The SMS is the only delivery mechanism.

### 3. Login Method (Passwordless OTP vs. Temp Password)
- **Option A (Current Path)**: User logs in with Phone + Temporary Password (received via SMS) + Forced Password Change on first login.
- **Option B (Recommended)**: Switch to passwordless OTP login (`supabase.auth.signInWithOtp({ phone: '...' })`). This removes the need for temporary passwords entirely.

### 4. Implementation Steps
- Update `lib/sms/sendInvite.ts` to use a real API client instead of `console.log`.
- Refactor `app/api/users/route.ts` to remove the `invited_temp_password` field from the database upsert.
- Remove any manual password export UI components from the Settings module.

## Security Considerations
- **Encryption**: Temporary passwords should never be stored in plain text if kept in the database (though the goal is to remove them entirely).
- **Rate Limiting**: Implement strict rate limiting on the SMS invitation API to prevent financial drain from SMS spam.
- **Validation**: Enforce E.164 format for all phone numbers.

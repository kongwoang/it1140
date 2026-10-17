-- The anonymous enrollment lookup must not scan all retained OTP challenges.
create index otp_enrollment_active on app.otp(enroll_hash)
  where consumed_at is null and enroll_hash is not null;

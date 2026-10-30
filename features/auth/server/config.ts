// Kept free of server-only imports because Proxy also reads the cookie name.
function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getSessionCookieName() {
  return process.env.AUTH_SESSION_COOKIE_NAME?.trim() || "nrh_auth";
}

export function getAuthConfig() {
  return {
    timeoutMs: positiveInt(process.env.WP_AUTH_TIMEOUT_MS, 10_000),
    sessionCookieName: getSessionCookieName(),
    sessionCookieMaxAge: positiveInt(process.env.AUTH_SESSION_MAX_AGE, 60 * 60 * 24 * 14),
    // Production cookies can never be weakened by a configuration override.
    cookieSecure: process.env.NODE_ENV === "production",
    // Vercel instances share WordPress sessions, not a writable local filesystem.
    upstreamSessionRevocation: process.env.VERCEL === "1",
    allowedOrigins: (process.env.AUTH_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean),
  };
}

export const AUTH_POLICY = {
  otpResendCooldown: 120,
  otpFallbackExpiresIn: 120,
  otpSendLimitPerHour: 5,
  otpSendLimitPerIp: 20,
  otpVerifyMaxAttempts: 5,
  passwordAttemptsPerWindow: 8,
  passwordAttemptWindow: 60 * 15,
  recoveryLimitPerHour: 5,
} as const;

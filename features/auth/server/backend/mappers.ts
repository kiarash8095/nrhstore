import "server-only";

import { z } from "zod";
import { normalizeIranMobile,type AuthUserDto } from "../../contracts";
import { authError } from "./errors";

// /boom/v1/me is a WordPress user object. Never invent an ID from form input.
const wpUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().optional(),
  slug: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export function extractUser(payload: unknown): AuthUserDto {
  const parsed = wpUserSchema.safeParse(payload);
  if (!parsed.success) throw authError("backend_unavailable", { status: 502 });
  const user = parsed.data;
  const phone = normalizeIranMobile(user.phone || user.slug || "");
  const [firstName, ...lastName] = (user.name || "").trim().split(/\s+/);
  return {
    id: String(user.id),
    phone: /^09\d{9}$/.test(phone) ? phone : "",
    firstName: user.first_name || firstName || undefined,
    lastName: user.last_name || lastName.join(" ") || undefined,
    email: user.email || undefined,
  };
}

export function toExpiryInfo(payload: unknown, fallback: { expiresIn: number; resendAfter: number }) {
  const value = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const expiresIn = Number(value.expires_in ?? value.expiresIn);
  const resendAfter = Number(value.resend_after ?? value.resendAfter);
  return {
    expiresIn: Number.isSafeInteger(expiresIn) && expiresIn > 0 ? expiresIn : fallback.expiresIn,
    resendAfter: Number.isSafeInteger(resendAfter) && resendAfter > 0 ? resendAfter : fallback.resendAfter,
  };
}

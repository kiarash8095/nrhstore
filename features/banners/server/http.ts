import "server-only";

import { NextResponse,type NextRequest } from "next/server";
import { ADMIN_COOKIE,verifyAdminToken } from "./admin-session";
import { isTrustedOriginRequest } from "@/lib/http/request-origin";

export function bannerJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function bannerError(message: string, status: number) {
  return bannerJson({ message }, status);
}

export function checkBannerOrigin(request: NextRequest) {
  // Use the actual Host/public origin when Next runs behind an HTTPS reverse proxy.
  if (!isTrustedOriginRequest(request)) {
    return bannerError("مبدأ درخواست معتبر نیست.", 403);
  }
  return null;
}

export function requireBannerAdmin(request: NextRequest, mutation = false) {
  if (mutation) {
    const originError = checkBannerOrigin(request);
    if (originError) return originError;
  }
  if (!verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return bannerError("نشست شما منقضی شده است؛ دوباره وارد شوید.", 401);
  }
  return null;
}

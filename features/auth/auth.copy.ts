import type { AuthStep } from "./types/auth-flow.types";

export const AUTH_MODAL_COPY = { title: "حساب کاربری", brandLine: "نوین رایانه همدان" };
const descriptions: Record<AuthStep, { title: string; description: string }> = {
  phone: { title: "ورود / ثبت‌نام", description: "اطلاعات ورود خود را وارد کنید یا حساب جدید بسازید." },
  password: { title: "ورود به حساب", description: "رمز عبور خود را وارد کنید." },
  otp: { title: "کد تایید ورود", description: "کد پیامک‌شده را وارد کنید." },
  register: { title: "ساخت حساب کاربری", description: "نام، شماره موبایل، ایمیل و رمز عبور را وارد کنید." },
  recovery: { title: "بازیابی رمز عبور", description: "روش دریافت کد بازیابی را انتخاب کنید." },
  "reset-password": { title: "تعیین رمز عبور جدید", description: "کد بازیابی و رمز جدید را با هم وارد کنید." },
  success: { title: "خوش آمدید", description: "ورود شما با موفقیت انجام شد." },
};
export function getStepMeta(step: AuthStep) {
  return descriptions[step];
}

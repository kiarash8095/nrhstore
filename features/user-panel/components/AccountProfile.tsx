'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuthActions, type AuthUser } from '@/features/auth';
import { normalizeIranMobile, toAsciiDigits } from '@/features/auth/contracts';
import { profileSchema, type AccountProfile as Profile } from '../contracts';
import { useAccountQuery, useAccountWrite } from '../hooks/use-user-panel';
import {
  AccountError,
  AccountLoading,
  fieldClass,
  glass,
  primaryClass,
  secondaryClass,
  SectionTitle,
} from './AccountUI';

function ProfileForm({ profile }: { profile: Profile }) {
  const [values, setValues] = useState(profile.values);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const guard = useRef(false);
  const router = useRouter();
  const { refreshSession } = useAuthActions();
  const write = useAccountWrite(async () => {
    setSaved(true);
    await refreshSession().catch(() => undefined);
    router.refresh();
  });
  const editable = profile.fields.filter((field) => field.editable);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (guard.current || write.busy) return;
        const submitted = Object.fromEntries(
          editable.map((field) => [
            field.key,
            field.type === 'tel'
              ? normalizeIranMobile(values[field.key] || '')
              : field.type === 'number'
                ? toAsciiDigits(values[field.key] || '')
                : (values[field.key] || '').trim(),
          ]),
        );
        for (const field of editable) {
          if (field.required && !submitted[field.key]) {
            setError(field.label + ' را کامل کنید.');
            return;
          }
        }
        guard.current = true;
        setError('');
        setSaved(false);
        try {
          await write.submit('profile', 'POST', { values: submitted });
        } catch {
        } finally {
          guard.current = false;
        }
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {profile.fields.map((field) => (
          <label
            key={field.key}
            className={
              'space-y-2 text-xs font-medium text-gray-700 ' +
              (field.type === 'textarea' || field.type === 'file'
                ? 'sm:col-span-2'
                : '')
            }
          >
            <span className="block">
              {field.label}
              {field.required && field.editable && (
                <span aria-hidden="true" className="mr-1 text-orange-600">
                  *
                </span>
              )}
            </span>
            {field.type === 'select' && field.editable ? (
              <select
                value={values[field.key] || ''}
                required={field.required}
                disabled={write.busy}
                onChange={(event) => {
                  setSaved(false);
                  setValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }));
                }}
                className={fieldClass}
              >
                <option value="">انتخاب کنید</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                rows={3}
                required={field.required}
                disabled={write.busy || !field.editable}
                maxLength={2000}
                value={values[field.key] || ''}
                onChange={(event) => {
                  setSaved(false);
                  setValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }));
                }}
                className={fieldClass + ' py-3'}
              />
            ) : (
              <input
                name={field.key}
                type={
                  field.type === 'email'
                    ? 'email'
                    : field.type === 'tel'
                      ? 'tel'
                      : 'text'
                }
                inputMode={field.type === 'number' ? 'numeric' : undefined}
                value={values[field.key] || ''}
                required={field.required && field.editable}
                readOnly={!field.editable}
                disabled={write.busy}
                maxLength={field.type === 'email' ? 254 : 500}
                dir={
                  field.type === 'email' || field.type === 'tel'
                    ? 'ltr'
                    : undefined
                }
                className={
                  fieldClass +
                  (!field.editable ? ' bg-gray-50 text-gray-400' : '')
                }
                onChange={(event) => {
                  setSaved(false);
                  setError('');
                  const value = ['tel', 'number'].includes(field.type)
                    ? toAsciiDigits(event.target.value)
                    : event.target.value;
                  setValues((current) => ({ ...current, [field.key]: value }));
                }}
              />
            )}
            {!field.editable && (
              <span className="block text-[10px] leading-6 text-gray-500">
                {field.type === 'file'
                  ? 'برای تغییر این مورد با پشتیبانی تماس بگیرید.'
                  : 'تغییر شماره ورود به تأیید هویت نیاز دارد.'}
              </span>
            )}
          </label>
        ))}
      </div>
      {(write.error || error) && (
        <div className="mt-5">
          <AccountError error={write.error || new Error(error)} />
        </div>
      )}
      {saved && (
        <p
          role="status"
          className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-700"
        >
          تغییرات پروفایل شما ذخیره شد.
        </p>
      )}
      {!!editable.length && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <button type="submit" disabled={write.busy} className={primaryClass}>
            {write.isPending && (
              <LoaderCircle className="size-4 animate-spin" />
            )}
            ذخیره تغییرات پروفایل
          </button>
        </div>
      )}
      {!profile.fields.length && (
        <p className="text-sm leading-8 text-gray-500">
          در حال حاضر اطلاعات قابل ویرایشی برای این حساب تعریف نشده است. برای
          تغییر اطلاعات با پشتیبانی تماس بگیرید.
        </p>
      )}
    </form>
  );
}
export function AccountProfile({ user }: { user: AuthUser }) {
  const query = useAccountQuery('profile', profileSchema);
  const { openAuth } = useAuthActions();
  return (
    <>
      <SectionTitle
        title="پروفایل من"
        subtitle="اطلاعات حساب و راه‌های ارتباطی خود را به‌روز نگه دارید."
      />
      <section
        className={glass + ' mb-5 flex flex-wrap items-center gap-4 p-5 sm:p-6'}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <UserRound className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-gray-800">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
              'کاربر نوین رایانه'}
          </h2>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            حساب متصل به فروشگاه
          </p>
        </div>
        {user.phone && (
          <div className="text-left">
            <p className="text-[10px] text-gray-500">شماره ورود</p>
            <p dir="ltr" className="mt-1 text-sm font-bold text-gray-700">
              {user.phone}
            </p>
          </div>
        )}
      </section>
      <section className={glass + ' p-5 sm:p-6'}>
        <h2 className="mb-6 font-bold text-gray-800">ویرایش اطلاعات</h2>
        {query.isPending ? (
          <AccountLoading />
        ) : query.error ? (
          <AccountError
            error={query.error}
            retry={() => void query.refetch()}
          />
        ) : (
          <ProfileForm key={user.id} profile={query.data} />
        )}
      </section>
      <section
        className={
          glass +
          ' mt-5 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6'
        }
      >
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <LockKeyhole className="size-4 text-orange-600" />
            امنیت حساب
          </h2>
          <p className="mt-2 text-xs leading-7 text-gray-500">
            برای تغییر رمز عبور، از بازیابی امن با کد تأیید استفاده کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuth({ nextPath: '/account/profile' })}
          className={secondaryClass}
        >
          ورود و بازیابی رمز عبور
        </button>
      </section>
    </>
  );
}

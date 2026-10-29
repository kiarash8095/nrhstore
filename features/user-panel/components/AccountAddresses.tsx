'use client';
import { useRef, useState } from 'react';
import {
  Check,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { toAsciiDigits } from '@/features/auth/contracts';
import { iranProvinces } from '@/features/cart/constants/iran-provinces';
import {
  addressesSchema,
  addressInputSchema,
  type AddressInput,
  type SavedAddress,
} from '../contracts';
import { useAccountQuery, useAccountWrite } from '../hooks/use-user-panel';
import {
  AccountError,
  AccountLoading,
  EmptyState,
  fieldClass,
  glass,
  primaryClass,
  secondaryClass,
  SectionTitle,
} from './AccountUI';

const empty: AddressInput = {
  title: '',
  first_name: '',
  last_name: '',
  phone: '',
  state: '',
  city: '',
  address: '',
  postcode: '',
};
const fields = [
  ['title', 'عنوان آدرس', 'مانند خانه یا محل کار'],
  ['first_name', 'نام گیرنده', ''],
  ['last_name', 'نام خانوادگی گیرنده', ''],
  ['phone', 'شماره موبایل گیرنده', '09xxxxxxxxx'],
  ['state', 'استان', ''],
  ['city', 'شهر', ''],
  ['postcode', 'کد پستی', '۱۰ رقم بدون فاصله'],
  ['address', 'نشانی کامل', 'خیابان، کوچه، پلاک و واحد'],
] as const;
function AddressEditor({
  address,
  close,
}: {
  address: SavedAddress | null;
  close: (saved?: boolean) => void;
}) {
  const [values, setValues] = useState<AddressInput>(() =>
    address
      ? (Object.fromEntries(
          Object.keys(empty).map((key) => [
            key,
            address[key as keyof AddressInput],
          ]),
        ) as AddressInput)
      : { ...empty },
  );
  const [error, setError] = useState('');
  const guard = useRef(false);
  const write = useAccountWrite(() => close(true));
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (guard.current || write.busy) return;
        const parsed = addressInputSchema.safeParse(values);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        guard.current = true;
        setError('');
        try {
          await write.submit(
            'addresses' + (address ? '/' + address.id : ''),
            address ? 'PUT' : 'POST',
            parsed.data,
          );
        } catch {
        } finally {
          guard.current = false;
        }
      }}
    >
      <fieldset
        disabled={write.busy}
        className="grid min-w-0 gap-4 sm:grid-cols-2"
      >
        {fields.map(([name, label, placeholder]) => (
          <label
            key={name}
            className={
              'block space-y-2 text-xs font-medium text-gray-700 ' +
              (name === 'address' || name === 'title' ? 'sm:col-span-2' : '')
            }
          >
            <span>
              {label}
              <span aria-hidden="true" className="mr-1 text-orange-600">
                *
              </span>
            </span>
            {name === 'state' ? (
              <select
                required
                value={values.state}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                className={fieldClass}
                name={name}
              >
                <option value="">انتخاب استان</option>
                {iranProvinces.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            ) : name === 'address' ? (
              <textarea
                required
                name={name}
                value={values.address}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                maxLength={500}
                rows={3}
                className={fieldClass + ' min-h-24 py-3'}
                placeholder={placeholder}
              />
            ) : (
              <input
                required
                name={name}
                value={values[name]}
                onChange={(event) => {
                  setError('');
                  const value = ['phone', 'postcode'].includes(name)
                    ? toAsciiDigits(event.target.value)
                    : event.target.value;
                  setValues((current) => ({ ...current, [name]: value }));
                }}
                maxLength={
                  name === 'postcode' ? 10 : name === 'phone' ? 14 : 100
                }
                autoComplete={
                  name === 'phone'
                    ? 'tel'
                    : name === 'postcode'
                      ? 'postal-code'
                      : undefined
                }
                type={name === 'phone' ? 'tel' : 'text'}
                inputMode={name === 'postcode' ? 'numeric' : undefined}
                dir={['phone', 'postcode'].includes(name) ? 'ltr' : undefined}
                placeholder={placeholder}
                className={fieldClass}
              />
            )}
          </label>
        ))}
      </fieldset>
      {(error || write.error) && (
        <div className="mt-4">
          <AccountError error={write.error || new Error(error)} />
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
        <button type="submit" disabled={write.busy} className={primaryClass}>
          {write.isPending && <LoaderCircle className="size-4 animate-spin" />}
          {address ? 'ذخیره تغییرات آدرس' : 'ثبت آدرس'}
        </button>
        <button
          type="button"
          disabled={write.busy}
          onClick={() => close(false)}
          className={secondaryClass}
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
export function AccountAddresses() {
  const query = useAccountQuery('addresses', addressesSchema);
  const [editor, setEditor] = useState<{ address: SavedAddress | null } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<SavedAddress | null>(null);
  const [notice, setNotice] = useState('');
  const write = useAccountWrite(() => {
    setDeleting(null);
    setNotice('آدرس‌ها به‌روز شدند.');
  });
  return (
    <>
      <SectionTitle
        title="آدرس‌های من"
        subtitle="نشانی‌های تحویل را اضافه و ویرایش کنید و آدرس پیش‌فرض خود را انتخاب کنید."
        action={
          !editor && (
            <button
              type="button"
              onClick={() => {
                setEditor({ address: null });
                setNotice('');
              }}
              disabled={write.busy}
              className={primaryClass}
            >
              <Plus className="size-4" />
              افزودن آدرس
            </button>
          )
        }
      />
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-700"
        >
          {notice}
        </p>
      )}
      {editor ? (
        <section className={glass + ' p-5 sm:p-6'}>
          <h2 className="mb-6 font-bold">
            {editor.address ? 'ویرایش آدرس' : 'آدرس جدید'}
          </h2>
          <AddressEditor
            key={editor.address?.id || 'new'}
            address={editor.address}
            close={(saved) => {
              setEditor(null);
              if (saved) setNotice('اطلاعات آدرس به‌روز شد.');
            }}
          />
        </section>
      ) : query.isPending ? (
        <AccountLoading />
      ) : query.error ? (
        <AccountError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {write.error && !deleting && (
            <div className="mb-4">
              <AccountError error={write.error} />
            </div>
          )}
          {!query.data.addresses.length ? (
            <section className={glass}>
              <EmptyState
                icon={<MapPin />}
                title="هنوز آدرسی ثبت نکرده‌اید"
                description="نشانی خانه یا محل کار را اضافه کنید تا برای خریدهای بعدی در دسترس باشد."
                action={
                  <button
                    type="button"
                    onClick={() => setEditor({ address: null })}
                    className={secondaryClass}
                  >
                    <Plus className="size-4" />
                    افزودن اولین آدرس
                  </button>
                }
              />
            </section>
          ) : (
            <div className="grid items-start gap-4 xl:grid-cols-2">
              {query.data.addresses.map((address) => (
                <article key={address.id} className={glass + ' p-5 sm:p-6'}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-bold text-gray-800">
                      <MapPin className="size-5 text-orange-500" />
                      {address.title}
                    </h2>
                    {address.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                        <Check className="size-3" />
                        پیش‌فرض
                      </span>
                    )}
                  </div>
                  <p className="min-h-14 break-words text-sm leading-8 text-gray-600">
                    {iranProvinces.find(
                      ([code]) => code === address.state,
                    )?.[1] || address.state}
                    ، {address.city}، {address.address}
                  </p>
                  <div className="mt-4 space-y-2 text-xs text-gray-500">
                    <p>
                      {address.first_name} {address.last_name}
                    </p>
                    <p>
                      شماره تماس: <bdi>{address.phone}</bdi>
                    </p>
                    <p>
                      کد پستی: <bdi>{address.postcode}</bdi>
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                    {!address.is_default && (
                      <button
                        type="button"
                        disabled={write.busy}
                        onClick={() =>
                          void write
                            .submit(
                              'addresses/' + address.id + '/default',
                              'POST',
                              {},
                            )
                            .catch(() => {})
                        }
                        className="min-h-10 rounded-xl px-2 text-[11px] font-bold text-orange-700 disabled:opacity-40"
                      >
                        انتخاب پیش‌فرض
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={write.busy}
                      onClick={() => {
                        setEditor({ address });
                        setNotice('');
                      }}
                      className="mr-auto inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-xs text-gray-600 disabled:opacity-40"
                    >
                      <Pencil className="size-3.5" />
                      ویرایش
                    </button>
                    <button
                      type="button"
                      disabled={write.busy}
                      aria-label={'حذف آدرس ' + address.title}
                      onClick={() => {
                        write.reset();
                        setDeleting(address);
                      }}
                      className="rounded-xl p-3 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <Dialog.Root
        open={!!deleting}
        onOpenChange={(open) => {
          if (!write.busy && !open) setDeleting(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-gray-950/30 backdrop-blur-sm" />
          <Dialog.Popup
            dir="rtl"
            className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white bg-white/95 p-6 shadow-xl outline-none"
          >
            <Dialog.Title className="font-bold text-gray-900">
              این آدرس حذف شود؟
            </Dialog.Title>
            <Dialog.Description className="mt-3 text-sm leading-8 text-gray-500">
              آدرس «{deleting?.title}» از نشانی‌های ذخیره‌شده شما حذف می‌شود.
            </Dialog.Description>
            {write.error && (
              <div className="mt-3">
                <AccountError error={write.error} />
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  deleting &&
                  void write
                    .submit('addresses/' + deleting.id, 'DELETE')
                    .catch(() => {})
                }
                disabled={write.busy}
                className="min-h-11 flex-1 rounded-2xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-40"
              >
                حذف آدرس
              </button>
              <Dialog.Close
                disabled={write.busy}
                className={secondaryClass + ' flex-1'}
              >
                انصراف
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

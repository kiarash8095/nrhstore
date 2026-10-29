'use client';
import Link from 'next/link';
import { MapPin, RefreshCw } from 'lucide-react';
import { useAuth } from '@/features/auth';
import type { CustomerInput } from '@/features/cart/contracts';
import { iranProvinces } from '@/features/cart/constants/iran-provinces';
import { addressesSchema } from '../contracts';
import { useAccountQuery } from '../hooks/use-user-panel';

export function CheckoutSavedAddresses({
  busy,
  onSelect,
}: {
  busy: boolean;
  onSelect: (address: CustomerInput['billing_address']) => void;
}) {
  const auth = useAuth();
  const query = useAccountQuery(
    'addresses',
    addressesSchema,
    auth.isAuthenticated,
  );
  if (
    !auth.isAuthenticated ||
    query.isPending ||
    (!query.error && !query.data.addresses.length)
  )
    return null;
  if (query.error)
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs leading-7 text-gray-500">
        دریافت آدرس‌های ذخیره‌شده ممکن نشد. می‌توانید فرم زیر را کامل کنید.
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mr-3 inline-flex items-center gap-1 font-bold text-cyan-700"
        >
          <RefreshCw className="size-3" />
          تلاش دوباره
        </button>
      </div>
    );
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="size-4 text-orange-600" />
          انتخاب از آدرس‌های من
        </h2>
        <Link
          href="/account/addresses"
          className="text-xs font-bold text-cyan-700"
        >
          مدیریت آدرس‌ها
        </Link>
      </div>
      <p className="mb-4 text-xs leading-7 text-gray-500">
        پس از انتخاب آدرس، اطلاعات گیرنده را در فرم زیر مرور و ذخیره کنید.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {query.data.addresses.map((address) => (
          <button
            type="button"
            key={address.id}
            disabled={busy}
            onClick={() => {
              const state =
                iranProvinces.find(
                  ([code, name]) =>
                    code === address.state || name === address.state,
                )?.[0] || '';
              onSelect({
                first_name: address.first_name,
                last_name: address.last_name,
                phone: address.phone,
                state,
                city: address.city,
                address_1: address.address,
                address_2: '',
                postcode: address.postcode,
                country: 'IR',
              });
            }}
            className="rounded-xl border border-gray-200 p-3 text-right transition hover:border-orange-400 hover:bg-orange-50/50 disabled:opacity-40"
          >
            <span className="text-xs font-bold text-gray-800">
              {address.title}
              {address.is_default && (
                <span className="mr-2 text-[10px] font-normal text-emerald-700">
                  پیش‌فرض
                </span>
              )}
            </span>
            <span className="mt-2 block line-clamp-2 text-[11px] leading-6 text-gray-500">
              {address.city}، {address.address}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

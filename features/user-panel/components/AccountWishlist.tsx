'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Package, Trash2 } from 'lucide-react';
import { favoriteProductsSchema } from '../contracts';
import { useAccountQuery, useAccountWrite } from '../hooks/use-user-panel';
import {
  AccountError,
  AccountLoading,
  EmptyState,
  glass,
  Pagination,
  secondaryClass,
  SectionTitle,
  accountMoney,
} from './AccountUI';

export function AccountWishlist({ page }: { page: number }) {
  const query = useAccountQuery(
    'wishlist/products?page=' + page,
    favoriteProductsSchema,
  );
  const remove = useAccountWrite();
  return (
    <>
      <SectionTitle
        title="علاقه‌مندی‌های من"
        subtitle="محصولاتی که برای بررسی و خرید بعدی ذخیره کرده‌اید."
      />
      {remove.error && (
        <div className="mb-4">
          <AccountError error={remove.error} />
        </div>
      )}
      {query.isPending ? (
        <AccountLoading />
      ) : query.error ? (
        <AccountError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data.items.length ? (
            <section className={glass}>
              <EmptyState
                icon={<Heart />}
                title="لیست علاقه‌مندی‌ها خالی است"
                description="با انتخاب علامت قلب در صفحه محصول، آن را برای بعد ذخیره کنید."
                action={
                  <Link href="/products" className={secondaryClass}>
                    مشاهده محصولات
                  </Link>
                }
              />
            </section>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {query.data.items.map((product) => (
                <article
                  key={product.id}
                  className={
                    glass +
                    ' group relative flex min-w-0 flex-col p-4 transition hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/30'
                  }
                >
                  <button
                    type="button"
                    disabled={remove.busy}
                    aria-label={'حذف از علاقه‌مندی‌ها: ' + product.name}
                    onClick={() =>
                      void remove
                        .submit('wishlist/' + product.id, 'DELETE')
                        .catch(() => {})
                    }
                    className="absolute left-4 top-4 z-10 flex size-9 items-center justify-center rounded-xl border border-white bg-white/85 text-rose-500 shadow-sm transition hover:bg-rose-50 disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <Link
                    href={product.path}
                    className="relative mb-4 mt-3 flex h-40 items-center justify-center rounded-2xl bg-white/60"
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(min-width:1280px) 250px,(min-width:640px) 40vw,85vw"
                        className="object-contain p-4 transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <Package className="size-14 text-gray-200" />
                    )}
                  </Link>
                  <span
                    className={
                      'mb-3 self-start rounded-full px-2.5 py-1 text-[10px] font-bold ' +
                      (product.inStock
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500')
                    }
                  >
                    {product.inStock ? 'موجود در فروشگاه' : 'فعلاً ناموجود'}
                  </span>
                  <Link
                    href={product.path}
                    className="mb-5 line-clamp-3 min-h-18 text-sm font-bold leading-6 text-gray-800"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-auto text-left text-sm font-black text-gray-900">
                    {Number(product.price) > 0
                      ? accountMoney(
                          product.price,
                          product.currency,
                          product.minorUnit,
                        )
                      : 'استعلام قیمت'}
                  </p>
                  <Link
                    href={product.path}
                    className={
                      secondaryClass +
                      ' mt-4 w-full border-orange-100 text-orange-700'
                    }
                  >
                    مشاهده محصول
                  </Link>
                </article>
              ))}
            </div>
          )}
          <Pagination
            page={page}
            pages={query.data.pages}
            base="/account/wishlist"
          />
        </>
      )}
    </>
  );
}

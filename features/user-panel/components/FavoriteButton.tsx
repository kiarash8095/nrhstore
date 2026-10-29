'use client';
import { useRef, useState } from 'react';
import { Heart, LoaderCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { getAuthIdentity, useAuth, useAuthActions } from '@/features/auth';
import { accountRequest } from '../api/user-panel.api';
import { wishlistSchema } from '../contracts';
import { useAccountQuery } from '../hooks/use-user-panel';

export function FavoriteButton({ productId }: { productId: number }) {
  const auth = useAuth();
  const { openAuth } = useAuthActions();
  const path = usePathname();
  const client = useQueryClient();
  const list = useAccountQuery(
    'wishlist',
    wishlistSchema,
    auth.isAuthenticated,
  );
  const selected = list.data?.ids.includes(productId) || false;
  const guard = useRef(false);
  const [notice, setNotice] = useState('');
  const write = useMutation({
    mutationKey: ['account-write'],
    scope: { id: 'account-writes' },
    retry: false,
    mutationFn: ({
      identity,
      remove,
    }: {
      identity: string;
      remove: boolean;
    }) => {
      if (getAuthIdentity() !== identity)
        throw new Error('حساب فعال تغییر کرده است.');
      return accountRequest(
        remove ? 'wishlist/' + productId : 'wishlist',
        wishlistSchema,
        {
          method: remove ? 'DELETE' : 'POST',
          body: remove ? undefined : { product_id: productId },
        },
      );
    },
    onSuccess: (data, submitted) => {
      if (getAuthIdentity() !== submitted.identity) return;
      client.setQueryData(['account', submitted.identity, 'wishlist'], data);
      void client.invalidateQueries({
        queryKey: ['account', submitted.identity, 'wishlist/products?page=1'],
      });
      setNotice(
        submitted.remove
          ? 'از علاقه‌مندی‌ها حذف شد.'
          : 'به علاقه‌مندی‌ها اضافه شد.',
      );
    },
    onSettled: () => {
      guard.current = false;
    },
  });
  const error = write.error || list.error;
  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={
          auth.isRestoring ||
          write.isPending ||
          (auth.isAuthenticated && list.isPending)
        }
        aria-pressed={selected}
        onClick={() => {
          if (!auth.isAuthenticated) {
            openAuth({ nextPath: path });
            return;
          }
          if (list.error) {
            void list.refetch();
            return;
          }
          if (guard.current) return;
          guard.current = true;
          setNotice('');
          write.mutate({ identity: auth.user!.id, remove: selected });
        }}
        className={
          'inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs transition disabled:opacity-40 ' +
          (selected
            ? 'border-rose-100 bg-rose-50 text-rose-600'
            : 'border-gray-200 bg-white text-gray-500 hover:border-orange-200 hover:text-orange-600')
        }
      >
        {write.isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Heart className={'size-4 ' + (selected ? 'fill-current' : '')} />
        )}
        {list.error
          ? 'تلاش دوباره برای علاقه‌مندی‌ها'
          : selected
            ? 'حذف از علاقه‌مندی‌ها'
            : 'افزودن به علاقه‌مندی‌ها'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs leading-6 text-red-600">
          {error.message}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs text-emerald-700">
          {notice}
        </p>
      )}
    </div>
  );
}

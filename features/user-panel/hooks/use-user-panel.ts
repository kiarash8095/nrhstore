'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { z } from 'zod';
import { getAuthIdentity, useAuth } from '@/features/auth';
import { accountRequest, AccountClientError } from '../api/user-panel.api';
import { okSchema } from '../contracts';

export function useAccountQuery<T>(
  path: string,
  schema: z.ZodType<T>,
  enabled = true,
) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const query = useQuery({
    queryKey: ['account', auth.user?.id || 'guest', path],
    queryFn: ({ signal }) => accountRequest(path, schema, { signal }),
    enabled: auth.isAuthenticated && enabled,
    staleTime: 20000,
    // Only order screens poll. An error stops polling; editable drafts never poll.
    refetchInterval: (query) =>
      path.startsWith('orders') && query.state.status === 'success'
        ? 30000
        : false,
    gcTime: 300000,
    retry: false,
  });
  useEffect(() => {
    if (query.error instanceof AccountClientError && query.error.status === 401)
      router.replace('/?auth=login&next=' + encodeURIComponent(pathname));
  }, [query.error, router, pathname]);
  return query;
}

export function useAccountWrite(onSuccess?: () => void | Promise<void>) {
  const auth = useAuth();
  const client = useQueryClient();
  const busy = useIsMutating({ mutationKey: ['account-write'] }) > 0;
  const mutation = useMutation({
    mutationKey: ['account-write'],
    scope: { id: 'account-writes' },
    retry: false,
    mutationFn: async ({
      path,
      method = 'POST',
      body,
      identity,
    }: {
      path: string;
      method?: string;
      body?: unknown;
      identity: string;
    }) => {
      if (getAuthIdentity() !== identity)
        throw new Error('حساب فعال تغییر کرده است.');
      return accountRequest(path, okSchema, { method, body });
    },
    onSuccess: async (_, submitted) => {
      if (getAuthIdentity() !== submitted.identity) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['account', submitted.identity] }),
        client.invalidateQueries({ queryKey: ['cart', submitted.identity] }),
      ]);
      await onSuccess?.();
    },
  });
  return {
    ...mutation,
    busy,
    submit: (path: string, method: string, body?: unknown) =>
      mutation.mutateAsync({
        path,
        method,
        body,
        identity: auth.user?.id || 'guest',
      }),
  };
}

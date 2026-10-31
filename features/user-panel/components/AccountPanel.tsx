'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMutating } from '@tanstack/react-query';
import { Dialog } from '@base-ui/react/dialog';
import {
  ChevronLeft,
  Headphones,
  Heart,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Package,
  Pencil,
  ShieldCheck,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useAuth, useAuthActions, type AuthUser } from '@/features/auth';
import { maskIranMobile } from '@/features/auth/contracts';
import logo from '@/public/nrh-header-desktop.png';
import type { AccountSection } from '../contracts';
import { AccountDashboard } from './AccountDashboard';
import { AccountOrders, AccountOrderDetails } from './AccountOrders';
import { AccountWishlist } from './AccountWishlist';
import { AccountAddresses } from './AccountAddresses';
import { AccountProfile } from './AccountProfile';
import { AccountSupport } from './AccountSupport';
import { AccountCart } from './AccountCart';
import {
  AccountError,
  AccountLoading,
  glass,
  secondaryClass,
} from './AccountUI';

const nav = [
  {
    key: 'dashboard',
    label: 'داشبورد',
    href: '/account',
    icon: LayoutDashboard,
  },
  { key: 'orders', label: 'سفارش‌ها', href: '/account/orders', icon: Package },
  { key: 'cart', label: 'سبد خرید', href: '/account/cart', icon: ShoppingBag },
  {
    key: 'wishlist',
    label: 'علاقه‌مندی‌ها',
    href: '/account/wishlist',
    icon: Heart,
  },
  {
    key: 'support',
    label: 'پشتیبانی',
    href: '/account/support',
    icon: Headphones,
  },
  {
    key: 'addresses',
    label: 'آدرس‌ها',
    href: '/account/addresses',
    icon: MapPin,
  },
] as const;

export function AccountPanel({
  initialUser,
  section,
  itemId,
  page,
}: {
  initialUser: AuthUser;
  section: AccountSection;
  itemId?: number;
  page: number;
}) {
  const auth = useAuth();
  const { logout } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutGuard = useRef(false);
  const writes = useIsMutating({ mutationKey: ['account-write'] });
  // Server validation grants initial rendering; a later logout/account switch
  // immediately hides all panel content, including forms from the old identity.
  const sameAccount =
    auth.status === 'unknown' ||
    (auth.isAuthenticated && auth.user?.id === initialUser.id);
  const user = auth.user?.id === initialUser.id ? auth.user : initialUser;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    'کاربر نوین رایانه';
  const firstName =
    user.firstName && !/^\d+$/.test(user.firstName)
      ? user.firstName
      : 'همراه عزیز';
  const email =
    user.email && !/@mobile\.local$/i.test(user.email) ? user.email : '';
  useEffect(() => {
    if (auth.status === 'unauthenticated' && !loggingOut)
      router.replace('/?auth=login&next=' + encodeURIComponent(pathname));
    else if (!sameAccount) router.refresh();
  }, [auth.status, sameAccount, router, pathname, loggingOut]);
  useEffect(() => {
    document
      .querySelector<HTMLElement>('[data-account-heading]')
      ?.focus({ preventScroll: true });
  }, [pathname]);
  async function leave() {
    if (logoutGuard.current || writes) return;
    logoutGuard.current = true;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Discard private prefetched RSC payloads and old-page memory on logout.
      window.location.assign('/');
    } catch {
      setLogoutError('خروج انجام نشد. دوباره تلاش کنید.');
      logoutGuard.current = false;
      setLoggingOut(false);
    }
  }
  if (!sameAccount)
    return (
      <div className="mx-auto my-10 w-[92%] max-w-5xl">
        <AccountLoading />
      </div>
    );
  return (
    <div className="relative isolate min-h-[calc(100dvh-1px)] w-full overflow-x-clip bg-[#f5f6f9] pb-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[650px] bg-[radial-gradient(ellipse_at_85%_0%,rgba(255,222,193,0.38),transparent_55%),radial-gradient(ellipse_at_5%_45%,rgba(221,231,244,0.4),transparent_55%)]"
      />
      <header className="sticky top-0 z-30 border-b border-white/90 bg-white/70 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-20 w-[92%] max-w-7xl items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              aria-label="صفحه اصلی نوین رایانه همدان"
              className="block w-32 shrink-0 sm:w-40"
            >
              <Image
                src={logo}
                alt="نوین رایانه همدان"
                className="h-auto w-full"
                loading="eager"
              />
            </Link>
            <span className="hidden border-r border-gray-200 pr-4 text-xs text-gray-500 sm:block">
              حساب کاربری
            </span>
          </div>
          <Link
            href="/products"
            className={
              secondaryClass + ' min-h-10 bg-white/60 px-3 text-[11px]'
            }
          >
            <Store className="size-4" />
            بازگشت به فروشگاه
          </Link>
        </div>
      </header>
      <div className="mx-auto mt-6 grid w-[92%] max-w-7xl items-start gap-6 lg:mt-9 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-7">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-28">
          <Link
            href="/account/profile"
            aria-label="مشاهده و ویرایش پروفایل"
            aria-current={section === 'profile' ? 'page' : undefined}
            className={
              'group relative flex items-center gap-3 overflow-hidden rounded-3xl border p-5 text-white shadow-lg shadow-gray-900/10 lg:flex-wrap lg:gap-y-4 lg:p-6 ' +
              (section === 'profile'
                ? 'border-orange-400'
                : 'border-white/20') +
              ' bg-[radial-gradient(ellipse_at_100%_0%,#82401c_0%,#2d201c_38%,#17191f_80%)]'
            }
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-4 border-white/15 bg-gradient-to-br from-orange-400 to-orange-600 text-xl font-black shadow-lg">
              {fullName.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold leading-7">
                {fullName}
              </span>
              <span
                dir="ltr"
                className="mt-1 block truncate text-right text-[11px] text-white/60"
              >
                {user.phone ? maskIranMobile(user.phone) : email}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-white/75 transition group-hover:text-orange-200 lg:w-full lg:border-t lg:border-white/10 lg:pt-3">
              <Pencil className="size-3.5" />
              <span className="hidden sm:inline">مشاهده و ویرایش پروفایل</span>
              <ChevronLeft className="mr-auto hidden size-3.5 lg:block" />
            </span>
          </Link>
          <nav
            aria-label="بخش‌های حساب کاربری"
            className={glass + ' p-2.5 lg:p-3'}
          >
            <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
              {nav.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={section === item.key ? 'page' : undefined}
                  className={
                    'flex min-h-12 shrink-0 items-center gap-2 rounded-2xl px-3 text-xs transition lg:min-h-14 lg:gap-3 lg:px-4 ' +
                    (section === item.key
                      ? 'bg-orange-100/65 font-bold text-orange-700 shadow-[inset_0_1px_0_#fff]'
                      : 'text-gray-500 hover:bg-white/80 hover:text-gray-900')
                  }
                >
                  <span
                    className={
                      'flex size-8 shrink-0 items-center justify-center rounded-xl ' +
                      (section === item.key
                        ? 'bg-white/90 text-orange-600 shadow-sm'
                        : 'bg-gray-100/65 text-gray-500')
                    }
                  >
                    <item.icon className="size-4" />
                  </span>
                  {item.label}
                  {section === item.key && (
                    <span
                      aria-hidden="true"
                      className="mr-auto hidden size-1.5 rounded-full bg-orange-500 lg:block"
                    />
                  )}
                </Link>
              ))}
              <div className="shrink-0 lg:mt-3 lg:border-t lg:border-gray-100 lg:pt-3">
                <button
                  type="button"
                  disabled={loggingOut || writes > 0}
                  onClick={() => {
                    setLogoutError('');
                    setConfirmLogout(true);
                  }}
                  className="flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 text-xs font-bold text-red-500 transition hover:bg-red-50/80 disabled:opacity-40 lg:min-h-14 lg:gap-3 lg:px-4"
                >
                  <span className="flex size-8 items-center justify-center rounded-xl bg-red-50">
                    <LogOut className="size-4" />
                  </span>
                  خروج از حساب
                </button>
              </div>
            </div>
          </nav>
          <p className="hidden items-start gap-2 px-4 text-[10px] leading-6 text-gray-400 lg:flex">
            <ShieldCheck className="mt-1 size-3.5 shrink-0" />
            اطلاعات حساب شما فقط با ورود به همین حساب در دسترس است.
          </p>
        </aside>
        <main className="min-w-0 pb-6">
          {section === 'dashboard' && <AccountDashboard name={firstName} />}
          {section === 'cart' && <AccountCart />}
          {section === 'orders' &&
            (itemId ? (
              <AccountOrderDetails id={itemId} />
            ) : (
              <AccountOrders page={page} />
            ))}
          {section === 'wishlist' && <AccountWishlist page={page} />}
          {section === 'support' && <AccountSupport />}
          {section === 'addresses' && <AccountAddresses />}
          {section === 'profile' && <AccountProfile user={user} />}
          <p className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-400">
            نوین رایانه همدان<span aria-hidden="true">·</span>همراه شما در
            انتخاب و خرید
          </p>
        </main>
      </div>
      <Dialog.Root
        open={confirmLogout}
        onOpenChange={(open) => {
          if (!loggingOut) setConfirmLogout(open);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-gray-950/30 backdrop-blur-sm" />
          <Dialog.Popup
            dir="rtl"
            className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white bg-white/95 p-6 shadow-xl outline-none"
          >
            <span className="mb-5 inline-flex rounded-2xl bg-red-50 p-3 text-red-500">
              <LogOut className="size-6" />
            </span>
            <Dialog.Title className="font-bold text-gray-900">
              از حساب خود خارج می‌شوید؟
            </Dialog.Title>
            <Dialog.Description className="mt-3 text-sm leading-8 text-gray-500">
              برای مشاهده سفارش‌ها و اطلاعات حساب، می‌توانید دوباره وارد شوید.
            </Dialog.Description>
            {logoutError && (
              <div className="mt-3">
                <AccountError error={new Error(logoutError)} />
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={loggingOut || writes > 0}
                onClick={() => void leave()}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-40"
              >
                {loggingOut && <LoaderCircle className="size-4 animate-spin" />}
                بله، خروج از حساب
              </button>
              <Dialog.Close
                disabled={loggingOut}
                className={secondaryClass + ' flex-1'}
              >
                انصراف
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'حساب کاربری', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export { UserPanelPage as default } from '@/features/user-panel/server';

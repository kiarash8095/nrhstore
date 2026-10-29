import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/server';
import { parsePage } from '@/lib/urls';
import { accountSections, type AccountSection } from '../contracts';
import { AccountPanel } from './AccountPanel';

export async function UserPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const parts = (await params).section || [];
  const section = parts[0] || 'dashboard';
  if (
    !accountSections.includes(section as AccountSection) ||
    parts.length > 2 ||
    (parts.length === 2 &&
      (section !== 'orders' || !/^[1-9]\d{0,13}$/.test(parts[1])))
  )
    notFound();
  const page = parsePage((await searchParams).page);
  if (page === null || page > 9999) notFound();
  const next =
    '/account' +
    (parts.length ? '/' + parts.join('/') : '') +
    (page > 1 ? '?page=' + page : '');
  const user = await requireUser(next);
  return (
    <AccountPanel
      key={user.id}
      initialUser={user}
      section={section as AccountSection}
      itemId={parts[1] ? Number(parts[1]) : undefined}
      page={page}
    />
  );
}

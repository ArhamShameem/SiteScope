'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { getInitials } from '@/components/report-ui';
import { useOutsideClick } from '@/components/use-outside-click';

const HIDDEN_ROUTES = new Set(['/login', '/signup']);

function navLinkClass(isActive: boolean) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
      : 'text-slate-600 hover:bg-white hover:text-slate-950'
  }`;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout, updateUser } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsProfileOpen(false);
  }, [pathname]);

  useOutsideClick(profileMenuRef, () => setIsProfileOpen(false), isProfileOpen);

  if (HIDDEN_ROUTES.has(pathname) || !user || isLoading) {
    return null;
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    setIsUploadingAvatar(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/profile/avatar`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to upload profile image.');
      }

      updateUser(data.user);
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-[rgba(248,250,252,0.84)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-950"
          >
            SiteScope
          </Link>

          <nav className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 p-1.5">
            <Link href="/" className={navLinkClass(pathname === '/')}>
              Dashboard
            </Link>
            <Link
              href="/history"
              className={navLinkClass(pathname === '/history')}
            >
              History
            </Link>
          </nav>
        </div>

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((current) => !current)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition hover:border-slate-300"
            aria-label="Open profile menu"
          >
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name}
                width={48}
                height={48}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                {getInitials(user.name)}
              </div>
            )}
          </button>

          {isProfileOpen ? (
            <div className="absolute right-0 top-[calc(100%+1rem)] w-[22rem] rounded-[1.75rem] border border-slate-200 bg-white p-5 text-black shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={72}
                    height={72}
                    className="h-[4.5rem] w-[4.5rem] rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-xl font-semibold text-white">
                    {getInitials(user.name)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Profile
                  </p>
                  <h3 className="mt-2 truncate text-xl font-semibold text-slate-950">
                    {user.name}
                  </h3>
                  <p className="mt-1 truncate text-sm text-slate-700">
                    {user.email}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {user.provider} account
                  </p>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-950">
                  Profile image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingAvatar}
                  onChange={(event) => void handleAvatarUpload(event)}
                  className="mt-2 block w-full text-sm text-slate-800 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="mt-5 w-full bg-red-900 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

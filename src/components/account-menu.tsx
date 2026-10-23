"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { GoogleMark } from "./google-mark";

/** 헤더 오른쪽: 프로필, 로그인·로그아웃. admin이면 관리자 페이지 링크도 보여 준다. */
export function AccountMenu({ admin = false }: { admin?: boolean }) {
  const { user, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (user === undefined) return <span className="h-9 w-20 animate-pulse rounded-full bg-surface-2" aria-hidden />;

  if (!user) {
    return (
      <button
        onClick={() => signIn("/")}
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold shadow-card hover:border-accent"
      >
        <GoogleMark className="h-4 w-4" />
        로그인
      </button>
    );
  }

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "내 계정";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-ink text-sm font-bold text-white ring-2 ring-surface"
        aria-label="계정 메뉴"
        aria-expanded={open}
      >
        {avatar ? (
          // 구글 프로필 사진 (외부 주소라 next/image 대신 img 사용)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-line bg-surface p-3 shadow-card">
          <p className="truncate text-sm font-semibold">{name}</p>
          {user.email && <p className="truncate text-xs text-muted">{user.email}</p>}
          {admin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="mt-3 block w-full rounded-xl bg-accent-soft py-2 text-center text-sm font-semibold text-accent hover:bg-accent hover:text-white"
            >
              관리자 페이지
            </Link>
          )}
          <button
            onClick={signOut}
            className="mt-3 w-full rounded-xl border border-line py-2 text-sm font-semibold hover:border-danger hover:text-danger"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

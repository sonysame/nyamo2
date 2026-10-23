import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/components/auth-provider";
import { AccountMenu } from "@/components/account-menu";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepeatUp · 영상 속 핵심 표현을 카드로",
  description: "라이브 아카데미 영상의 영어 문장을 핵심 카드로 모아 봐요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* 한글 글꼴 Pretendard (CDN, 필요한 글자 조각만 받는다) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-black text-mark">R</span>
                <span className="text-[17px] font-black tracking-tight">RepeatUp</span>
              </Link>
              <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
                <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-surface-2">
                  홈
                </Link>
                <Link href="/cards" className="rounded-full px-3 py-1.5 hover:bg-surface-2">
                  핵심 카드
                </Link>
              </nav>
              <AccountMenu />
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

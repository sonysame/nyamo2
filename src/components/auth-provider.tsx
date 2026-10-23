"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AuthState = {
  /** undefined: 아직 확인 중, null: 로그인 안 함 */
  user: User | null | undefined;
  signIn: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider 안에서만 쓸 수 있어요.");
  return ctx;
}

/** 로그인 상태를 화면 전체에서 함께 쓴다 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const auth = supabaseBrowser().auth;
    auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (next?: string) => {
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : window.location.pathname;
    await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}` },
    });
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  // 로그아웃 후 서버 화면을 다시 그린다. 홈에서 router.push("/")를 같이 부르면 새로 그리기가 묻혀서
  // 로그인했을 때의 홈 화면이 남아 있었다.
  const signOut = useCallback(async () => {
    await supabaseBrowser().auth.signOut();
    if (pathname === "/") router.refresh();
    else router.replace("/");
  }, [router, pathname]);

  return <AuthContext value={{ user, signIn, signOut }}>{children}</AuthContext>;
}

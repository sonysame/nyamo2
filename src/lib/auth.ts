import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

/** 요청 쿠키에 담긴 로그인 세션으로 Supabase에 접속하는 클라이언트 (사용자 확인용) */
export async function supabaseSession() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // 서버 컴포넌트처럼 쿠키를 쓸 수 없는 곳에서는 proxy.ts가 세션을 새로 고친다
        }
      },
    },
  });
}

/** 로그인한 사용자. 없으면 null */
export async function currentUser(): Promise<User | null> {
  const { data } = await (await supabaseSession()).auth.getUser();
  return data.user ?? null;
}

export const unauthorized = () => Response.json({ error: "로그인이 필요해요." }, { status: 401 });

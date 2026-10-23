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

/** 관리자 이메일 목록: 환경 변수 ADMIN_EMAILS에 쉼표로 적는다 (예: a@gmail.com,b@gmail.com) */
export function isAdmin(user: User | null) {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!user?.email && list.includes(user.email.toLowerCase());
}

/** 관리자 API 입구: 관리자가 아니면 돌려보낼 응답을, 맞으면 null을 준다 */
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return Response.json({ error: "관리자만 할 수 있어요." }, { status: 403 });
  return null;
}

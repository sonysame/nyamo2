import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// 브라우저에서는 구글 로그인/로그아웃에만 쓴다. 세션은 쿠키에 저장돼서 서버도 같은 세션을 읽는다.
export function supabaseBrowser(): SupabaseClient {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}

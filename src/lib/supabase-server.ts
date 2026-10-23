import "server-only";
import { createClient } from "@supabase/supabase-js";

// DB는 서버에서 secret key로만 접근한다. 표는 RLS가 켜져 있고 정책이 없어서 브라우저 키로는 읽을 수 없다.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 환경 변수가 없습니다.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

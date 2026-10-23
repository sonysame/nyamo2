import "server-only";
import { supabaseAdmin } from "./supabase-server";
import { startOfQuotaDay } from "./day";
import type { Attempt } from "./gemini";

/** 앱 전체가 하루에 Gemini를 부를 수 있는 횟수 (무료 등급 하루 한도보다 조금 적게) */
export const DAILY_LIMIT = Number(process.env.DAILY_GENERATE_LIMIT) || 400;
/** 한 사람이 하루에 새 핵심 카드를 만들 수 있는 횟수 */
export const USER_DAILY_LIMIT = Number(process.env.USER_DAILY_LIMIT) || 10;

export type Usage = { app: number; appLimit: number; me: number; meLimit: number };

/** 오늘(태평양 시간 자정부터) 앱 전체와 이 사용자의 Gemini 시도 횟수. 실패와 재시도도 센다. */
export async function todayUsage(userId: string): Promise<Usage> {
  const db = supabaseAdmin();
  const since = startOfQuotaDay().toISOString();
  const [app, me] = await Promise.all([
    db.from("gemini_log").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("gemini_log").select("id", { count: "exact", head: true }).gte("created_at", since).eq("user_id", userId),
  ]);
  return { app: app.count ?? 0, appLimit: DAILY_LIMIT, me: me.count ?? 0, meLimit: USER_DAILY_LIMIT };
}

/** Gemini 시도 한 번을 남긴다. 기록이 실패해도 본래 작업은 계속한다. */
export async function logAttempt(model: string, userId: string, videoId: string, a: Attempt) {
  const { error } = await supabaseAdmin().from("gemini_log").insert({
    user_id: userId,
    video_id: videoId,
    model,
    status: a.status,
    message: a.message ?? null,
    input_tokens: a.input ?? null,
    output_tokens: a.output ?? null,
  });
  if (error) console.error("Gemini 기록 실패:", error.message);
  if (a.status !== "ok") console.error(`[gemini ${videoId}] ${a.status}: ${a.message}`);
}

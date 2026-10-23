import "server-only";
import { supabaseAdmin } from "./supabase-server";
import { startOfQuotaDay } from "./day";
import type { Attempt } from "./gemini";

/** 앱 전체가 하루에 Gemini를 부를 수 있는 횟수 (무료 등급 하루 한도보다 조금 적게) */
export const DAILY_LIMIT = Number(process.env.DAILY_GENERATE_LIMIT) || 400;

/** 오늘(태평양 시간 자정부터) 앱 전체의 Gemini 시도 횟수. 실패와 재시도도 센다. */
export async function todayAppUsage(): Promise<number> {
  const { count } = await supabaseAdmin()
    .from("gemini_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfQuotaDay().toISOString());
  return count ?? 0;
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

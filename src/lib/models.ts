import "server-only";
import { supabaseAdmin } from "./supabase-server.ts";

/** 핵심 카드를 만드는 모델의 기본값 (관리자 페이지에서 고른 게 없고 환경 변수도 없을 때) */
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const SETTING_KEY = "model.card";

// 매번 DB를 읽지 않도록 잠깐 기억해 둔다 (관리자가 바꾸면 길어도 30초 안에 반영)
let cache: { at: number; value: string } | null = null;
const CACHE_MS = 30_000;

/** 지금 쓸 모델: 관리자 페이지 설정(DB) → 환경 변수 GEMINI_MODEL → 기본값 순서 */
export async function getModel(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const fallback = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const { data, error } = await supabaseAdmin().from("app_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
  // 설정 표가 아직 없으면(SQL 실행 전) 환경 변수·기본값으로 동작한다
  const value = !error && data?.value ? data.value : fallback;
  cache = { at: Date.now(), value };
  return value;
}

export async function setModel(model: string) {
  const { error } = await supabaseAdmin()
    .from("app_settings")
    .upsert({ key: SETTING_KEY, value: model, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  cache = null;
}

/** 관리자 화면에서 고를 수 있는 모델: Gemini가 실제로 제공하는 flash·pro 모델 (10분 동안 기억) */
let optionsCache: { at: number; value: string[] } | null = null;
export async function modelOptions(): Promise<string[]> {
  if (optionsCache && Date.now() - optionsCache.at < 600_000) return optionsCache.value;
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
  }).catch(() => null);
  const names: string[] = res?.ok
    ? ((await res.json()).models ?? []).map((m: { name: string }) => m.name.replace(/^models\//, ""))
    : [];
  const value = names.filter(
    (n) => /^gemini-.*(flash|pro)/.test(n) && !/(tts|image|live|audio|embedding|robotics|transcribe)/.test(n),
  );
  // 목록을 못 받아 와도 기본값은 고를 수 있게
  if (!value.includes(DEFAULT_MODEL)) value.unshift(DEFAULT_MODEL);
  optionsCache = { at: Date.now(), value };
  return value;
}

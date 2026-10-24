import "server-only";
import { supabaseAdmin } from "./supabase-server";
import type { Deck, DeckContent } from "./types";

const DECK_COLUMNS = "video_id, title, author, thumbnail_url, status, content, error";

export async function getDeck(videoId: string): Promise<(Deck & { started_at: string; created_at: string }) | null> {
  const { data } = await supabaseAdmin()
    .from("decks")
    .select(`${DECK_COLUMNS}, started_at, created_at`)
    .eq("video_id", videoId)
    .maybeSingle();
  return data;
}

/** 정리가 끝난 모든 영상 (홈의 채널 전체 목록에서 '보기/정리하기'를 정하려고) */
export async function readyVideoIds(): Promise<string[]> {
  const { data } = await supabaseAdmin().from("decks").select("video_id").eq("status", "ready");
  return (data ?? []).map((d) => d.video_id);
}

/** made_at: 핵심 카드를 만든 날짜 (decks.created_at), stars: 내가 누른 별 개수 (0~3) */
export type MyDeck = Pick<Deck, "video_id" | "title"> & {
  content: DeckContent;
  last_opened_at: string;
  made_at: string;
  stars: number;
};

/** 내가 연 핵심 카드, 최근에 연 순서 */
export async function myDecks(userId: string): Promise<MyDeck[]> {
  const query = (columns: string) =>
    supabaseAdmin()
      .from("user_decks")
      .select(`${columns}, decks!inner(video_id, title, status, content, created_at)`)
      .eq("user_id", userId)
      .eq("decks.status", "ready")
      .order("last_opened_at", { ascending: false });
  let res = await query("last_opened_at, stars");
  // 별 칸(migrations/002_stars.sql)을 아직 안 만들었으면 별 없이 읽는다
  if (res.error) res = await query("last_opened_at");
  type Row = { last_opened_at: string; stars?: number; decks: Deck & { content: DeckContent; created_at: string } };
  return ((res.data ?? []) as unknown as Row[]).map((r) => ({
    video_id: r.decks.video_id,
    title: r.decks.title,
    content: r.decks.content,
    last_opened_at: r.last_opened_at,
    made_at: r.decks.created_at,
    stars: r.stars ?? 0,
  }));
}

/** 이 카드에 내가 누른 별 개수 (없거나 별 칸이 아직 없으면 0) */
export async function myStars(userId: string, videoId: string): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("user_decks")
    .select("stars")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .maybeSingle();
  return error ? 0 : (data?.stars ?? 0);
}

/** 별 개수 저장 (0~3). 별 칸이 없으면 오류를 던진다. */
export async function setStars(userId: string, videoId: string, stars: number) {
  const { error } = await supabaseAdmin()
    .from("user_decks")
    .upsert({ user_id: userId, video_id: videoId, stars }, { onConflict: "user_id,video_id" });
  if (error) throw new Error(error.message);
}

/** 핵심 카드를 열면 내 목록에 넣는다 (본 영상으로 표시된다) */
export async function markOpened(userId: string, videoId: string) {
  const { error } = await supabaseAdmin()
    .from("user_decks")
    .upsert({ user_id: userId, video_id: videoId, last_opened_at: new Date().toISOString() });
  if (error) console.error("내 핵심 카드 저장 실패:", error.message);
}

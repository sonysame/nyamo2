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

/** made_at: 핵심 카드를 만든 날짜 (decks.created_at) */
export type MyDeck = Pick<Deck, "video_id" | "title"> & { content: DeckContent; last_opened_at: string; made_at: string };

/** 내가 연 핵심 카드, 최근에 연 순서 */
export async function myDecks(userId: string): Promise<MyDeck[]> {
  const { data } = await supabaseAdmin()
    .from("user_decks")
    .select("last_opened_at, decks!inner(video_id, title, status, content, created_at)")
    .eq("user_id", userId)
    .eq("decks.status", "ready")
    .order("last_opened_at", { ascending: false });
  type Row = { last_opened_at: string; decks: Deck & { content: DeckContent; created_at: string } };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    video_id: r.decks.video_id,
    title: r.decks.title,
    content: r.decks.content,
    last_opened_at: r.last_opened_at,
    made_at: r.decks.created_at,
  }));
}

/** 핵심 카드를 열면 내 목록에 넣는다 (본 영상으로 표시된다) */
export async function markOpened(userId: string, videoId: string) {
  const { error } = await supabaseAdmin()
    .from("user_decks")
    .upsert({ user_id: userId, video_id: videoId, last_opened_at: new Date().toISOString() });
  if (error) console.error("내 핵심 카드 저장 실패:", error.message);
}

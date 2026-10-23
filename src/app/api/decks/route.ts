import { currentUser, unauthorized } from "@/lib/auth";
import { getDeck } from "@/lib/data";
import { GEMINI_MODEL, GeminiError, generateDeck } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-server";
import { logAttempt, todayUsage } from "@/lib/usage";
import { fetchComments, fetchVideoInfo, parseVideoId } from "@/lib/youtube";

// Vercel Hobby 함수 최대 시간. Gemini 호출은 240초에 끊는다.
export const maxDuration = 300;

// 이 시간이 지나도록 '만드는 중'이면 함수가 강제로 끊긴 것으로 보고 다시 만든다
const STALE_MS = 5 * 60_000;

const fail = (error: string, status: number) => Response.json({ error }, { status });

/**
 * 영상 URL로 핵심 카드를 만든다. 이미 있으면 Gemini를 부르지 않고 바로 돌려준다.
 * 응답: { videoId, status: "ready" | "processing" } 또는 { error }
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  const videoId = parseVideoId(url ?? "");
  if (!videoId) return fail("올바른 유튜브 영상 주소가 아니에요.", 400);

  const existing = await getDeck(videoId);
  const stale = existing?.status === "processing" && Date.now() - new Date(existing.started_at).getTime() > STALE_MS;
  if (existing?.status === "ready") return Response.json({ videoId, status: "ready" });
  if (existing?.status === "processing" && !stale) return Response.json({ videoId, status: "processing" }, { status: 202 });

  const info = await fetchVideoInfo(videoId).catch(() => null);
  if (!info) return fail("영상을 찾을 수 없어요. 비공개이거나 삭제된 영상일 수 있어요.", 404);
  if (!info.isChannel) return fail("라이브 아카데미(@LVACDMY) 채널 영상만 핵심 카드로 만들 수 있어요.", 400);

  const usage = await todayUsage(user.id);
  if (usage.app >= usage.appLimit) return fail("오늘 앱 전체 생성 한도를 다 썼어요. 한국 시간 오후 4~5시에 다시 채워져요.", 429);
  if (usage.me >= usage.meLimit) return fail(`하루에 ${usage.meLimit}번까지 만들 수 있어요. 내일 다시 시도해 주세요.`, 429);

  // 만드는 중 표시를 먼저 걸어서, 다른 사람이 같은 영상을 동시에 요청해도 Gemini를 두 번 부르지 않게 한다
  const db = supabaseAdmin();
  const row = {
    video_id: videoId,
    title: info.title,
    author: info.author,
    thumbnail_url: info.thumbnail,
    status: "processing",
    error: null,
    created_by: user.id,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    // 실패했거나 멈춘 것을 다시 만든다. 그사이 다른 요청이 먼저 잡았으면(started_at이 바뀌었으면) 양보한다.
    const { data } = await db
      .from("decks")
      .update(row)
      .eq("video_id", videoId)
      .eq("started_at", existing.started_at)
      .select("video_id");
    if (!data?.length) return Response.json({ videoId, status: "processing" }, { status: 202 });
  } else {
    const { error } = await db.from("decks").insert(row);
    if (error) {
      // 같은 영상을 다른 요청이 방금 먼저 넣은 경우
      if (error.code === "23505") return Response.json({ videoId, status: "processing" }, { status: 202 });
      return fail(`저장하지 못했어요: ${error.message}`, 500);
    }
  }

  try {
    // 댓글은 영상 속 문장의 철자 확인용 참고 자료 (저장하지 않는다)
    const comments = await fetchComments(videoId);
    const content = await generateDeck(videoId, comments, (a) => logAttempt(GEMINI_MODEL, user.id, videoId, a));
    await db
      .from("decks")
      .update({ status: "ready", content, model: GEMINI_MODEL, updated_at: new Date().toISOString() })
      .eq("video_id", videoId);
    return Response.json({ videoId, status: "ready" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[decks ${videoId}]`, err);
    await db
      .from("decks")
      .update({ status: "failed", error: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("video_id", videoId);
    const status = err instanceof GeminiError && err.kind !== "other" ? (err.kind === "busy" ? 503 : 429) : 500;
    return fail(message, status);
  }
}

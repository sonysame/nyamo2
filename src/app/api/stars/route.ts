import { currentUser, unauthorized } from "@/lib/auth";
import { getDeck, setStars } from "@/lib/data";

/** 핵심 카드에 별 누르기: { videoId, stars(0~3) }. 계정마다 따로 저장한다. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { videoId, stars } = (await request.json().catch(() => ({}))) as { videoId?: string; stars?: number };
  if (!videoId || !Number.isInteger(stars) || stars! < 0 || stars! > 3) {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  if ((await getDeck(videoId))?.status !== "ready") return Response.json({ error: "핵심 카드가 없어요." }, { status: 404 });
  try {
    await setStars(user.id, videoId, stars!);
  } catch (err) {
    return Response.json(
      { error: `별을 저장하지 못했어요. supabase/migrations/002_stars.sql을 실행했는지 확인해 주세요. (${(err as Error).message})` },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, stars });
}

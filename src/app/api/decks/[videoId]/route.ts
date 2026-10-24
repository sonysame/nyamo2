import { currentUser, unauthorized } from "@/lib/auth";
import { getDeck, myStars } from "@/lib/data";

/**
 * 핵심 카드 상태. 다른 사람이 만드는 중인 카드를 기다릴 때 쓰고,
 * 다 만들어졌으면 홈 목록에서 카드를 바로 띄울 수 있게 내용도 함께 준다.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/decks/[videoId]">) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { videoId } = await ctx.params;
  const deck = await getDeck(videoId);
  if (!deck) return Response.json({ error: "핵심 카드가 없어요." }, { status: 404 });
  if (deck.status !== "ready") return Response.json({ status: deck.status, error: deck.error });
  return Response.json({
    status: deck.status,
    deck: {
      video_id: deck.video_id,
      title: deck.title,
      content: deck.content,
      created_at: deck.created_at,
      stars: await myStars(user.id, videoId),
    },
  });
}

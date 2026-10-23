import { currentUser, unauthorized } from "@/lib/auth";
import { getDeck } from "@/lib/data";

/** 다른 사람이 만드는 중인 핵심 카드를 기다릴 때 상태를 확인한다 */
export async function GET(_request: Request, ctx: RouteContext<"/api/decks/[videoId]">) {
  if (!(await currentUser())) return unauthorized();
  const { videoId } = await ctx.params;
  const deck = await getDeck(videoId);
  if (!deck) return Response.json({ error: "핵심 카드가 없어요." }, { status: 404 });
  return Response.json({ status: deck.status, error: deck.error });
}

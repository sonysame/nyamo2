import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { myDecks } from "@/lib/data";
import { fetchChannelVideos } from "@/lib/youtube";
import { CardGrid } from "@/components/card-grid";

/** 내가 정리한 영상의 핵심 카드를 채널 업로드 순서(오래된 것부터)로 모아 본다 */
export default async function CardsPage() {
  const user = await currentUser();
  if (!user) redirect("/?next=/cards");
  const [decks, videos] = await Promise.all([myDecks(user.id), fetchChannelVideos()]);

  // 채널 목록에서 몇 번째 영상인지. 목록에 없으면(키가 없거나 목록이 늦게 갱신되면) 맨 뒤에 최근에 연 순으로 둔다
  const order = new Map((videos ?? []).map((v, i) => [v.id, i + 1]));
  const sorted = [...decks].sort(
    (a, b) => (order.get(a.video_id) ?? Infinity) - (order.get(b.video_id) ?? Infinity),
  );

  return (
    <div>
      <h1 className="text-2xl font-black">
        핵심 카드 <span className="text-base font-semibold text-muted">{decks.length}개 · 오래된 영상부터</span>
      </h1>
      {sorted.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          아직 정리한 영상이 없어요.{" "}
          <Link href="/" className="font-semibold text-accent underline">
            홈에서 영상을 골라 정리해 보세요.
          </Link>
        </p>
      ) : (
        <div className="mt-4">
          <CardGrid decks={sorted.map((d) => ({ ...d, n: order.get(d.video_id) }))} />
        </div>
      )}
    </div>
  );
}

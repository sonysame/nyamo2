import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { myDecks, readyVideoIds } from "@/lib/data";
import { fetchChannelVideos } from "@/lib/youtube";
import { CreatePanel } from "@/components/create-panel";
import { LoginHero } from "@/components/login-hero";
import { CardGrid } from "@/components/card-grid";

/** 한국 날짜로 (예: 2026-10-24). 서버에서 만들어 넘겨서 브라우저 시간대와 상관없이 같게 보인다 */
const koreanDate = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await currentUser();
  const params = await searchParams;
  if (!user) {
    const next = typeof params.next === "string" ? params.next : undefined;
    return <LoginHero next={next} error={params.login === "error"} />;
  }

  const [videos, ready, decks] = await Promise.all([
    fetchChannelVideos(),
    readyVideoIds(),
    myDecks(user.id),
  ]);
  // 채널 전체에서 몇 번째 영상인지 (목록이 없거나 못 찾으면 표시하지 않는다)
  const channelNumber = (id: string) => {
    const i = videos?.findIndex((v) => v.id === id) ?? -1;
    return i >= 0 ? i + 1 : undefined;
  };

  return (
    <div className="space-y-10">
      {decks[0] && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-2">
            <h2 className="text-lg font-black">최근 핵심 카드</h2>
            <Link href="/cards" className="text-sm font-semibold text-accent hover:underline">
              핵심 카드 전체 보기 ({decks.length}개) →
            </Link>
          </div>
          {/* 최근에 연 4개 */}
          <CardGrid decks={decks.slice(0, 4).map((d) => ({ ...d, n: channelNumber(d.video_id) }))} />
        </section>
      )}

      <CreatePanel videos={videos} ready={ready} mine={Object.fromEntries(decks.map((d) => [d.video_id, koreanDate(d.made_at)]))} />
    </div>
  );
}

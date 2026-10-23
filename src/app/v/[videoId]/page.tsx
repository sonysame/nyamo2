import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getDeck, markOpened } from "@/lib/data";
import { koreanDate } from "@/lib/day";
import type { DeckContent } from "@/lib/types";
import { CardNews } from "@/components/card-news";
import { DeckPending } from "@/components/deck-pending";

export default async function DeckPage({ params }: PageProps<"/v/[videoId]">) {
  const { videoId } = await params;
  const [user, deck] = await Promise.all([currentUser(), getDeck(videoId)]);

  if (deck?.status === "ready" && deck.content) {
    // 연 핵심 카드는 내 목록에 넣는다 (본 영상으로 표시된다)
    if (user) await markOpened(user.id, videoId);
    return <CardNews deck={{ ...deck, content: deck.content as DeckContent, date: koreanDate(deck.created_at) }} />;
  }

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <h1 className="text-xl font-black">{deck?.title || "아직 핵심 카드가 없는 영상이에요"}</h1>
      <DeckPending videoId={videoId} status={deck?.status ?? null} error={deck?.error ?? null} />
      <Link href="/" className="mt-6 inline-block text-sm text-muted underline">
        홈으로
      </Link>
    </div>
  );
}

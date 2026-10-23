"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DeckStatus } from "@/lib/types";
import { useCreateDeck } from "./use-create-deck";

/** 핵심 카드가 아직 없거나(만들기), 만드는 중이거나(기다리기), 실패한(다시 시도) 영상 화면 */
export function DeckPending({ videoId, status, error }: { videoId: string; status: DeckStatus | null; error: string | null }) {
  const { state, create } = useCreateDeck();
  const router = useRouter();

  // 만드는 중이면 바로 기다리기 시작한다 (끝나면 이 화면이 핵심 카드로 바뀐다)
  useEffect(() => {
    if (status === "processing") create(videoId).then(() => router.refresh());
  }, [status, videoId, create, router]);

  if (state.phase === "working") {
    return (
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted" role="status">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        핵심 카드를 만드는 중이에요… <span className="tabular-nums">{state.seconds}초</span>
      </p>
    );
  }
  const message = state.phase === "error" ? state.message : status === "failed" ? error : null;
  return (
    <div className="mt-6 space-y-4">
      {message && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{message}</p>}
      <button
        onClick={() => create(videoId).then(() => router.refresh())}
        className="rounded-xl bg-accent px-5 py-3 font-bold text-white hover:bg-accent-strong"
      >
        {status === "failed" || state.phase === "error" ? "다시 만들기" : "핵심 카드 만들기"}
      </button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type CreateState =
  | { phase: "idle" }
  | { phase: "working"; videoId?: string; waiting?: boolean; seconds: number }
  | { phase: "error"; message: string };

const POLL_MS = 3_000;
// 다른 사람이 만드는 중일 때 기다리는 최대 시간 (서버가 5분이 지나면 멈춘 것으로 본다)
const MAX_WAIT_MS = 5.5 * 60_000;

/**
 * 영상 URL로 핵심 카드를 만들고, 다 되면 핵심 카드 화면으로 간다.
 * 다른 사람이 같은 영상을 만드는 중이면 끝날 때까지 상태를 확인하며 기다린다.
 */
export function useCreateDeck() {
  const router = useRouter();
  const [state, setState] = useState<CreateState>({ phase: "idle" });
  const began = useRef(0);

  // 기다리는 동안 경과 시간을 보여 준다
  const working = state.phase === "working";
  useEffect(() => {
    if (!working) return;
    const t = setInterval(
      () => setState((s) => (s.phase === "working" ? { ...s, seconds: Math.round((Date.now() - began.current) / 1000) } : s)),
      1000,
    );
    return () => clearInterval(t);
  }, [working]);

  const create = useCallback(
    async (url: string) => {
      began.current = Date.now();
      setState({ phase: "working", seconds: 0 });
      try {
        const res = await fetch("/api/decks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = (await res.json().catch(() => ({}))) as { videoId?: string; status?: string; error?: string };
        if (!res.ok && res.status !== 202) throw new Error(data.error ?? `요청이 실패했어요 (${res.status}).`);
        const videoId = data.videoId!;

        if (data.status === "processing") {
          setState((s) => ({ ...s, phase: "working", videoId, waiting: true, seconds: 0 }));
          while (Date.now() - began.current < MAX_WAIT_MS) {
            await new Promise((r) => setTimeout(r, POLL_MS));
            const poll = await fetch(`/api/decks/${videoId}`, { cache: "no-store" });
            const p = (await poll.json().catch(() => ({}))) as { status?: string; error?: string };
            if (p.status === "ready") break;
            if (p.status === "failed") throw new Error(p.error ?? "핵심 카드를 만들지 못했어요.");
          }
        }
        router.push(`/v/${videoId}`);
      } catch (err) {
        setState({ phase: "error", message: err instanceof Error ? err.message : String(err) });
      }
    },
    [router],
  );

  return { state, create, reset: () => setState({ phase: "idle" }) };
}

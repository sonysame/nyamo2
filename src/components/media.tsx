"use client";

import { useEffect } from "react";
import { watchUrl } from "@/lib/youtube";

/** 브라우저 내장 음성으로 영어 문장을 읽어 준다 (무료, 서버 호출 없음) */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang === "en-US");
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${className}`}
      aria-label="발음 듣기"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
      </svg>
      발음
    </button>
  );
}

/**
 * 자막(CC)을 끈다. cc_load_policy=0만으로는 YouTube 계정의 '자막 항상 표시' 설정을 이기지 못해서,
 * 플레이어 API(enablejsapi=1)로 자막 모듈을 내린다. 플레이어가 준비되는 시점을 몰라서 몇 번 나눠 보낸다.
 */
function turnOffCaptions(frame: HTMLIFrameElement) {
  const send = (msg: object) => frame.contentWindow?.postMessage(JSON.stringify(msg), "*");
  send({ event: "listening", id: 1 });
  for (const ms of [500, 1500, 3000, 6000]) {
    setTimeout(() => send({ event: "command", func: "unloadModule", args: ["captions"] }), ms);
  }
}

/** 원본 영상을 YouTube 공식 임베드 플레이어로 띄운다 (자막은 꺼진 채 시작) */
export function VideoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="원본 영상"
    >
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&cc_load_policy=0&enablejsapi=1`}
            onLoad={(e) => turnOffCaptions(e.currentTarget)}
            title="원본 영상"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <div className="mt-3 flex justify-between text-sm text-white">
          <a href={watchUrl(videoId)} target="_blank" rel="noreferrer" className="underline">
            YouTube에서 보기
          </a>
          <button onClick={onClose} className="font-semibold">
            닫기 ✕
          </button>
        </div>
      </div>
    </div>
  );
}

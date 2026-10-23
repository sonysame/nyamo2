"use client";

import { useAuth } from "./auth-provider";
import { GoogleMark } from "./google-mark";
import { HowItWorksComic } from "./how-it-works-comic";

/** 로그인하지 않은 사람에게 보여 주는 첫 화면 */
export function LoginHero({ next, error }: { next?: string; error?: boolean }) {
  const { signIn } = useAuth();
  return (
    <div className="space-y-12 py-6">
      <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-bold text-accent">라이브 아카데미 영상으로 공부하는 분께</p>
          <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            영상 속 영어 문장,
            <br />
            <span className="marker">핵심 카드</span>로 모아서
            <br />
            매일 꺼내 보세요
          </h1>
          <button
            onClick={() => signIn(next ?? "/")}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-bold text-white shadow-card hover:bg-ink-soft"
          >
            <GoogleMark className="h-5 w-5 rounded-full bg-white p-0.5" />
            구글로 시작하기
          </button>
          {error && <p className="mt-3 text-sm font-semibold text-danger">로그인하지 못했어요. 다시 시도해 주세요.</p>}
        </div>
        <SampleCard />
      </div>
      <HowItWorksComic />
    </div>
  );
}

/** 첫 화면 오른쪽의 핵심 카드 예시 */
const SAMPLE = [
  ["I happen to have some cash on me right now.", "마침 나한테 지금 현금이 좀 있어."],
  ["It just so happens that I have some cash.", "마침 나한테 현금이 좀 있어."],
  ["Do you by any chance have something to eat?", "혹시 뭐 먹을 것 좀 있으세요?"],
];

function SampleCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-3xl bg-mark" aria-hidden />
      <div className="relative rounded-3xl bg-ink p-7 text-white shadow-card">
        <p className="text-xs font-bold tracking-widest text-mark">WRAP UP · 9 SENTENCES</p>
        <p className="mt-2 text-lg font-black">“마침” / “혹시” 영어로 자연스럽게 말하기</p>
        <ol className="mt-4 divide-y divide-white/10">
          {SAMPLE.map(([en, ko], i) => (
            <li key={i} className="flex gap-3 py-3">
              <span className="font-black text-mark">{i + 1}</span>
              <span>
                <span className="block font-semibold leading-snug">{en}</span>
                <span className="mt-0.5 block text-sm text-white/70">{ko}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

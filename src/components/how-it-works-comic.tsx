import type { ReactNode } from "react";
import { Puppet, type PuppetKind } from "./puppet";

type Panel = { kind: PuppetKind; line: ReactNode; prop: ReactNode; tint: string };

const PANELS: Panel[] = [
  {
    kind: "violet",
    line: (
      <>
        라이브 아카데미 <b>영상 주소</b>를 넣어 줘!
        <br />
        채널 목록에서 골라도 돼
      </>
    ),
    prop: <UrlProp />,
    tint: "from-accent-soft",
  },
  {
    kind: "orange",
    line: (
      <>
        영상에서 배운 문장을 <b>핵심 카드</b> 한 장에!
        <br />
        핵심 표현은 <b className="rounded bg-ink px-1 text-mark">노란색</b>이야
      </>
    ),
    prop: <CardProp />,
    tint: "from-mark-soft",
  },
  {
    kind: "green",
    line: (
      <>
        한국어나 영어를 <b>가리고</b> 떠올려 봐.
        <br />
        🔊 로 발음도 들을 수 있어
      </>
    ),
    prop: <HideProp />,
    tint: "from-success-soft",
  },
];

/** 첫 화면의 사용법 3컷 만화. 캐릭터가 말풍선으로 한 단계씩 알려 준다. */
export function HowItWorksComic() {
  return (
    <section aria-labelledby="how-title">
      <h2 id="how-title" className="sr-only">
        사용법
      </h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {PANELS.map((p, i) => (
          <li
            key={p.kind}
            className={`relative overflow-hidden rounded-2xl border-2 border-foreground/80 bg-gradient-to-b ${p.tint} to-surface p-4 shadow-[4px_4px_0_0_var(--foreground)]`}
          >
            <span className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full border-2 border-foreground/80 bg-surface text-sm font-black">
              {i + 1}
            </span>

            {/* 말풍선 */}
            <div className="relative ml-9 rounded-2xl border-2 border-foreground/80 bg-surface px-3 py-2 text-sm leading-snug">
              {p.line}
              <span
                aria-hidden
                className="absolute -bottom-[9px] left-8 h-4 w-4 rotate-45 border-b-2 border-r-2 border-foreground/80 bg-surface"
              />
            </div>

            {/* 장면: 캐릭터 + 소품 */}
            <div className="mt-3 flex items-end justify-between gap-2">
              <Puppet kind={p.kind} className="puppet-bob h-28 w-auto shrink-0" />
              <div className="mb-3 min-w-0 flex-1">{p.prop}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function UrlProp() {
  return (
    <div className="ml-auto w-32 rotate-3 rounded-xl border-2 border-foreground/80 bg-surface p-2 shadow-card" aria-hidden>
      <div className="flex items-center gap-1">
        <span className="grid h-4 w-5 place-items-center rounded bg-danger text-[7px] text-white">▶</span>
        <span className="truncate font-mono text-[9px] text-muted">youtube.com/watch?v=…</span>
      </div>
      <p className="mt-1.5 rounded-md bg-mark py-0.5 text-center text-[10px] font-bold text-ink">정리하기</p>
    </div>
  );
}

function CardProp() {
  return (
    <div className="ml-auto w-32 -rotate-2 rounded-xl border-2 border-foreground/80 bg-ink p-2 text-white shadow-card" aria-hidden>
      <p className="text-[8px] font-bold tracking-widest text-mark">WRAP UP</p>
      <p className="mt-1 text-[10px] font-semibold leading-tight">
        I <span className="text-mark">happen to</span> have cash.
      </p>
      <p className="text-[9px] text-white/60">마침 현금이 있어.</p>
    </div>
  );
}

function HideProp() {
  return (
    <div className="relative ml-auto h-16 w-28" aria-hidden>
      <div className="absolute inset-0 translate-x-2 -translate-y-1 rotate-6 rounded-xl border-2 border-foreground/80 bg-success-soft" />
      <div className="absolute inset-0 -rotate-3 rounded-xl border-2 border-foreground/80 bg-surface p-2 shadow-card">
        <p className="truncate text-xs font-black">That is a relief.</p>
        <p className="select-none text-[10px] font-semibold text-muted blur-[3px]">다행이네요.</p>
      </div>
    </div>
  );
}

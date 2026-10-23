import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser, isAdmin } from "@/lib/auth";
import { adminStats } from "@/lib/admin-stats";
import { DAILY_LIMIT } from "@/lib/usage";
import { ModelPicker } from "@/components/model-picker";

/** 한국 시간 날짜·시각 (예: 10. 24. 오후 3:12) */
const koTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "-";

/** 관리자 페이지: 사용자, 만들어진 핵심 카드, 오늘 Gemini 사용량, 모델 고르기. 관리자가 아니면 없는 페이지처럼 보인다. */
export default async function AdminPage() {
  if (!isAdmin(await currentUser())) notFound();
  const { users, decks, gemini, since } = await adminStats();
  const ready = decks.filter((d) => d.status === "ready");
  const failed = decks.filter((d) => d.status === "failed");
  const processing = decks.filter((d) => d.status === "processing");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">관리자</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="사용자" value={`${users.length}명`} />
        <Stat label="만들어진 핵심 카드" value={`${ready.length}개`} sub={`실패 ${failed.length} · 만드는 중 ${processing.length}`} />
        <Stat
          label="오늘 Gemini 요청"
          value={`${gemini.total} / ${DAILY_LIMIT}`}
          sub={`성공 ${gemini.ok} · 오류 ${gemini.error} · 한도 ${gemini.rateLimited}`}
        />
      </div>
      <p className="-mt-5 text-xs text-muted">
        &apos;오늘&apos;은 Gemini 무료 한도가 다시 채워진 시각({koTime(since)}, 한국 시간)부터예요.
      </p>

      <Section title="Gemini 모델">
        <ModelPicker />
      </Section>

      <Section title={`사용자 ${users.length}명`}>
        <Table
          head={["이름 / 이메일", "가입", "마지막 로그인", "본 영상", "만든 카드", "오늘 Gemini"]}
          rows={users.map((u) => [
            <span key="n">
              <b>{u.name || "-"}</b>
              <span className="block text-xs text-muted">{u.email}</span>
            </span>,
            koTime(u.joined),
            koTime(u.lastSignIn),
            u.watched,
            u.made,
            u.geminiToday,
          ])}
        />
      </Section>

      <Section title={`핵심 카드 ${decks.length}개`}>
        <Table
          head={["영상", "상태", "문장", "모델", "만든 사람", "만든 때"]}
          rows={decks.map((d) => [
            <span key="t">
              <Link href={`/v/${d.video_id}`} className="font-semibold hover:text-accent">
                {d.title || d.video_id}
              </Link>
              {d.error && <span className="block text-xs text-danger">{d.error}</span>}
            </span>,
            d.status === "ready" ? "완료" : d.status === "failed" ? "실패" : "만드는 중",
            d.sentences,
            d.model ?? "-",
            d.createdBy ?? "-",
            koTime(d.created_at),
          ])}
        />
      </Section>

      <Section title="오늘 Gemini 오류 (최근 10개)">
        {gemini.recentErrors.length === 0 ? (
          <p className="text-sm text-muted">오늘은 오류가 없어요.</p>
        ) : (
          <Table
            head={["때", "모델", "종류", "내용"]}
            rows={gemini.recentErrors.map((e) => [
              koTime(e.at),
              e.model,
              e.status === "rate_limited" ? "한도" : "오류",
              <span key="m" className="text-xs">
                {e.message}
              </span>,
            ])}
          />
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted tabular-nums">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-3 text-lg font-black">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60 align-top last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-2 py-2 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

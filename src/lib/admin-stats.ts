import "server-only";
import { supabaseAdmin } from "./supabase-server";
import { startOfQuotaDay } from "./day";
import type { DeckContent } from "./types";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  joined: string;
  lastSignIn: string | null;
  /** 이 사람이 연(본) 영상 수 */
  watched: number;
  /** 이 사람이 처음 만든 핵심 카드 수 */
  made: number;
  /** 오늘 이 사람 때문에 Gemini를 부른 횟수 (실패·재시도 포함) */
  geminiToday: number;
};

export type AdminDeck = {
  video_id: string;
  title: string;
  status: string;
  model: string | null;
  error: string | null;
  sentences: number;
  createdBy: string | null;
  created_at: string;
};

export type GeminiToday = {
  total: number;
  ok: number;
  error: number;
  rateLimited: number;
  recentErrors: { at: string; model: string; status: string; message: string; video_id: string | null }[];
};

export type AdminStats = { users: AdminUser[]; decks: AdminDeck[]; gemini: GeminiToday; since: string };

/** 관리자 페이지에 보여 줄 사용자, 핵심 카드, 오늘 Gemini 사용량 (데이터가 작아서 한 번에 읽어서 센다) */
export async function adminStats(): Promise<AdminStats> {
  const db = supabaseAdmin();
  const since = startOfQuotaDay().toISOString();
  const [usersRes, decksRes, opensRes, logsRes] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db
      .from("decks")
      .select("video_id, title, status, model, error, content, created_by, created_at")
      .order("created_at", { ascending: false }),
    db.from("user_decks").select("user_id"),
    db
      .from("gemini_log")
      .select("created_at, user_id, video_id, model, status, message")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ]);

  const authUsers = usersRes.data?.users ?? [];
  const emailOf = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));
  const decks = (decksRes.data ?? []) as (Omit<AdminDeck, "sentences" | "createdBy"> & {
    content: DeckContent | null;
    created_by: string | null;
  })[];
  const logs = (logsRes.data ?? []) as {
    created_at: string;
    user_id: string | null;
    video_id: string | null;
    model: string;
    status: "ok" | "error" | "rate_limited";
    message: string | null;
  }[];

  const countBy = <T,>(rows: T[], key: (r: T) => string | null) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = key(r);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const watched = countBy(opensRes.data ?? [], (r: { user_id: string }) => r.user_id);
  const made = countBy(decks, (d) => d.created_by);
  const geminiByUser = countBy(logs, (l) => l.user_id);

  return {
    since,
    users: authUsers
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        name: (u.user_metadata?.full_name as string | undefined) ?? "",
        joined: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        watched: watched.get(u.id) ?? 0,
        made: made.get(u.id) ?? 0,
        geminiToday: geminiByUser.get(u.id) ?? 0,
      }))
      .sort((a, b) => (b.lastSignIn ?? "").localeCompare(a.lastSignIn ?? "")),
    decks: decks.map((d) => ({
      video_id: d.video_id,
      title: d.title,
      status: d.status,
      model: d.model,
      error: d.error,
      sentences: d.content?.sentences.length ?? 0,
      createdBy: d.created_by ? (emailOf.get(d.created_by) ?? null) : null,
      created_at: d.created_at,
    })),
    gemini: {
      total: logs.length,
      ok: logs.filter((l) => l.status === "ok").length,
      error: logs.filter((l) => l.status === "error").length,
      rateLimited: logs.filter((l) => l.status === "rate_limited").length,
      recentErrors: logs
        .filter((l) => l.status !== "ok")
        .slice(0, 10)
        .map((l) => ({ at: l.created_at, model: l.model, status: l.status, message: l.message ?? "", video_id: l.video_id })),
    },
  };
}

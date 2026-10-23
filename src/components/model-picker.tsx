"use client";

import { useEffect, useState } from "react";

/** 관리자 페이지: 핵심 카드를 만들 Gemini 모델 고르기 */
export function ModelPicker() {
  const [current, setCurrent] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/model", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { current?: string; options?: string[]; error?: string }) => {
        if (d.error) return setMessage({ ok: false, text: d.error });
        setCurrent(d.current ?? null);
        setPicked(d.current ?? "");
        setOptions(d.options ?? []);
      })
      .catch(() => setMessage({ ok: false, text: "모델 목록을 불러오지 못했어요." }));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/model", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: picked }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { current?: string; error?: string } | undefined;
    setSaving(false);
    if (!res?.ok) return setMessage({ ok: false, text: data?.error ?? "저장하지 못했어요." });
    setCurrent(data?.current ?? picked);
    setMessage({ ok: true, text: "바꿨어요. 다음에 만드는 핵심 카드부터 이 모델을 써요." });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        지금 쓰는 모델: <b className="text-foreground">{current ?? "불러오는 중…"}</b>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
          aria-label="Gemini 모델"
        >
          {options.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving || !picked || picked === current}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? "저장 중…" : "이 모델로 바꾸기"}
        </button>
      </div>
      {message && (
        <p className={`text-sm font-semibold ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
      )}
    </div>
  );
}

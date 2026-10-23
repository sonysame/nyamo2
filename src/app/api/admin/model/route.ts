import { requireAdmin } from "@/lib/auth";
import { getModel, modelOptions, setModel } from "@/lib/models";

/** 지금 쓰는 모델과 고를 수 있는 모델 목록 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const [current, options] = await Promise.all([getModel(), modelOptions()]);
  return Response.json({ current, options });
}

/** 모델 바꾸기: { model } */
export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { model } = (await request.json().catch(() => ({}))) as { model?: string };
  // Gemini가 실제로 제공하는 모델만 허용
  if (!model || !(await modelOptions()).includes(model)) {
    return Response.json({ error: "고를 수 없는 모델이에요." }, { status: 400 });
  }
  try {
    await setModel(model);
  } catch (err) {
    return Response.json(
      { error: `저장하지 못했어요. supabase/migrations/001_app_settings.sql을 실행했는지 확인해 주세요. (${(err as Error).message})` },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, current: await getModel() });
}

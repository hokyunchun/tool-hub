import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const GENERIC_MESSAGE = "입력한 ID와 이메일이 일치하면 비밀번호 재설정 메일을 보냈습니다.";

function authHeaders(apiKey: string) {
  return { apikey: apiKey, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

export async function POST(request: Request) {
  let body: { username?: unknown; email?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 }); }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!USERNAME_PATTERN.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "ID와 가입 이메일을 확인해 주세요." }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "비밀번호 복구 서버 설정이 아직 완료되지 않았습니다." }, { status: 503 });
  }

  const profileUrl = new URL(`${supabaseUrl}/rest/v1/study_profiles`);
  profileUrl.searchParams.set("select", "user_id");
  profileUrl.searchParams.set("username", `eq.${username}`);
  const profileResponse = await fetch(profileUrl, { headers: authHeaders(secretKey), cache: "no-store" }).catch(() => null);
  if (!profileResponse?.ok) return NextResponse.json({ error: "복구 서버에 연결할 수 없습니다." }, { status: 502 });
  const profiles = await profileResponse.json();
  const userId = Array.isArray(profiles) ? profiles[0]?.user_id : undefined;
  if (!userId) return NextResponse.json({ message: GENERIC_MESSAGE }, { headers: { "Cache-Control": "no-store" } });

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: authHeaders(secretKey),
    cache: "no-store",
  }).catch(() => null);
  if (!userResponse?.ok) return NextResponse.json({ error: "복구 서버에 연결할 수 없습니다." }, { status: 502 });
  const authUser = await userResponse.json();
  const registeredEmail = String(authUser.email ?? authUser.user?.email ?? "").toLowerCase();

  if (registeredEmail && registeredEmail === email) {
    const redirectTo = new URL("/fire-study-planner/index.html", "https://www.nomadho.com").toString();
    const recoverUrl = new URL(`${supabaseUrl}/auth/v1/recover`);
    recoverUrl.searchParams.set("redirect_to", redirectTo);
    const sendResponse = await fetch(recoverUrl, {
      method: "POST",
      headers: authHeaders(publishableKey),
      body: JSON.stringify({ email: registeredEmail }),
      cache: "no-store",
    }).catch(() => null);
    if (!sendResponse?.ok) return NextResponse.json({ error: "재설정 메일 발송에 실패했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
}

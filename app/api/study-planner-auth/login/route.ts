import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

function authHeaders(apiKey: string) {
  return { apikey: apiKey, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 }); }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!USERNAME_PATTERN.test(username) || password.length < 8 || password.length > 256) {
    return NextResponse.json({ error: "ID 또는 비밀번호를 확인해 주세요." }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "로그인 서버 설정이 아직 완료되지 않았습니다." }, { status: 503 });
  }

  const headers = authHeaders(secretKey);
  const profileUrl = new URL(`${supabaseUrl}/rest/v1/study_profiles`);
  profileUrl.searchParams.set("select", "user_id");
  profileUrl.searchParams.set("username", `eq.${username}`);

  const profileResponse = await fetch(profileUrl, { headers, cache: "no-store" }).catch(() => null);
  if (!profileResponse?.ok) return NextResponse.json({ error: "로그인 서버에 연결할 수 없습니다." }, { status: 502 });
  const profiles = await profileResponse.json();
  const userId = Array.isArray(profiles) ? profiles[0]?.user_id : undefined;
  if (!userId) return NextResponse.json({ error: "ID 또는 비밀번호를 확인해 주세요." }, { status: 401 });

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers, cache: "no-store" }).catch(() => null);
  if (!userResponse?.ok) return NextResponse.json({ error: "로그인 서버에 연결할 수 없습니다." }, { status: 502 });
  const authUser = await userResponse.json();
  const email = authUser.email ?? authUser.user?.email;
  if (typeof email !== "string") return NextResponse.json({ error: "로그인 서버에 연결할 수 없습니다." }, { status: 502 });

  const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(publishableKey),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  }).catch(() => null);
  if (!tokenResponse) return NextResponse.json({ error: "로그인 서버에 연결할 수 없습니다." }, { status: 502 });
  const session = await tokenResponse.json();
  if (!tokenResponse.ok) return NextResponse.json({ error: "ID 또는 비밀번호를 확인해 주세요." }, { status: 401 });

  return NextResponse.json({ access_token: session.access_token, refresh_token: session.refresh_token }, {
    headers: { "Cache-Control": "no-store" },
  });
}

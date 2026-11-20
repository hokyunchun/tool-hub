import { END_DATE, TIME_ZONE, TOTAL_LECTURES, subjects as starterSubjects, tasksForDate as starterTasks } from "./plan.js";

const STORAGE_KEY = "fire-study-planner-progress-v1";
const LOCAL_PLAN_KEY = "fire-study-planner-plan-v2";
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const subjectColors = ["#263d55", "#4a3035", "#494125", "#294233", "#3e3452", "#4c392c"];
const starterMinutes = [72, 47, 49];
let supabase;
let user = null;
let plan = null;
let plans = [];
let subjects = [];
let tasks = [];
let progress = {};
let selectedDate = todayInKorea();
let syncMessage = "이 기기에 저장 중";
let realtimeChannel;
let passwordRecoveryMode = typeof window !== "undefined" && window.location.hash.includes("type=recovery");
let importedSessions = null;

function todayInKorea() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function dateFromISO(date) { const [y, m, d] = date.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); }
function formatDate(date, options = { year: "numeric", month: "long", day: "numeric", weekday: "long" }) { return new Intl.DateTimeFormat("ko-KR", { ...options, timeZone: "UTC" }).format(dateFromISO(date)); }
function daysBetween(from, to) { return Math.round((dateFromISO(to) - dateFromISO(from)) / 86400000); }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function normalizeLoginId(value) {
  const loginId = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(loginId)) {
    throw new Error("ID는 영문 소문자와 숫자로 시작하고, 영문·숫자·점·하이픈·밑줄을 사용해 3~32자로 입력해 주세요.");
  }
  return loginId;
}
function readLocal(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function persistLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ plan, subjects, tasks })); }
function displayLabel(task) {
  const subject = subjects.find((item) => item.id === task.subject_id);
  if (task.type === "ox") return `${subject?.name ?? ""} ${task.range_start}~${task.range_end}강 OX`;
  return `${subject?.name ?? ""} ${task.title || `${task.lecture_number}강`}`;
}
function plannedTasksOn(date) { return tasks.filter((task) => task.study_date === date); }
function subjectDoneCount(subject) { return tasks.filter((task) => task.subject_id === subject.id && task.type === "lecture" && progress[task.id]).length; }
function currentSubject() { return [...subjects].sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).find((subject) => subjectDoneCount(subject) < Number(subject.lecture_count)) || null; }
function completedOnDate(task, date) {
  const value = progress[task.id];
  if (!value) return false;
  return typeof value === "string" ? value.slice(0, 10) === date : task.study_date === date;
}
function visibleTasksOn(date) {
  const completedToday = tasks.filter((task) => completedOnDate(task, date));
  const active = currentSubject();
  if (!active) return completedToday;
  let pending = tasks.filter((task) => task.subject_id === active.id && task.study_date <= date && !progress[task.id]);
  const isStudyDay = plan?.include_weekends || ![0, 6].includes(dateFromISO(date).getUTCDay());
  if (!pending.length && date === todayInKorea() && isStudyDay) {
    const nextDate = tasks.filter((task) => task.subject_id === active.id && task.study_date > date && !progress[task.id]).map((task) => task.study_date).sort()[0];
    if (nextDate) pending = tasks.filter((task) => task.subject_id === active.id && task.study_date === nextDate && !progress[task.id]);
  }
  return [...new Map([...completedToday, ...pending].map((task) => [task.id, task])).values()]
    .sort((a, b) => Number(subjects.find((s) => s.id === a.subject_id)?.sort_order || 0) - Number(subjects.find((s) => s.id === b.subject_id)?.sort_order || 0) || Number(a.lecture_number || a.range_start || 0) - Number(b.lecture_number || b.range_start || 0));
}
function progressBar(percent, label) { return `<div class="progress" role="progressbar" aria-label="${escapeHTML(label)}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${percent}%"></div></div>`; }

function makeStarterTasks(subjectRows, localIds = false) {
  const rows = [];
  for (const starter of starterSubjects) {
    const subject = subjectRows.find((row) => row.name === starter.name);
    if (!subject) continue;
    for (const [date, first, last] of starter.days) {
      for (let n = first; n <= last; n += 1) rows.push({ id: localIds ? `${date}|lecture|${subject.name}|${n}` : crypto.randomUUID(), subject_id: subject.id, type: "lecture", lecture_number: n, range_start: null, range_end: null, study_date: date, user_id: user?.id });
      rows.push({ id: localIds ? `${date}|ox|${subject.name}|${first}-${last}` : crypto.randomUUID(), subject_id: subject.id, type: "ox", lecture_number: null, range_start: first, range_end: last, study_date: date, user_id: user?.id });
    }
  }
  return rows;
}
function makeEvenSchedule(subjectRows, startDate, endDate, includeWeekends = false) {
  const days = [];
  for (let d = dateFromISO(startDate); d <= dateFromISO(endDate); d.setUTCDate(d.getUTCDate() + 1)) {
    if (includeWeekends || ![0, 6].includes(d.getUTCDay())) days.push(d.toISOString().slice(0, 10));
  }
  if (days.length < subjectRows.length) throw new Error("각 과목에 공부일을 배정하려면 목표 날짜를 늘리거나 주말 포함을 선택해 주세요.");
  const rows = [];
  const totalLectures = subjectRows.reduce((sum, subject) => sum + Number(subject.lecture_count), 0);
  let previousCount = 0;
  for (const subject of subjectRows) {
    const sessionList = importedSessions?.[subject.name] || [];
    const blockStart = Math.round((previousCount * days.length) / totalLectures);
    previousCount += Number(subject.lecture_count);
    const blockEnd = Math.round((previousCount * days.length) / totalLectures);
    const subjectDays = days.slice(blockStart, blockEnd);
    if (!subjectDays.length) throw new Error("목표 날짜가 너무 짧아 과목별 일정을 만들 수 없습니다.");
    let previous = 0;
    for (let i = 0; i < subjectDays.length; i += 1) {
      const current = Math.floor(((i + 1) * subject.lecture_count) / subjectDays.length);
      if (current > previous) {
        for (let number = previous + 1; number <= current; number += 1) {
          const session = sessionList[number - 1];
          rows.push({ id: crypto.randomUUID(), subject_id: subject.id, type: "lecture", lecture_number: number, title: session?.title || null, duration_minutes: session?.duration_minutes ?? null, duration_estimated: session?.duration_estimated ?? false, range_start: null, range_end: null, study_date: subjectDays[i], user_id: user?.id });
        }
        rows.push({ id: crypto.randomUUID(), subject_id: subject.id, type: "ox", lecture_number: null, title: null, duration_minutes: null, duration_estimated: false, range_start: previous + 1, range_end: current, study_date: subjectDays[i], user_id: user?.id });
      }
      previous = current;
    }
  }
  return rows;
}
function authView(message = "", mode = "login") {
  const recovery = mode === "recover";
  const signup = mode === "signup";
  const formFields = recovery
    ? `<label class="field">ID<input name="loginId" required minlength="3" maxlength="32" autocapitalize="none" autocomplete="username" placeholder="가입할 때 만든 ID"></label><label class="field">복구 이메일<input name="email" type="email" required autocomplete="email" placeholder="가입할 때 등록한 이메일"></label>`
    : `<label class="field">ID<input name="loginId" type="text" minlength="3" maxlength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" autocapitalize="none" autocomplete="username" required placeholder="예: admin"></label>${signup ? '<label class="field">복구 이메일<input name="email" type="email" autocomplete="email" required placeholder="비밀번호 재설정에 사용할 이메일"></label>' : ""}<label class="field">비밀번호<input name="password" type="password" minlength="8" autocomplete="${signup ? "new-password" : "current-password"}" required placeholder="8자 이상 · admin/admin은 사용할 수 없어요"></label>`;
  const title = recovery ? "비밀번호 찾기" : signup ? "새 계정 만들기" : "내 학습 공간";
  const help = recovery ? "가입할 때 등록한 ID와 복구 이메일을 입력하면 재설정 안내를 보내드립니다." : signup ? "로그인 ID, 복구 이메일, 비밀번호를 등록해 주세요. 가입 후 이메일 인증을 마치면 로그인할 수 있어요." : "로그인 ID와 비밀번호를 입력하세요. 계정이 없으면 새 계정을 만들어 주세요.";
  const submitLabel = recovery ? "재설정 이메일 받기" : signup ? "가입하고 인증 메일 받기" : "로그인";
  document.querySelector("#app").innerHTML = `<main class="page-shell"><header class="page-header"><div><p class="eyebrow">공부 기록을 여러 기기에서 이어가세요</p><h1>Study Planner</h1><p class="subtitle">계정으로 로그인하면 기록이 클라우드에 저장됩니다.</p></div><span class="timezone-badge">한국 시간 · KST</span></header>
  <section class="card auth-card"><h2>${title}</h2><p class="subtitle">${help}</p><form id="auth-form">${formFields}<div class="button-row"><button class="button button-primary" type="submit">${submitLabel}</button></div></form><div class="button-row">${!signup && !recovery ? '<button class="button" id="show-signup" type="button">새 계정 만들기</button><button class="button" id="show-recovery" type="button">비밀번호 찾기</button>' : '<button class="button" id="show-login" type="button">로그인으로 돌아가기</button>'}</div><p class="notice" role="status">${escapeHTML(message || (supabase ? "계정을 만들거나 기존 ID와 비밀번호로 로그인하세요." : "클라우드 연결 설정 전입니다. 현재는 이 기기에만 저장됩니다."))}</p></section></main>`;
  document.querySelector("#show-signup")?.addEventListener("click", () => authView("", "signup"));
  document.querySelector("#show-recovery")?.addEventListener("click", () => authView("", "recover"));
  document.querySelector("#show-login")?.addEventListener("click", () => authView("", "login"));
  document.querySelector("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!supabase) { authView("클라우드 설정이 아직 완료되지 않았습니다. 잠시 후 다시 이용해 주세요.", mode); return; }
    if (recovery) {
      let loginId;
      try { loginId = normalizeLoginId(form.get("loginId")); } catch (error) { authView(error.message, mode); return; }
      const response = await fetch("/api/study-planner-auth/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginId, email: String(form.get("email") ?? "").trim() }) }).catch(() => null);
      const result = await response?.json().catch(() => ({}));
      authView(result?.message || result?.error || "복구 서버에 연결할 수 없습니다.", mode);
      return;
    }
    let loginId;
    try { loginId = normalizeLoginId(form.get("loginId")); } catch (error) { authView(error.message, mode); return; }
    const password = String(form.get("password") ?? "");
    if (password.length < 8 || password.length > 256) { authView("비밀번호는 8~256자로 입력해 주세요.", mode); return; }
    if (signup) {
      const email = String(form.get("email") ?? "").trim();
      const result = await supabase.auth.signUp({ email, password, options: { data: { username: loginId }, emailRedirectTo: "https://www.nomadho.com/fire-study-planner/index.html" } });
      if (result.error) { authView(result.error.message, mode); return; }
      if (!result.data.session) { authView("인증 메일을 보냈습니다. 메일의 확인 버튼을 누른 뒤 로그인해 주세요.", "login"); return; }
      user = result.data.user; await loadUserData(); render(); return;
    }
    const response = await fetch("/api/study-planner-auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginId, password }) }).catch(() => null);
    const result = await response?.json().catch(() => ({}));
    if (!response?.ok) { authView(result?.error || "로그인 서버에 연결할 수 없습니다.", mode); return; }
    const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
    if (error) { authView(error.message, mode); return; }
  });
}
function passwordResetView(message = "") {
  document.querySelector("#app").innerHTML = `<main class="page-shell"><section class="card auth-card"><h2>새 비밀번호 설정</h2><p class="subtitle">복구 이메일의 링크를 확인하고 새 비밀번호를 입력해 주세요.</p><form id="reset-form"><label class="field">새 비밀번호<input name="password" type="password" minlength="8" autocomplete="new-password" required placeholder="8자 이상"></label><div class="button-row"><button class="button button-primary" type="submit">비밀번호 변경</button></div></form><p class="notice" role="status">${escapeHTML(message)}</p></section></main>`;
  document.querySelector("#reset-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { passwordResetView(error.message); return; }
    passwordRecoveryMode = false;
    await supabase.auth.signOut();
    history.replaceState(null, "", window.location.pathname);
    authView("비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.");
  });
}
function onboardingView(message = "") {
  const today = todayInKorea();
  const blankSubject = '<div class="subject-input-row"><input name="subjectName" required placeholder="과목명"><input name="lectureCount" type="number" min="1" required placeholder="강의 수"><label class="minutes-field"><input name="avgMinutes" type="number" min="1" max="600" value="60" required aria-label="강의 한 편의 평균 시간"><span>분/강</span></label><button type="button" class="button remove-subject" aria-label="과목 삭제">×</button></div>';
  document.querySelector("#app").innerHTML = `<main class="page-shell"><header class="page-header"><div><p class="eyebrow">나만의 학습 계획</p><h1>Study Planner</h1><p class="subtitle">강의 목록을 붙여 넣으면 과목과 수강 시간을 정리해 일정으로 만듭니다.</p></div><button class="button" id="sign-out">로그아웃</button></header>
  <section class="card setup-card"><div class="setup-heading"><div><h2>강의 목록으로 시작</h2><p>수강내역을 한꺼번에 붙여 넣거나 텍스트 파일로 올리면 AI가 과목·강의명·시간을 정리합니다.</p></div><button class="button" type="button" id="load-fire-template">소방시험 과목 불러오기</button></div><label class="field">강의 목록<textarea id="bulk-lecture-input" rows="8" placeholder="예: 날짜_강의 제목: 67분\n여러 줄을 그대로 붙여 넣으세요."></textarea></label><div class="import-controls"><label class="button file-button">텍스트 파일 선택<input id="lecture-file" type="file" accept=".txt,text/plain" multiple hidden></label><button class="button button-primary" type="button" id="parse-lectures">AI로 과목과 시간 정리</button></div><p class="import-note">내용은 정리를 위해 AI 서비스로 전송됩니다. Vercel AI Gateway 사용량에 따라 비용이 발생할 수 있으며, 24시간에 5회로 제한했습니다. 민감한 정보는 넣지 마세요.</p><div id="import-summary" class="import-summary" aria-live="polite"></div></section>
  <section class="card setup-card"><div class="setup-heading"><div><h2>계획 정보</h2><p>강의와 평균 시간은 위 목록으로 자동 입력하거나 직접 수정할 수 있습니다.</p></div></div><form id="plan-form"><label class="field">계획 이름<input name="title" required value="Study Planner"></label><div class="field-row"><label class="field">공부 시작일<input name="start" type="date" required value="${today}"></label><label class="field">완강 목표일<input name="end" type="date" required value="${escapeHTML(END_DATE)}"></label></div><div class="field"><span>과목별 강의 정보</span><div id="subject-fields">${blankSubject}</div></div><label class="weekend-option"><input name="includeWeekends" type="checkbox"><span><strong>주말에도 공부하기</strong><small>선택하면 토요일과 일요일도 일정에 포함합니다.</small></span></label><div class="button-row"><button class="button" type="button" id="add-subject">과목 추가</button><button class="button button-primary" type="submit">내 학습 일정 만들기</button></div></form></section><p class="notice" role="status">${escapeHTML(message)}</p></main>`;
  document.querySelector("#sign-out").addEventListener("click", signOut);
  document.querySelector("#add-subject").addEventListener("click", () => {
    const template = document.createElement("template"); template.innerHTML = blankSubject;
    const newRow = template.content.firstElementChild;
    document.querySelector("#subject-fields").appendChild(newRow);
    newRow.querySelector(".remove-subject").addEventListener("click", () => { if (document.querySelectorAll(".subject-input-row").length > 1) newRow.remove(); });
  });
  document.querySelector("#lecture-file").addEventListener("change", async (event) => {
    const files = [...event.currentTarget.files || []];
    const parts = await Promise.all(files.map(async (file) => `\n\n### ${file.name}\n${await file.text()}`));
    document.querySelector("#bulk-lecture-input").value = `${document.querySelector("#bulk-lecture-input").value}${parts.join("")}`.trim();
  });
  document.querySelector("#parse-lectures").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const input = document.querySelector("#bulk-lecture-input").value.trim();
    if (!input) { document.querySelector("#import-summary").textContent = "강의 내용을 붙여 넣거나 텍스트 파일을 선택해 주세요."; return; }
    button.disabled = true; button.textContent = "강의 목록 정리 중…";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/study-planner-import", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ text: input }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "AI 정리에 실패했습니다.");
      const parsed = result.courses.map((course) => {
        const known = course.sessions.map((session) => session.duration_minutes).filter((value) => Number.isInteger(value));
        const average = known.length ? Math.round(known.reduce((sum, value) => sum + value, 0) / known.length) : 60;
        return { name: course.name, avg_minutes: average, sessions: course.sessions.map((session) => ({ title: session.title, duration_minutes: session.duration_minutes ?? average, duration_estimated: session.duration_minutes == null })) };
      });
      importedSessions = Object.fromEntries(parsed.map((course) => [course.name, course.sessions]));
      document.querySelector("#subject-fields").innerHTML = parsed.map((course, index) => `<div class="subject-input-row"><input name="subjectName" required value="${escapeHTML(course.name)}" aria-label="과목명"><input name="lectureCount" type="number" min="1" required value="${course.sessions.length}" aria-label="강의 수"><label class="minutes-field"><input name="avgMinutes" type="number" min="1" max="600" value="${course.avg_minutes}" required aria-label="강의 한 편의 평균 시간"><span>분/강</span></label><button type="button" class="button remove-subject" aria-label="과목 삭제">×</button></div>`).join("");
      document.querySelectorAll(".remove-subject").forEach((remove) => remove.addEventListener("click", () => { if (document.querySelectorAll(".subject-input-row").length > 1) remove.closest(".subject-input-row").remove(); }));
      const estimatedCount = parsed.reduce((sum, course) => sum + course.sessions.filter((session) => session.duration_estimated).length, 0);
      document.querySelector("#import-summary").textContent = `${parsed.length}개 과목 · ${result.session_count}개 강의 항목을 정리했습니다.${estimatedCount ? ` 시간 정보가 없는 ${estimatedCount}개 항목은 해당 과목 평균으로 추정합니다.` : ""} 아래 계획 정보와 결과를 확인하고 저장하세요.`;
    } catch (error) {
      document.querySelector("#import-summary").textContent = error.message;
    } finally { button.disabled = false; button.textContent = "AI로 과목과 시간 정리"; }
  });
  document.querySelectorAll(".remove-subject").forEach((button) => button.addEventListener("click", () => { if (document.querySelectorAll(".subject-input-row").length > 1) button.closest(".subject-input-row").remove(); }));
  document.querySelector("#load-fire-template").addEventListener("click", () => {
    importedSessions = null;
    document.querySelector("#subject-fields").innerHTML = starterSubjects.map((item, index) => `<div class="subject-input-row"><input name="subjectName" required value="${escapeHTML(item.name)}" aria-label="과목명"><input name="lectureCount" type="number" min="1" required value="${item.name === "행정법총론" ? 86 : item.end - item.start + 1}" aria-label="강의 수"><label class="minutes-field"><input name="avgMinutes" type="number" min="1" max="600" value="${starterMinutes[index]}" required aria-label="강의 한 편의 평균 시간"><span>분/강</span></label><button type="button" class="button remove-subject" aria-label="과목 삭제">×</button></div>`).join("");
    document.querySelectorAll(".remove-subject").forEach((button) => button.addEventListener("click", () => { if (document.querySelectorAll(".subject-input-row").length > 1) button.closest(".subject-input-row").remove(); }));
  });
  document.querySelector("#plan-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const start = String(form.get("start"));
    const end = String(form.get("end"));
    if (end < start) { document.querySelector(".notice").textContent = "완강 목표일은 시작일 이후로 설정해 주세요."; return; }
    const names = form.getAll("subjectName").map((value) => String(value).trim());
    const counts = form.getAll("lectureCount").map(Number);
    if (!names.length || names.some((name) => !name) || counts.some((count) => count < 1)) { document.querySelector(".notice").textContent = "과목 이름과 강의 수를 확인해 주세요."; return; }
    const includeWeekends = form.get("includeWeekends") === "on";
    const newPlan = { id: crypto.randomUUID(), user_id: user.id, title, start_date: start, target_date: end, include_weekends: includeWeekends };
    const minutes = form.getAll("avgMinutes").map(Number);
    const subjectRows = names.map((name, index) => ({ id: crypto.randomUUID(), user_id: user.id, plan_id: newPlan.id, name, lecture_count: counts[index], avg_minutes: minutes[index] || 60, color: subjectColors[index % subjectColors.length], sort_order: index }));
    try { await saveNewPlan(newPlan, subjectRows, makeEvenSchedule(subjectRows, start, end, includeWeekends), {}); }
    catch (error) { document.querySelector(".notice").textContent = error.message; }
  });
}
async function saveNewPlan(newPlan, subjectRows, taskRows, oldProgress) {
  if (supabase) {
    const a = await supabase.from("study_plans").insert(newPlan);
    if (a.error) throw a.error;
    const b = await supabase.from("study_subjects").insert(subjectRows);
    if (b.error) throw b.error;
    const c = await supabase.from("study_tasks").insert(taskRows);
    if (c.error) throw c.error;
    const migrated = taskRows.filter((task) => {
      if (task.type === "lecture") return oldProgress[`${task.study_date}|lecture|${subjectRows.find(s => s.id === task.subject_id)?.name}|${task.lecture_number}`];
      return oldProgress[starterTasks(task.study_date).find(x => x.type === "ox" && x.label.startsWith(subjectRows.find(s => s.id === task.subject_id)?.name))?.id];
    }).map((task) => ({ id: crypto.randomUUID(), user_id: user.id, plan_id: newPlan.id, task_id: task.id, completed_at: new Date().toISOString() }));
    if (migrated.length) await supabase.from("study_progress").insert(migrated);
  } else {
    localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ plan: newPlan, subjects: subjectRows, tasks: taskRows, progress: oldProgress }));
  }
  plan = newPlan; subjects = subjectRows; tasks = taskRows; progress = oldProgress;
  plans = [newPlan]; persistLocal(); if (supabase) subscribeToProgress(); render();
}
async function loadUserData() {
  const { data: planRows, error } = await supabase.from("study_plans").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  plans = planRows || [];
  plan = plans[0] || null;
  if (!plan) { onboardingView(); return; }
  const [{ data: subjectRows, error: subjectError }, { data: taskRows, error: taskError }, { data: doneRows, error: progressError }] = await Promise.all([
    supabase.from("study_subjects").select("*").eq("plan_id", plan.id).order("sort_order"),
    supabase.from("study_tasks").select("*").eq("plan_id", plan.id).order("study_date"),
    supabase.from("study_progress").select("task_id,completed_at").eq("plan_id", plan.id),
  ]);
  if (subjectError || taskError || progressError) throw subjectError || taskError || progressError;
  subjects = subjectRows || []; tasks = taskRows || []; progress = Object.fromEntries((doneRows || []).map((row) => [row.task_id, row.completed_at || true]));
  localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ plan, subjects, tasks, progress }));
  subscribeToProgress();
}
function subscribeToProgress() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase.channel(`progress-${plan.id}`).on("postgres_changes", { event: "*", schema: "public", table: "study_progress", filter: `plan_id=eq.${plan.id}` }, async () => {
    const { data } = await supabase.from("study_progress").select("task_id,completed_at").eq("plan_id", plan.id);
    progress = Object.fromEntries((data || []).map((row) => [row.task_id, row.completed_at || true])); persistLocal(); render();
  }).subscribe();
}
async function setTasks(taskIds, isDone) {
  const previous = { ...progress };
  for (const taskId of taskIds) {
    if (isDone) progress[taskId] = new Date().toISOString(); else delete progress[taskId];
  }
  persistLocal(); render();
  if (!supabase || !user || !plan) { syncMessage = "이 기기에 저장 중"; render(); return; }
  syncMessage = "클라우드에 저장 중"; render();
  const result = isDone
    ? await supabase.from("study_progress").upsert(taskIds.map((task_id) => ({ user_id: user.id, plan_id: plan.id, task_id, completed_at: new Date().toISOString() })), { onConflict: "task_id" })
    : await supabase.from("study_progress").delete().in("task_id", taskIds);
  if (result.error) progress = previous;
  persistLocal();
  syncMessage = result.error ? "동기화 오류: 다시 로그인하거나 연결을 확인해 주세요." : "클라우드에 저장됨 · 다른 기기와 동기화";
  render();
}
async function setTask(taskId, isDone) { return setTasks([taskId], isDone); }
async function signOut() {
  if (supabase) await supabase.auth.signOut();
  user = null; plan = null; subjects = []; tasks = []; progress = {}; render();
}

function renderTasks() {
  const dayTasks = visibleTasksOn(selectedDate);
  const completed = dayTasks.filter((task) => progress[task.id]).length;
  const percent = dayTasks.length ? Math.round(completed / dayTasks.length * 100) : 0;
  const names = [...new Set(dayTasks.map((task) => subjects.find((s) => s.id === task.subject_id)?.name).filter(Boolean))];
  const lectureTasks = dayTasks.filter((task) => task.type === "lecture");
  const estimatedLectureCount = lectureTasks.filter((task) => task.duration_estimated).length;
  const studyMinutes = lectureTasks.reduce((sum, task) => sum + Number(task.duration_minutes || subjects.find((subject) => subject.id === task.subject_id)?.avg_minutes || 60), 0);
  const hours = Math.floor(studyMinutes / 60); const minutes = studyMinutes % 60;
  const timeLabel = hours ? `${hours}시간${minutes ? ` ${minutes}분` : ""}` : `${minutes}분`;
  const activeSubject = currentSubject();
  const stageStatus = activeSubject ? `현재 과목: ${activeSubject.name} · ${subjectDoneCount(activeSubject)}/${activeSubject.lecture_count}강 완료 · 전부 완료하면 다음 과목이 열립니다.` : "모든 과목을 완료했습니다. 수고하셨어요.";
  return `<section class="card today-card"><div class="section-heading"><div><p class="eyebrow">${selectedDate === todayInKorea() ? "오늘의 공부" : "선택한 날짜의 공부"}</p><h2>${formatDate(selectedDate)}</h2></div><span class="subject-pill">${escapeHTML(names.join(" · ") || "휴식일")}</span></div><p class="stage-note">${escapeHTML(stageStatus)}</p>${dayTasks.length ? `<div class="study-time"><span>예상 강의 시간</span><strong>약 ${timeLabel}</strong><small>${lectureTasks.length}개 항목 · OX 복습 시간 제외${estimatedLectureCount ? ` · ${estimatedLectureCount}개 시간 추정` : ""}</small></div>` : ""}<div class="progress-label"><span>달성률</span><strong>${percent}%</strong></div>${progressBar(percent, "선택 날짜 달성률")}${dayTasks.length ? `<div class="task-list">${dayTasks.map((task) => `<label class="task ${progress[task.id] ? "is-done" : ""}"><input type="checkbox" data-task="${task.id}" ${progress[task.id] ? "checked" : ""}><span class="task-name">${escapeHTML(displayLabel(task))}${task.type === "lecture" && task.duration_minutes ? `<small>약 ${task.duration_minutes}분${task.duration_estimated ? " · 추정" : ""}</small>` : ""}</span></label>`).join("")}</div>` : '<div class="rest-note">이 날짜에는 현재 과목에서 할 일이 없어요. 휴식하거나 밀린 진도를 정리해도 좋습니다.</div>'}<div class="button-row"><button class="button button-primary" id="complete-day" ${dayTasks.length ? "" : "disabled"}>모두 완료</button><button class="button" id="reset-day" ${dayTasks.length ? "" : "disabled"}>초기화</button></div></section>`;
}
function renderOverview() {
  const total = subjects.reduce((n, s) => n + Number(s.lecture_count), 0);
  const done = tasks.filter((task) => task.type === "lecture" && progress[task.id]).length;
  const remaining = Math.max(total - done, 0);
  const percent = total ? Math.round(done / total * 100) : 0;
  const subjectMarkup = subjects.map((subject) => { const count = Number(subject.lecture_count); const countDone = subjectDoneCount(subject); const p = count ? Math.round(countDone / count * 100) : 0; return `<div class="subject-progress" style="--subject-color:${escapeHTML(subject.color || "#397653")}"><div class="progress-label"><strong>${escapeHTML(subject.name)}</strong><span>${countDone}/${count}강 · ${p}%</span></div>${progressBar(p, subject.name + " 진도율")}</div>`; }).join("");
  const left = daysBetween(todayInKorea(), plan.target_date);
  const dday = left > 0 ? `D-${left}` : left === 0 ? "D-DAY" : `D+${Math.abs(left)}`;
  return `<section class="card overview-card"><div class="section-heading"><div><p class="eyebrow">전체 진도</p><h2>과목별 현황</h2></div><span class="dday">${dday}</span></div>${subjectMarkup}<div class="stats"><div><span>완료 강의</span><strong>${done}</strong></div><div><span>남은 강의</span><strong>${remaining}</strong></div><div><span>전체 진도</span><strong>${percent}%</strong></div></div><p class="target-message">완강 목표일까지 <strong>${Math.abs(left)}일</strong> ${left >= 0 ? "남았습니다." : "지났습니다."} 남은 강의 ${remaining}강</p></section>`;
}
function monthMarkup(year, month) {
  const first = new Date(Date.UTC(year, month, 1, 12)); const count = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  const cells = Array.from({ length: first.getUTCDay() }, () => '<span class="calendar-empty"></span>');
  for (let day = 1; day <= count; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const dayTasks = plannedTasksOn(date);
    const done = dayTasks.length && dayTasks.every((task) => progress[task.id]);
    const daySubjects = [...new Set(dayTasks.map((task) => task.subject_id))].map((id) => subjects.find((subject) => subject.id === id)).filter(Boolean);
    const colors = daySubjects.map((subject) => subject.color || subjectColors[0]);
    const dayColor = colors.length > 1 ? `linear-gradient(135deg, ${colors.map((color, i) => `${color} ${i * 100 / colors.length}% ${(i + 1) * 100 / colors.length}%`).join(", ")})` : colors[0];
    const classes = ["calendar-day", dayTasks.length ? "has-plan" : "", done ? "is-done" : "", date === selectedDate ? "is-selected" : "", date === todayInKorea() ? "is-today" : ""].filter(Boolean).join(" ");
    const subjectNames = daySubjects.map((subject) => subject.name).join(", ");
    cells.push(`<button class="${classes}" style="${dayColor ? `--day-color:${dayColor}` : ""}" data-date="${date}" aria-label="${formatDate(date, { month: "long", day: "numeric" })}${subjectNames ? `, ${escapeHTML(subjectNames)} 학습` : ", 휴식일"}"><span>${day}</span>${dayTasks.length ? '<i aria-hidden="true"></i>' : ""}</button>`);
  }
  return `<div class="month"><h3>${year}년 ${month + 1}월</h3><div class="calendar-grid">${weekdays.map((day) => `<span class="weekday">${day}</span>`).join("")}${cells.join("")}</div></div>`;
}
function render() {
  if (passwordRecoveryMode) { passwordResetView(); return; }
  if (!user) { authView(); return; }
  if (!plan) { onboardingView(); return; }
  const start = dateFromISO(plan.start_date); const end = dateFromISO(plan.target_date);
  const months = [];
  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 12)); d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(monthMarkup(d.getUTCFullYear(), d.getUTCMonth()));
  const legend = subjects.map((subject) => `<span><i style="background:${escapeHTML(subject.color || "#ddd")}"></i>${escapeHTML(subject.name)}</span>`).join("");
  document.querySelector("#app").innerHTML = `<main class="page-shell"><header class="page-header"><div><p class="eyebrow">나의 학습 공간 · ${escapeHTML(plan.title)}</p><h1>Study Planner</h1><p class="subtitle">${subjects.reduce((n,s)=>n+Number(s.lecture_count),0)}강 · 완강 목표 ${formatDate(plan.target_date,{year:"numeric",month:"long",day:"numeric"})} · ${plan.include_weekends ? "주말 포함" : "평일만 공부"}</p></div><div class="account-tools"><span class="timezone-badge">한국 시간 · KST</span><span class="sync-state">${escapeHTML(syncMessage)}</span><button class="button" id="sign-out">로그아웃</button></div></header><div class="dashboard">${renderTasks()}${renderOverview()}<section class="card calendar-card"><div class="section-heading"><div><p class="eyebrow">학습 일정</p><h2>캘린더</h2></div><span class="calendar-key">${legend}</span></div><div class="months">${months.join("")}</div><p class="calendar-help">날짜를 누르면 해당 날짜의 계획을 볼 수 있어요. 날짜 기준은 한국 시간입니다. ${plan.include_weekends ? "주말도 일정에 포함했습니다." : "평일만 공부하도록 설정했습니다."}</p></section></div><footer>${supabase ? "학습 기록은 계정에 안전하게 저장되며, 로그인하면 다른 기기에서도 이어집니다." : "클라우드 연결 전이어서 현재 기록은 이 브라우저에 저장됩니다."} 강의 시간은 입력한 과목별 평균으로 추산하며, OX 복습 시간은 제외합니다.</footer></main>`;
  document.querySelector("#sign-out").addEventListener("click", signOut);
  document.querySelectorAll("[data-task]").forEach((input) => input.addEventListener("change", (event) => setTask(event.currentTarget.dataset.task, event.currentTarget.checked)));
  document.querySelector("#complete-day").addEventListener("click", async () => { await setTasks(visibleTasksOn(selectedDate).map((task) => task.id), true); });
  document.querySelector("#reset-day").addEventListener("click", async () => { await setTasks(visibleTasksOn(selectedDate).map((task) => task.id), false); });
  document.querySelectorAll("[data-date]").forEach((button) => button.addEventListener("click", () => { selectedDate = button.dataset.date; render(); }));
}

async function start() {
  const configResponse = await fetch("/api/study-planner-config").catch(() => null);
  const config = configResponse?.ok ? await configResponse.json() : {};
  if (config.url && config.anonKey) {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(config.url, config.anonKey);
  }
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      user = session.user;
      try { await loadUserData(); } catch (error) { authView(error.message); return; }
    }
    supabase.auth.onAuthStateChange(async (_event, session) => {
      user = session?.user || null;
      if (user) { try { await loadUserData(); } catch (error) { authView(error.message); return; } }
      else { plan = null; render(); }
    });
  } else {
    const local = readLocal(LOCAL_PLAN_KEY, null);
    user = { id: "local" };
    if (local?.plan) ({ plan, subjects, tasks, progress } = local);
    else { plan = { id: "local-plan", title: "Study Planner", start_date: "2026-11-20", target_date: END_DATE }; subjects = starterSubjects.map((s, i) => ({ id: String(i), name: s.name, lecture_count: s.name === "행정법총론" ? 86 : s.end - s.start + 1, avg_minutes: starterMinutes[i], color: subjectColors[i] })); tasks = makeStarterTasks(subjects, true); progress = readLocal(STORAGE_KEY, {}); }
    if (!plan) onboardingView(); else render();
    return;
  }
  render();
}
start();

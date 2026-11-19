import { END_DATE, TIME_ZONE, TOTAL_LECTURES, subjects as starterSubjects, tasksForDate as starterTasks } from "./plan.js";

const STORAGE_KEY = "fire-study-planner-progress-v1";
const LOCAL_PLAN_KEY = "fire-study-planner-plan-v2";
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const subjectColors = ["#e4f0ff", "#fde5e5", "#fff2c9", "#e6f3e8", "#efe7ff", "#ffe9d8"];
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

function todayInKorea() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function dateFromISO(date) { const [y, m, d] = date.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); }
function formatDate(date, options = { year: "numeric", month: "long", day: "numeric", weekday: "long" }) { return new Intl.DateTimeFormat("ko-KR", { ...options, timeZone: "UTC" }).format(dateFromISO(date)); }
function daysBetween(from, to) { return Math.round((dateFromISO(to) - dateFromISO(from)) / 86400000); }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function readLocal(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function persistLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ plan, subjects, tasks })); }
function displayLabel(task) {
  const subject = subjects.find((item) => item.id === task.subject_id);
  if (task.type === "ox") return `${subject?.name ?? ""} ${task.range_start}~${task.range_end}강 OX`;
  return `${subject?.name ?? ""} ${task.lecture_number}강`;
}
function tasksOn(date) { return tasks.filter((task) => task.study_date === date); }
function subjectDoneCount(subject) { return tasks.filter((task) => task.subject_id === subject.id && task.type === "lecture" && progress[task.id]).length; }
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
  if (!days.length) throw new Error("목표 날짜 사이에 평일이 없습니다. 날짜를 확인해 주세요.");
  const rows = [];
  for (const subject of subjectRows) {
    let previous = 0;
    for (let i = 0; i < days.length; i += 1) {
      const current = Math.floor(((i + 1) * subject.lecture_count) / days.length);
      if (current > previous) {
        for (let number = previous + 1; number <= current; number += 1) rows.push({ id: crypto.randomUUID(), subject_id: subject.id, type: "lecture", lecture_number: number, range_start: null, range_end: null, study_date: days[i], user_id: user?.id });
        rows.push({ id: crypto.randomUUID(), subject_id: subject.id, type: "ox", lecture_number: null, range_start: previous + 1, range_end: current, study_date: days[i], user_id: user?.id });
      }
      previous = current;
    }
  }
  return rows;
}
function authView(message = "") {
  document.querySelector("#app").innerHTML = `<main class="page-shell"><header class="page-header"><div><p class="eyebrow">공부 기록을 여러 기기에서 이어가세요</p><h1>Study Planner</h1><p class="subtitle">계정으로 로그인하면 기록이 클라우드에 저장됩니다.</p></div><span class="timezone-badge">한국 시간 · KST</span></header>
  <section class="card auth-card"><h2>내 학습 공간</h2><p class="subtitle">처음이라면 새 계정을 만드세요. 현재 로그인 ID는 이메일 주소입니다. admin/admin처럼 공개된 비밀번호 대신 본인만 아는 비밀번호를 설정해 주세요.</p><form id="auth-form"><label class="field">ID (이메일 주소)<input name="email" type="email" autocomplete="username" required placeholder="가입에 사용할 이메일"></label><label class="field">비밀번호<input name="password" type="password" minlength="8" autocomplete="current-password" required placeholder="8자 이상"></label><div class="button-row"><button class="button button-primary" name="action" value="signup">새 계정 만들기</button><button class="button" name="action" value="login">로그인</button></div></form><p class="notice" role="status">${escapeHTML(message || (supabase ? "새 계정 만들기 → 이메일 확인 → 이 화면에서 로그인 순서로 진행하세요." : "클라우드 연결 설정 전입니다. 현재는 이 기기에만 저장됩니다."))}</p></section></main>`;
  document.querySelector("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const action = event.submitter?.value || "login";
    const email = new FormData(event.currentTarget).get("email");
    const password = new FormData(event.currentTarget).get("password");
    if (!supabase) { authView("클라우드 설정이 아직 완료되지 않았습니다. 잠시 후 다시 이용해 주세요."); return; }
    const result = action === "signup" ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { authView(result.error.message); return; }
    if (action === "signup" && !result.data.session) authView("가입 확인 이메일을 보냈습니다. 이메일 확인을 마친 뒤 로그인해 주세요.");
    else { user = result.data.user; await loadUserData(); render(); }
  });
}
function onboardingView(message = "") {
  const today = todayInKorea();
  const blankSubject = '<div class="subject-input-row"><input name="subjectName" required placeholder="과목명"><input name="lectureCount" type="number" min="1" required placeholder="강의 수"><label class="minutes-field"><input name="avgMinutes" type="number" min="1" max="600" value="60" required aria-label="강의 한 편의 평균 시간"><span>분/강</span></label><button type="button" class="button remove-subject" aria-label="과목 삭제">×</button></div>';
  document.querySelector("#app").innerHTML = `<main class="page-shell"><header class="page-header"><div><p class="eyebrow">나만의 학습 계획</p><h1>Study Planner</h1><p class="subtitle">과목과 강의 수, 한 강의 시간, 완강 목표일을 입력하면 계정에 맞는 일정표를 만듭니다.</p></div><button class="button" id="sign-out">로그아웃</button></header>
  <section class="card setup-card"><div class="setup-heading"><div><h2>학습 계획 설정</h2><p>입력한 정보와 완료 기록은 현재 계정에 저장됩니다. 다른 계정의 계획과 기록은 보이지 않습니다.</p></div><button class="button" type="button" id="load-fire-template">소방시험 과목 채우기</button></div><form id="plan-form"><label class="field">계획 이름<input name="title" required value="나의 학습 계획"></label><div class="field-row"><label class="field">공부 시작일<input name="start" type="date" required value="${today}"></label><label class="field">완강 목표일<input name="end" type="date" required value="${escapeHTML(END_DATE)}"></label></div><div class="field"><span>과목별 강의 정보</span><div id="subject-fields">${blankSubject}</div></div><label class="weekend-option"><input name="includeWeekends" type="checkbox"><span><strong>주말에도 공부하기</strong><small>선택하면 토요일과 일요일도 일정에 포함합니다.</small></span></label><div class="button-row"><button class="button" type="button" id="add-subject">과목 추가</button><button class="button button-primary" type="submit">내 학습 일정 만들기</button></div></form></section><p class="notice" role="status">${escapeHTML(message)}</p></main>`;
  document.querySelector("#sign-out").addEventListener("click", signOut);
  document.querySelector("#add-subject").addEventListener("click", () => {
    const template = document.createElement("template"); template.innerHTML = blankSubject;
    const newRow = template.content.firstElementChild;
    document.querySelector("#subject-fields").appendChild(newRow);
    newRow.querySelector(".remove-subject").addEventListener("click", () => { if (document.querySelectorAll(".subject-input-row").length > 1) newRow.remove(); });
  });
  document.querySelectorAll(".remove-subject").forEach((button) => button.addEventListener("click", () => { if (document.querySelectorAll(".subject-input-row").length > 1) button.closest(".subject-input-row").remove(); }));
  document.querySelector("#load-fire-template").addEventListener("click", () => {
    document.querySelector("#subject-fields").innerHTML = starterSubjects.map((item, index) => `<div class="subject-input-row"><input name="subjectName" required value="${escapeHTML(item.name)}" aria-label="과목명"><input name="lectureCount" type="number" min="1" required value="${item.end - item.start + 1}" aria-label="강의 수"><label class="minutes-field"><input name="avgMinutes" type="number" min="1" max="600" value="${starterMinutes[index]}" required aria-label="강의 한 편의 평균 시간"><span>분/강</span></label><button type="button" class="button remove-subject" aria-label="과목 삭제">×</button></div>`).join("");
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
    supabase.from("study_progress").select("task_id").eq("plan_id", plan.id),
  ]);
  if (subjectError || taskError || progressError) throw subjectError || taskError || progressError;
  subjects = subjectRows || []; tasks = taskRows || []; progress = Object.fromEntries((doneRows || []).map((row) => [row.task_id, true]));
  localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify({ plan, subjects, tasks, progress }));
  subscribeToProgress();
}
function subscribeToProgress() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase.channel(`progress-${plan.id}`).on("postgres_changes", { event: "*", schema: "public", table: "study_progress", filter: `plan_id=eq.${plan.id}` }, async () => {
    const { data } = await supabase.from("study_progress").select("task_id").eq("plan_id", plan.id);
    progress = Object.fromEntries((data || []).map((row) => [row.task_id, true])); persistLocal(); render();
  }).subscribe();
}
async function setTasks(taskIds, isDone) {
  const previous = { ...progress };
  for (const taskId of taskIds) {
    if (isDone) progress[taskId] = true; else delete progress[taskId];
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
  const dayTasks = tasksOn(selectedDate);
  const completed = dayTasks.filter((task) => progress[task.id]).length;
  const percent = dayTasks.length ? Math.round(completed / dayTasks.length * 100) : 0;
  const names = [...new Set(dayTasks.map((task) => subjects.find((s) => s.id === task.subject_id)?.name).filter(Boolean))];
  const lectureTasks = dayTasks.filter((task) => task.type === "lecture");
  const studyMinutes = lectureTasks.reduce((sum, task) => sum + Number(subjects.find((subject) => subject.id === task.subject_id)?.avg_minutes || 60), 0);
  const hours = Math.floor(studyMinutes / 60); const minutes = studyMinutes % 60;
  const timeLabel = hours ? `${hours}시간${minutes ? ` ${minutes}분` : ""}` : `${minutes}분`;
  return `<section class="card today-card"><div class="section-heading"><div><p class="eyebrow">${selectedDate === todayInKorea() ? "오늘의 공부" : "선택한 날짜의 공부"}</p><h2>${formatDate(selectedDate)}</h2></div><span class="subject-pill">${escapeHTML(names.join(" · ") || "휴식일")}</span></div>${dayTasks.length ? `<div class="study-time"><span>예상 강의 시간</span><strong>약 ${timeLabel}</strong><small>${lectureTasks.length}강 · OX 복습 시간 제외</small></div>` : ""}<div class="progress-label"><span>달성률</span><strong>${percent}%</strong></div>${progressBar(percent, "선택 날짜 달성률")}${dayTasks.length ? `<div class="task-list">${dayTasks.map((task) => `<label class="task ${progress[task.id] ? "is-done" : ""}"><input type="checkbox" data-task="${task.id}" ${progress[task.id] ? "checked" : ""}><span>${escapeHTML(displayLabel(task))}</span></label>`).join("")}</div>` : '<div class="rest-note">이 날짜에는 계획된 강의가 없어요. 휴식하거나 밀린 진도를 정리해도 좋습니다.</div>'}<div class="button-row"><button class="button button-primary" id="complete-day" ${dayTasks.length ? "" : "disabled"}>모두 완료</button><button class="button" id="reset-day" ${dayTasks.length ? "" : "disabled"}>초기화</button></div></section>`;
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
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const dayTasks = tasksOn(date);
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
  if (!user) { authView(); return; }
  if (!plan) { onboardingView(); return; }
  const start = dateFromISO(plan.start_date); const end = dateFromISO(plan.target_date);
  const months = [];
  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 12)); d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(monthMarkup(d.getUTCFullYear(), d.getUTCMonth()));
  const legend = subjects.map((subject) => `<span><i style="background:${escapeHTML(subject.color || "#ddd")}"></i>${escapeHTML(subject.name)}</span>`).join("");
  document.querySelector("#app").innerHTML = `<main class="page-shell"><header class="page-header"><div><p class="eyebrow">나의 학습 공간 · ${escapeHTML(plan.title)}</p><h1>Study Planner</h1><p class="subtitle">${subjects.reduce((n,s)=>n+Number(s.lecture_count),0)}강 · 완강 목표 ${formatDate(plan.target_date,{year:"numeric",month:"long",day:"numeric"})} · ${plan.include_weekends ? "주말 포함" : "평일만 공부"}</p></div><div class="account-tools"><span class="timezone-badge">한국 시간 · KST</span><span class="sync-state">${escapeHTML(syncMessage)}</span><button class="button" id="sign-out">로그아웃</button></div></header><div class="dashboard">${renderTasks()}${renderOverview()}<section class="card calendar-card"><div class="section-heading"><div><p class="eyebrow">학습 일정</p><h2>캘린더</h2></div><span class="calendar-key">${legend}</span></div><div class="months">${months.join("")}</div><p class="calendar-help">날짜를 누르면 해당 날짜의 계획을 볼 수 있어요. 날짜 기준은 한국 시간입니다. ${plan.include_weekends ? "주말도 일정에 포함했습니다." : "평일만 공부하도록 설정했습니다."}</p></section></div><footer>${supabase ? "학습 기록은 계정에 안전하게 저장되며, 로그인하면 다른 기기에서도 이어집니다." : "클라우드 연결 전이어서 현재 기록은 이 브라우저에 저장됩니다."} 강의 시간은 입력한 과목별 평균으로 추산하며, OX 복습 시간은 제외합니다.</footer></main>`;
  document.querySelector("#sign-out").addEventListener("click", signOut);
  document.querySelectorAll("[data-task]").forEach((input) => input.addEventListener("change", (event) => setTask(event.currentTarget.dataset.task, event.currentTarget.checked)));
  document.querySelector("#complete-day").addEventListener("click", async () => { await setTasks(tasksOn(selectedDate).map((task) => task.id), true); });
  document.querySelector("#reset-day").addEventListener("click", async () => { await setTasks(tasksOn(selectedDate).map((task) => task.id), false); });
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
    else { plan = { id: "local-plan", title: "소방시험 Study Planner", start_date: "2026-11-20", target_date: END_DATE }; subjects = starterSubjects.map((s, i) => ({ id: String(i), name: s.name, lecture_count: s.end - s.start + 1, avg_minutes: starterMinutes[i], color: subjectColors[i] })); tasks = makeStarterTasks(subjects, true); progress = readLocal(STORAGE_KEY, {}); }
    if (!plan) onboardingView(); else render();
    return;
  }
  render();
}
start();

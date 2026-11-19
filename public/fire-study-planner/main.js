import { END_DATE, TIME_ZONE, TOTAL_LECTURES, planForDate, subjects, tasksForDate } from "./plan.js";

const STORAGE_KEY = "fire-study-planner-progress-v1";
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
let progress = readProgress();
let selectedDate = todayInKorea();

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function todayInKorea() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateFromISO(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatDate(date, options = { year: "numeric", month: "long", day: "numeric", weekday: "long" }) {
  return new Intl.DateTimeFormat("ko-KR", { ...options, timeZone: "UTC" }).format(dateFromISO(date));
}

function daysBetween(from, to) {
  return Math.round((dateFromISO(to) - dateFromISO(from)) / 86_400_000);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function completedLectureCount(subject) {
  let count = 0;
  for (const [date, first, last] of subject.days) {
    for (let lecture = first; lecture <= last; lecture += 1) {
      if (progress[`${date}|lecture|${subject.name}|${lecture}`]) count += 1;
    }
  }
  return count;
}

function allCompletedLectureCount() {
  return subjects.reduce((sum, subject) => sum + completedLectureCount(subject), 0);
}

function progressBar(percent, label) {
  return `<div class="progress" role="progressbar" aria-label="${escapeHTML(label)}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${percent}%"></div></div>`;
}

function renderTasks() {
  const plan = planForDate(selectedDate);
  const tasks = tasksForDate(selectedDate);
  const percent = tasks.length ? Math.round((tasks.filter((task) => progress[task.id]).length / tasks.length) * 100) : 0;
  const dayLabel = selectedDate === todayInKorea() ? "오늘의 공부" : "선택한 날짜의 공부";
  const taskMarkup = tasks.length
    ? `<div class="task-list">${tasks.map((task) => `
        <label class="task ${progress[task.id] ? "is-done" : ""}">
          <input type="checkbox" data-task="${escapeHTML(task.id)}" ${progress[task.id] ? "checked" : ""} />
          <span>${escapeHTML(task.label)}</span>
        </label>`).join("")}</div>`
    : `<div class="rest-note">이 날짜에는 계획된 강의가 없어요. 휴식하거나 밀린 진도를 정리해도 좋습니다.</div>`;

  return `<section class="card today-card">
    <div class="section-heading">
      <div><p class="eyebrow">${dayLabel}</p><h2>${formatDate(selectedDate)}</h2></div>
      <span class="subject-pill">${plan ? escapeHTML(plan.subject.name) : "휴식일"}</span>
    </div>
    <div class="progress-label"><span>달성률</span><strong>${percent}%</strong></div>
    ${progressBar(percent, "선택 날짜 달성률")}
    ${taskMarkup}
    <div class="button-row">
      <button class="button button-primary" id="complete-day" ${tasks.length ? "" : "disabled"}>모두 완료</button>
      <button class="button" id="reset-day" ${tasks.length ? "" : "disabled"}>초기화</button>
    </div>
  </section>`;
}

function renderOverview() {
  const done = allCompletedLectureCount();
  const remaining = TOTAL_LECTURES - done;
  const overall = Math.round((done / TOTAL_LECTURES) * 100);
  const subjectMarkup = subjects.map((subject) => {
    const count = subject.end - subject.start + 1;
    const subjectDone = completedLectureCount(subject);
    const percent = Math.round((subjectDone / count) * 100);
    return `<div class="subject-progress">
      <div class="progress-label"><strong>${escapeHTML(subject.name)}</strong><span>${subjectDone}/${count}강 · ${percent}%</span></div>
      ${progressBar(percent, `${subject.name} 진도율`)}
    </div>`;
  }).join("");
  const daysLeft = daysBetween(todayInKorea(), END_DATE);
  const ddayLabel = daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? "D-DAY" : `D+${Math.abs(daysLeft)}`;
  const targetMessage = daysLeft >= 0
    ? `완강 목표일까지 <strong>${daysLeft}일</strong> 남았습니다.`
    : `완강 목표일이 <strong>${Math.abs(daysLeft)}일</strong> 지났습니다.`;

  return `<section class="card overview-card">
    <div class="section-heading"><div><p class="eyebrow">전체 진도</p><h2>과목별 현황</h2></div><span class="dday">${ddayLabel}</span></div>
    ${subjectMarkup}
    <div class="stats">
      <div><span>완료 강의</span><strong>${done}</strong></div>
      <div><span>남은 강의</span><strong>${remaining}</strong></div>
      <div><span>전체 진도</span><strong>${overall}%</strong></div>
    </div>
    <p class="target-message">${targetMessage} 남은 강의 ${remaining}강</p>
  </section>`;
}

function monthMarkup(year, month) {
  const first = new Date(Date.UTC(year, month, 1, 12));
  const days = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  const leading = first.getUTCDay();
  const cells = Array.from({ length: leading }, () => '<span class="calendar-empty"></span>');
  for (let day = 1; day <= days; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const tasks = tasksForDate(date);
    const isDone = tasks.length > 0 && tasks.every((task) => progress[task.id]);
    const classes = ["calendar-day", tasks.length ? "has-plan" : "", isDone ? "is-done" : "", date === selectedDate ? "is-selected" : "", date === todayInKorea() ? "is-today" : ""].filter(Boolean).join(" ");
    cells.push(`<button class="${classes}" data-date="${date}" aria-label="${formatDate(date, { month: "long", day: "numeric" })}${tasks.length ? ", 학습 계획 있음" : ", 휴식일"}"><span>${day}</span>${tasks.length ? '<i aria-hidden="true"></i>' : ""}</button>`);
  }
  return `<div class="month"><h3>${year}년 ${month + 1}월</h3><div class="calendar-grid">${weekdays.map((day) => `<span class="weekday">${day}</span>`).join("")}${cells.join("")}</div></div>`;
}

function renderCalendar() {
  return `<section class="card calendar-card"><div class="section-heading"><div><p class="eyebrow">학습 일정</p><h2>캘린더</h2></div><span class="calendar-key"><i></i> 계획일</span></div>
    <div class="months">${monthMarkup(2026, 10)}${monthMarkup(2026, 11)}${monthMarkup(2027, 0)}</div>
    <p class="calendar-help">날짜를 누르면 해당 날짜의 계획을 볼 수 있어요. 날짜 기준은 한국 시간입니다.</p>
  </section>`;
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = `<main class="page-shell">
    <header class="page-header"><div><p class="eyebrow">소방시험 준비</p><h1>Study Planner</h1><p class="subtitle">297강 · 완강 목표 ${formatDate(END_DATE, { year: "numeric", month: "long", day: "numeric" })}</p></div><span class="timezone-badge">한국 시간 · KST</span></header>
    <div class="dashboard">${renderTasks()}${renderOverview()}${renderCalendar()}</div>
    <footer>학습 체크 내용은 현재 이 브라우저에 저장됩니다. 다른 기기와 동기화하려면 추후 계정 및 클라우드 저장 기능이 필요합니다.</footer>
  </main>`;

  app.querySelectorAll("[data-task]").forEach((input) => input.addEventListener("change", (event) => {
    const taskId = event.currentTarget.dataset.task;
    if (event.currentTarget.checked) progress[taskId] = true;
    else delete progress[taskId];
    saveProgress();
    render();
  }));
  app.querySelector("#complete-day")?.addEventListener("click", () => {
    tasksForDate(selectedDate).forEach((task) => { progress[task.id] = true; });
    saveProgress();
    render();
  });
  app.querySelector("#reset-day")?.addEventListener("click", () => {
    tasksForDate(selectedDate).forEach((task) => { delete progress[task.id]; });
    saveProgress();
    render();
  });
  app.querySelectorAll("[data-date]").forEach((button) => button.addEventListener("click", () => {
    selectedDate = button.dataset.date;
    render();
  }));
}

render();

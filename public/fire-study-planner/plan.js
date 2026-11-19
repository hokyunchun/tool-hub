export const START_DATE = "2026-11-20";
export const END_DATE = "2027-01-15";
export const TIME_ZONE = "Asia/Seoul";

export const subjects = [
  {
    name: "행정법총론",
    start: 2,
    end: 86,
    days: [
      ["2026-11-20", 2, 7], ["2026-11-23", 8, 13], ["2026-11-24", 14, 19],
      ["2026-11-25", 20, 25], ["2026-11-26", 26, 31], ["2026-11-27", 32, 37],
      ["2026-11-30", 38, 43], ["2026-12-01", 44, 49], ["2026-12-02", 50, 55],
      ["2026-12-03", 56, 61], ["2026-12-04", 62, 67], ["2026-12-07", 68, 73],
      ["2026-12-08", 74, 79], ["2026-12-09", 80, 86],
    ],
  },
  {
    name: "소방관계법규",
    start: 1,
    end: 104,
    days: [
      ["2026-12-10", 1, 8], ["2026-12-11", 9, 16], ["2026-12-14", 17, 24],
      ["2026-12-15", 25, 32], ["2026-12-16", 33, 40], ["2026-12-17", 41, 48],
      ["2026-12-18", 49, 56], ["2026-12-21", 57, 64], ["2026-12-22", 65, 72],
      ["2026-12-23", 73, 80], ["2026-12-24", 81, 88], ["2026-12-25", 89, 96],
      ["2026-12-28", 97, 104],
    ],
  },
  {
    name: "소방학개론",
    start: 1,
    end: 107,
    days: [
      ["2026-12-29", 1, 8], ["2026-12-30", 9, 16], ["2026-12-31", 17, 24],
      ["2027-01-01", 25, 32], ["2027-01-04", 33, 40], ["2027-01-05", 41, 48],
      ["2027-01-06", 49, 56], ["2027-01-07", 57, 64], ["2027-01-08", 65, 72],
      ["2027-01-11", 73, 79], ["2027-01-12", 80, 86], ["2027-01-13", 87, 93],
      ["2027-01-14", 94, 100], ["2027-01-15", 101, 107],
    ],
  },
];

export const TOTAL_LECTURES = subjects.reduce((sum, subject) => sum + subject.end - subject.start + 1, 0);

export function planForDate(date) {
  for (const subject of subjects) {
    const range = subject.days.find(([day]) => day === date);
    if (range) return { subject, first: range[1], last: range[2] };
  }
  return null;
}

export function tasksForDate(date) {
  const plan = planForDate(date);
  if (!plan) return [];
  const tasks = [];
  for (let lecture = plan.first; lecture <= plan.last; lecture += 1) {
    tasks.push({ id: `${date}|lecture|${plan.subject.name}|${lecture}`, label: `${plan.subject.name} ${lecture}강`, type: "lecture" });
  }
  tasks.push({
    id: `${date}|ox|${plan.subject.name}|${plan.first}-${plan.last}`,
    label: `${plan.subject.name} ${plan.first}~${plan.last}강 OX`,
    type: "ox",
  });
  return tasks;
}

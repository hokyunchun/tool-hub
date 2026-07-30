export type Tool = {
  slug: string;        // URL 경로 (예: "pomodoro")
  name: string;        // 표시 이름
  description: string; // 한 줄 설명
  category: string;    // 카테고리 (생산성, 재무, 텍스트 등)
  emoji: string;        // 목록에서 보일 아이콘
  status: "live" | "wip"; // 배포 완료 / 제작중
};

// 새 미니서비스를 만들 때마다 여기에 한 줄 추가하세요.
// 폴더는 app/tools/{slug}/page.tsx 로 만들면 자동 연결됩니다.
export const tools: Tool[] = [
  {
    slug: "pomodoro",
    name: "Focus Disc",
    description: "실물 타임타이머를 닮은 직관적 뽀모도로 타이머. AI 코멘트 지원.",
    category: "생산성",
    emoji: "⏱️",
    status: "live",
  },
  {
    slug: "founder-pipeline",
    name: "Founder Pipeline",
    description: "문제정의부터 가설검증까지, 매일 클릭하며 실행하는 1인 창업 파이프라인.",
    category: "생산성",
    emoji: "🧭",
    status: "live",
  },
  {
    slug: "worklog",
    name: "일당기록",
    description: "인력사무소별 일당을 토글로 기록하고 이번달 현황을 대시보드로 확인.",
    category: "재무",
    emoji: "💰",
    status: "live",
  },
];

export function getToolBySlug(slug: string) {
  return tools.find((t) => t.slug === slug);
}

export function getCategories() {
  return Array.from(new Set(tools.map((t) => t.category)));
}

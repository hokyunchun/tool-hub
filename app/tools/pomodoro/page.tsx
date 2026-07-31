export const metadata = {
  title: "Focus Disc — 직관적 뽀모도로 타이머 | Tool Hub",
  description: "실물 타임타이머를 닮은 뽀모도로 타이머. AI 코멘트 지원.",
};

import ToolNotes from "@/components/ToolNotes";

export default function PomodoroPage() {
  return (
    <div className="-mx-6 -my-10">
      {/*
        원본 index.html(순수 HTML/CSS/JS)을 React로 재작성하는 대신
        public/focus-disc.html 정적 파일로 그대로 두고 iframe으로 임베드.
        원본 디자인·동작을 100% 그대로 보존하면서 가장 빠르게 이식하는 방법.
      */}
      <iframe
        src="/focus-disc.html"
        title="Focus Disc"
        className="w-full border-0"
        style={{ height: "calc(100vh - 88px)" }}
      />
      <div className="px-6">
        <ToolNotes
          purpose="실물 Time Timer처럼 직관적으로 쓰고 싶어서 만듦. 세션이 끝날 때마다 AI 코멘트로 짧은 피드백을 받아 몰입을 이어가는 게 목적."
          todo={[
            "AI 코멘트가 API키/CORS 문제로 항상 대체문구만 뜸 — 서버사이드 API 라우트로 옮겨야 실제 작동함",
            "localStorage 저장이라 기기·브라우저 간 기록 동기화 안 됨",
            "지인 피드백 아직 미수집",
          ]}
        />
      </div>
    </div>
  );
}

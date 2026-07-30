export const metadata = {
  title: "Focus Disc — 직관적 뽀모도로 타이머 | Tool Hub",
  description: "실물 타임타이머를 닮은 뽀모도로 타이머. AI 코멘트 지원.",
};

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
    </div>
  );
}

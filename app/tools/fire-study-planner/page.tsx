import ToolNotes from "@/components/ToolNotes";

export const metadata = {
  title: "소방시험 Study Planner | Tool Hub",
  description: "소방시험 297강 계획과 학습 진도를 관리합니다.",
};

export default function FireStudyPlannerPage() {
  return (
    <div className="-mx-6 -my-10">
      <iframe
        src="/fire-study-planner/index.html"
        title="소방시험 Study Planner"
        className="w-full border-0 min-h-[1600px] md:min-h-[900px]"
        style={{ height: "calc(100vh - 88px)" }}
      />
      <div className="px-6">
        <ToolNotes
          purpose="소방시험 강의 계획과 실제 진도를 한곳에서 관리하고, 매일 공부량이 현실적인지 확인하기 위해 만들었습니다."
          todo={[
            "진도는 현재 사용 중인 브라우저에 저장되며 기기 간 자동 동기화는 지원하지 않습니다.",
            "미완료 강의를 남은 기간에 맞춰 자동 재배치하는 기능은 다음 단계로 남겨두었습니다.",
          ]}
        />
      </div>
    </div>
  );
}

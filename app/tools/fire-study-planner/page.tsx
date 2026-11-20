import ToolNotes from "@/components/ToolNotes";

export const metadata = {
  title: "Study Planner | Tool Hub",
  description: "과목과 강의 목록을 바탕으로 개인 학습 계획을 만들고 진도를 관리합니다.",
};

export default function FireStudyPlannerPage() {
  return (
    <div className="-mx-6 -my-10">
      <iframe
        src="/fire-study-planner/index.html"
        title="Study Planner"
        className="w-full border-0 min-h-[1600px] md:min-h-[900px]"
        style={{ height: "calc(100vh - 88px)" }}
      />
      <div className="px-6">
        <ToolNotes
          purpose="수강 목록과 목표 날짜로 계획을 만들고, 학습 진도와 실제 공부 시간을 관리합니다."
          todo={[
            "과목별 수강 내역을 붙여 넣거나 텍스트 파일로 올리면 AI가 강의명과 시간을 정리합니다. 저장 전 결과를 확인할 수 있습니다.",
            "강의 제목과 재생 시간이 일정표에 표시되고, 빠진 시간은 해당 과목 평균으로 추정합니다.",
            "완료 기록과 일정은 계정별로 저장되어 같은 계정의 기기끼리 동기화됩니다.",
          ]}
        />
      </div>
    </div>
  );
}

import WorkLog from "@/components/WorkLog";
import ToolNotes from "@/components/ToolNotes";

export const metadata = {
  title: "Daily Pay — 일당 기록 | Tool Hub",
  description: "일한 장소와 받은 금액을 간단히 기록하고 이번 달 수입을 확인합니다.",
};

export default function WorkLogPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Daily Pay</h1>
      <p className="text-neutral-500 mb-8">
        일한 장소와 받은 금액을 간단히 기록하세요. 내용은 구글시트에 저장됩니다.
      </p>
      <WorkLog />
      <ToolNotes
        purpose="일한 날짜와 받은 금액을 빠르게 기록하고, 이번 달 수입을 확인하는 개인 대시보드입니다."
        todo={[
          "새 근무 장소를 추가하려면 설정 파일을 수정해야 합니다 — 화면에서 추가하는 기능은 아직 없습니다.",
          "구글시트 CSV 발행 캐시 지연으로 기록 직후 대시보드에 반영이 늦을 수 있음",
          "이번달 데이터만 보여줌 — 월별/기간별 조회 기능 없음",
          "인증 없음 — 링크만 알면 누구나 접근 가능 (개인용이라 지금은 문제 없음)",
        ]}
      />
    </div>
  );
}

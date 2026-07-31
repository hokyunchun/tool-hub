import WorkLog from "@/components/WorkLog";
import ToolNotes from "@/components/ToolNotes";

export const metadata = {
  title: "일당기록 — 인력사무소 출역 관리 | Tool Hub",
  description: "인력사무소별 일당을 토글로 빠르게 기록하고, 이번달 현황을 한눈에 확인",
};

export default function WorkLogPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">💰 일당기록</h1>
      <p className="text-neutral-500 mb-8">
        어디서 일했는지, 얼마 받았는지 토글 두 번으로 기록. 구글시트에 자동 저장됩니다.
      </p>
      <WorkLog />
      <ToolNotes
        purpose="일자리 매칭앱도 아니고 범용 가계부도 아닌, 일용직/프리랜서 소득만 빠르게 토글로 기록하는 개인 대시보드가 시장에 없어서 만듦."
        todo={[
          "새 인력사무소 추가하려면 코드(lib/worklog-config.ts)를 직접 수정해야 함 — UI에서 추가 불가",
          "구글시트 CSV 발행 캐시 지연으로 기록 직후 대시보드에 반영이 늦을 수 있음",
          "이번달 데이터만 보여줌 — 월별/기간별 조회 기능 없음",
          "인증 없음 — 링크만 알면 누구나 접근 가능 (개인용이라 지금은 문제 없음)",
        ]}
      />
    </div>
  );
}

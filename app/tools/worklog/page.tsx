import WorkLog from "@/components/WorkLog";

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
    </div>
  );
}

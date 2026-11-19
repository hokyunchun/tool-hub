import FounderPipeline from "@/components/FounderPipeline";
import ToolNotes from "@/components/ToolNotes";

export const metadata = {
  title: "Founder Pipeline — 매일 실행하는 사업화 파이프라인 | Tool Hub",
  description:
    "문제정의부터 가설검증까지, 7단계를 클릭하며 매일 기록하고 실행하는 1인 창업가용 도구",
};

export default function FounderPipelinePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Founder Pipeline</h1>
      <p className="text-neutral-500 mb-8">
        판정이 아니라 실행. 매일 한 단계씩 클릭하고 기록하며 앞으로 나아갑니다.
      </p>
      <FounderPipeline />
      <ToolNotes
        purpose="느낌으로 판단하고 실행을 미루는 근본원인을 깨기 위해 만듦. 아이디어 판정 리포트를 주는 경쟁서비스들과 달리, 7단계를 매일 클릭하며 강제로 실행하게 만드는 '실행형·지속형' 포지션을 노림."
        todo={[
          "결제/구독 기능 없음 — 가설검증 전까지 의도적으로 보류 중",
          "localStorage 저장이라 기기 간 기록 동기화 안 됨",
          "저장된 답변을 나중에 다시 수정하는 기능 없음 (계속 새로 누적만 됨)",
          "독립 레포(github.com/hokyunchun/founder-pipeline)와 코드가 분리되어 있어 수정 시 양쪽 다 반영 필요",
        ]}
      />
    </div>
  );
}

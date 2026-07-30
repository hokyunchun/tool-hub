import FounderPipeline from "@/components/FounderPipeline";

export const metadata = {
  title: "Founder Pipeline — 매일 실행하는 사업화 파이프라인 | Tool Hub",
  description:
    "문제정의부터 가설검증까지, 7단계를 클릭하며 매일 기록하고 실행하는 1인 창업가용 도구",
};

export default function FounderPipelinePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">🧭 Founder Pipeline</h1>
      <p className="text-neutral-500 mb-8">
        판정이 아니라 실행. 매일 한 단계씩 클릭하고 기록하며 앞으로 나아갑니다.
      </p>
      <FounderPipeline />
    </div>
  );
}

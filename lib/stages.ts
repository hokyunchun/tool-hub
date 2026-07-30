export type Stage = {
  id: string;
  step: number;
  title: string;
  cadence: "오후" | "오전";
  question: string;
};

export const stages: Stage[] = [
  {
    id: "problem",
    step: 0,
    title: "문제정의",
    cadence: "오후",
    question:
      "오늘 실제로 겪은 구체적 사실은 무엇인가요? (짐작이나 일반론 금지, 실제 있었던 일만)",
  },
  {
    id: "research",
    step: 1,
    title: "리서치",
    cadence: "오후",
    question:
      "이 문제, 해외에 이미 검증된 서비스가 있나요? 이름과 무엇을 해주는지 적어보세요.",
  },
  {
    id: "monetize",
    step: 2,
    title: "수익화분석",
    cadence: "오후",
    question: "그 서비스는 정확히 어떻게 돈을 버나요? (구독/광고/크레딧 등)",
  },
  {
    id: "position",
    step: 3,
    title: "포지셔닝",
    cadence: "오후",
    question: "그들과 다른 나만의 차별점, 한 문장으로 적어보세요.",
  },
  {
    id: "build",
    step: 4,
    title: "제작",
    cadence: "오전",
    question: "오늘 4시간 안에 만들 최소 기능은 무엇인가요? (완성 아님, 착수 기준)",
  },
  {
    id: "launch",
    step: 5,
    title: "오픈·공개",
    cadence: "오전",
    question: "어디에 공개하고 커밋했나요? (링크 또는 채널)",
  },
  {
    id: "validate",
    step: 6,
    title: "가설검증",
    cadence: "오전",
    question: "누구에게 피드백을 받았나요? 실제로 들은 반응을 적어보세요.",
  },
];

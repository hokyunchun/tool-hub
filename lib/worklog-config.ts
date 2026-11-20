// 자주 일하는 장소 목록. 늘어나면 여기 배열에 추가하면 됩니다.
export const AGENCIES = ["송인인력", "제일인력"];

// 자주 받는 일당 금액 (원). 토글로 빠르게 선택할 수 있게.
export const AMOUNT_PRESETS = [130000, 150000, 160000, 180000, 200000];

// docs/apps-script-worklog.gs 를 구글시트에 설치하고 배포한 뒤,
// 그 웹 앱 URL을 여기에 붙여넣으세요. (기록 저장용)
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzSbNx_264AVPMv4l1ZHnZqLUKLj9WPFvd_fhG7a4IT6lCJaY2bbn6rUcYKCHzjWAhInA/exec";

// 구글시트 "파일 → 공유 → 웹에 게시" → CSV 형식으로 게시한 뒤,
// 그 링크를 여기에 붙여넣으세요. (대시보드 조회용)
export const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSeEEaxr9Ba39gTeSutMk36YyNSPy6-jmvwNPlWW9ZgaDJY1Kigc2bBd_9ECvgZe7cqqMLieUPSzXLQ/pub?gid=0&single=true&output=csv";

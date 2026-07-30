/**
 * 설치 방법:
 * 1. 구글시트 상단 메뉴 "확장 프로그램 → Apps Script" 클릭
 * 2. 기본으로 열려있는 코드를 전부 지우고 이 코드를 붙여넣기
 * 3. 저장 (Ctrl+S 또는 저장 아이콘)
 * 4. 우측 상단 "배포 → 새 배포"
 *    - 유형: 웹 앱
 *    - 실행 계정: 나
 *    - 액세스 권한이 있는 사용자: 모든 사용자
 *    - "배포" 클릭 → 처음엔 구글 인증 동의 화면이 뜸 → 내 계정으로 승인
 * 5. 배포 완료 후 나오는 "웹 앱 URL"을 복사해서 tool-hub 프로젝트의
 *    lib/worklog-config.ts 파일의 APPS_SCRIPT_URL 값에 붙여넣기
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([data.date, data.agency, data.amount]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

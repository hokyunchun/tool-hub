# Tool Hub

miniwebtool 구조를 참고한 미니 서비스 모음 사이트. 1주 1 MVP 사이클로 도구를 계속 추가합니다.

## 로컬 실행 방법

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속해서 확인.

## 새 도구 추가하는 법 (매주 반복할 작업)

1. `lib/tools.ts` 에 도구 정보 한 줄 추가 (slug, name, description, category, emoji)
2. `app/tools/{slug}/page.tsx` 생성해서 실제 도구 컴포넌트 작성
3. 홈페이지(`app/page.tsx`)는 자동으로 목록에 반영됨 — 따로 손댈 필요 없음
4. `git add . && git commit -m "add: {도구이름}" && git push`
5. Vercel 자동 배포 확인

## 배포

- GitHub 레포 연결 후 Vercel에서 Import — Focus Disc와 동일한 방식
- 매일 아침 커밋 → Vercel이 자동으로 프로덕션 반영

## 폴더 구조

```
app/
  layout.tsx        # 전역 레이아웃 (헤더/푸터)
  page.tsx           # 홈페이지 (툴 목록, 카테고리별 자동 렌더링)
  tools/
    pomodoro/
      page.tsx        # Focus Disc 페이지
lib/
  tools.ts            # 툴 레지스트리 — 새 도구는 여기 한 줄만 추가
components/            # 공용 컴포넌트 (필요시)
```

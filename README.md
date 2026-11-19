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
3. 정적 HTML/JS 도구는 `public/{slug}/`에 파일을 두고 페이지에서 연결
4. 프로젝트 문서는 `docs/apps/{slug}/`에 보관
5. 홈페이지(`app/page.tsx`)는 도구 목록에 자동 반영됨 — 따로 손댈 필요 없음
6. `git add . && git commit -m "add: {도구이름}" && git push`
7. Vercel 자동 배포 확인

## 배포

- GitHub 레포 연결 후 Vercel에서 Import — Focus Disc와 동일한 방식
- 매일 아침 커밋 → Vercel이 자동으로 프로덕션 반영
- Study Planner의 계정 저장을 켤 때는 Supabase 프로젝트의 SQL을 적용하고 Vercel 환경 변수 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 설정

## 폴더 구조

```
app/
  layout.tsx        # 전역 레이아웃 (헤더/푸터)
  page.tsx           # 홈페이지 (툴 목록, 카테고리별 자동 렌더링)
  tools/
    pomodoro/
      page.tsx        # Focus Disc 페이지
    fire-study-planner/
      page.tsx        # Study Planner 경로와 페이지 설명
lib/
  tools.ts            # 툴 레지스트리 — 새 도구는 여기 한 줄만 추가
components/            # 공용 컴포넌트
public/                # 정적 HTML/JS 도구 파일
docs/apps/             # 각 도구의 기획·요구사항·설계 문서
```

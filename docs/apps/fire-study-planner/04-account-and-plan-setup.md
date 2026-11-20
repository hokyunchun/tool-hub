# 계정별 학습 계획 설정

## 가입과 로그인

- 가입할 때 로그인 ID, 실제 복구 이메일 주소, 비밀번호를 등록한다. 로그인 화면에는 ID와 비밀번호만 입력한다.
- 가입 이메일 확인을 켜 둔다. 사용자는 확인 메일의 링크를 눌러야 로그인할 수 있다.
- `study_profiles` 테이블은 `auth.users`와 분리해 `user_id`와 고유 ID만 보관한다. 클라이언트에서 이메일을 조회할 수 없고, 서버의 로그인·복구 API만 Supabase Secret key로 매핑을 조회한다.
- ID는 영문 소문자·숫자·점·하이픈·밑줄로 3~32자, 비밀번호는 8~256자로 제한한다.
- 비밀번호를 잊으면 가입할 때 등록한 ID와 복구 이메일을 함께 제출한다. 두 정보가 일치할 때 Supabase가 재설정 메일을 발송하고, 이메일 링크에서 새 비밀번호를 정한다.
- `admin`은 사용할 수 있는 ID일 뿐 관리자 권한이 아니다. 모든 계정은 각자 비밀번호를 정하며 공용 `admin/admin` 계정은 만들지 않는다.

## 서비스 키 설정

- Vercel의 `tool-hub` 프로젝트에 `SUPABASE_SECRET_KEY`를 Production, Preview, Development 환경 변수로 직접 등록한다. 키는 브라우저로 보내지 않으며 채팅에 붙여 넣지 않는다.
- 값은 Supabase Dashboard → Project Settings → API Keys에서 만든 `Secret key`다. Supabase 키 목록이나 SQL에 넣지 않는다.
- 기존 `SUPABASE_URL`, `SUPABASE_ANON_KEY`는 클라이언트 공개 설정이므로 그대로 사용한다. Secret key는 계정 ID 조회 서버 API에만 쓴다.
- Supabase Authentication URL Configuration에서 Site URL을 `https://www.nomadho.com`으로 설정하고 Redirect URLs에 `https://www.nomadho.com/fire-study-planner/index.html`을 추가한다.
- Supabase Authentication → Sign In / Providers에서 Email 가입을 허용하고 `Confirm email`을 켠다.
- 신규 Vercel 환경 변수를 저장한 뒤 재배포해야 서버 로그인과 복구 기능이 적용된다.

## 이메일과 문자 비용

- Supabase 기본 메일 발송은 시간당 2통이며 프로젝트 팀 구성원의 이메일 주소에만 발송된다. 다른 주소로 가입 확인·복구 메일을 보내려면 SMTP 제공자를 연결한다.
- SMS 인증은 Supabase가 무료로 문자를 보내주는 기능이 아니다. 별도의 SMS 제공자 계정과 발송료가 필요할 수 있어 현재는 복구 이메일을 사용한다.

## 계정별 데이터

- 로그인한 사용자는 자신의 학습 계획, 과목, 날짜별 강의, 완료 기록만 조회하고 변경한다.
- 각 테이블의 RLS 정책은 `auth.uid()`와 `user_id`를 대조해 계정 간 접근을 차단한다.
- 로그인한 계정에 계획이 없으면 새 계획 설정 화면을 보여준다.
- 첫 계획을 만들 때 입력한 과목, 강의 수, 강의당 평균 시간, 시작일, 완강 목표일, 주말 포함 여부로 일정을 만든다.
- 완료 체크는 Supabase에 저장하고, 같은 계정으로 다른 기기에서 로그인하면 불러온다.

## 소방시험 과목 템플릿

- 설정 화면의 `소방시험 과목 채우기` 버튼은 행정법총론, 소방관계법규, 소방학개론의 강의 수와 기존 평균 시간을 입력란에 채운다.
- 이 값은 사용자가 수정할 수 있으며, 일정은 새로 지정한 시작일과 목표일을 기준으로 생성한다.
- 주말 포함을 선택하지 않으면 평일에 배치한다. 선택하면 토요일과 일요일도 공부일에 포함한다.

## 로그인 ID `admin`

- `admin`은 사용 가능한 ID다. 비밀번호는 `admin`과 다르게 설정해야 한다.
- ID는 계정 식별자일 뿐 관리자 권한을 의미하지 않는다.
- ID별로 별도 Supabase Auth 사용자와 `auth.uid()`가 만들어진다. 기존 RLS가 각 계정의 학습 데이터만 보이게 한다.

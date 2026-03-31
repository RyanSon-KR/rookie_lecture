# Rookie Pretotype Board

학생 팀이 **프리토타입 실험**을 빠르게 운영할 수 있도록 정리한 정적 페이지입니다.

## 파일 구성

- `index.html` — 학생 중심 안내, 실시간 발표 보드, 모드 전환 UI
- `app.js` — `DemoAdapter`, `JsonAdapter`, `GoogleSheetsAdapter`, `SupabaseAdapter` 및 렌더링 로직
- `supabase-schema.sql` — Supabase 테이블/정책 생성용 SQL 예시
- `README.md` — 운영 방법 및 모바일/PC 시나리오 설명

---

## 핵심 변경 사항

### 1. 운영 구조로 분리
- **입력 경로**: `Tally` 또는 `Google Form`
- **발표 보드**: 외부 `JSON` / `Google Sheets` / `Supabase` 응답 렌더링
- **데이터 소스 계층**: adapter 패턴으로 분리

### 2. 모드 전환
- **Demo mode**
  - localStorage 기반
  - 수업 전 리허설 / UI 테스트용
- **Live mode**
  - 외부 응답 URL 연결용
  - 발표 PC에서 주기적으로 새로고침 가능

### 3. 페이지 보기 모드
- **Public landing mode**
  - 처음 열면 기본으로 이 화면에서 시작합니다.
  - 첫 접속 시 public 비밀번호 `0330` 입력 팝업이 먼저 뜹니다.
  - 학생/외부 참가자용 최소 입력 화면만 표시합니다.
- **Lecture mode**
  - 강연용 설명 섹션, 비교 콘텐츠, 진행 스크립트 포함
  - 우측 상단 `Lecture Mode` 버튼을 눌렀을 때만 비밀번호 창이 뜹니다.
  - 비밀번호 `990323` 입력 후 `Lecture mode 열기`를 누르면 해당 모드로 전환되고 팝업은 닫힙니다.
- 상단 토글 또는 query parameter로 전환 가능
  - `?view=lecture`
  - `?view=public`
- 강연용 비밀번호는 `app.js`의 `LECTURE_PASSWORD` 상수에서 변경할 수 있습니다.

### 4. 학생 중심 콘텐츠
- 강사용 스크립트는 `lecture mode`에서만 표시
- public mode는 입력 폼과 핵심 안내만 남도록 구성
- `Prototype vs Pretotype` 비교 설명 포함


---

## 모바일 입력 / PC 발표 시나리오

### 권장 운영 흐름

1. **학생 모바일**
   - `Tally` 또는 `Google Form` 링크를 엽니다.
   - 팀 이름, 아이템, 타깃, CTA 등을 입력합니다.

2. **응답 저장**
   - `Tally -> Webhook/Notion/JSON endpoint`
   - 또는 `Google Form -> Google Sheets`

3. **발표 PC**
   - `index.html`을 열고 `Live mode`로 전환합니다.
   - `dataSourceType`을 `json`, `googleSheets`, 또는 `supabase`로 선택합니다.
   - `Supabase`를 쓸 경우 프로젝트 URL, `anon key`, 테이블 이름을 입력한 뒤 `연결 적용`을 누릅니다.

4. **실시간 발표**
   - 보드는 외부 응답을 읽어 학생 팀 결과를 렌더링합니다.
   - 필요시 `보드 새로고침`으로 즉시 반영합니다.

### QR / 링크 공유 방식

- **Form QR**: `formUrl`이 설정되면 학생 입력용 QR이 생성됩니다.
- **Board QR**: 배포된 현재 페이지 URL이 자동 감지되면 발표 보드 QR이 생성됩니다.
- **URL이 없을 때**: QR 대신 placeholder가 표시됩니다.
- **모바일 보완**: QR 없이도 `폼 링크 복사`, `보드 링크 복사` 버튼으로 바로 전달할 수 있습니다.

### Public ↔ Lecture 메시지 전달

- **Public mode 질문 보내기** → `Lecture mode`의 질문함에서 확인 및 답변 가능
- **Lecture mode 답변 보내기** → `Public mode`의 답변 목록에 반영
- **Lecture mode 공지/질문 보내기** → `Public mode`에서 팝업으로 즉시 표시

---

## 데이터 소스 형식

### A. JSON 응답 예시

```json
[
  {
    "teamName": "1팀",
    "teamItem": "대학생 멘토 매칭",
    "teamTarget": "새내기 대학생",
    "teamCTA": "첫 멘토링 신청하기",
    "teamProblem": "전공/진로 정보를 얻기 어려움",
    "teamBudget": "광고 2만 원 + 학내 커뮤니티",
    "teamLinks": "https://example.com/mentoring"
  }
]
```

### B. Google Sheets 권장 헤더

다음 컬럼명을 쓰는 것을 권장합니다.

- `teamName`
- `teamItem`
- `teamTarget`
- `teamCTA`
- `teamProblem`
- `teamBudget`
- `teamLinks`

`app.js`는 위 이름을 기준으로 읽되, 일부 유사 키도 정규화해서 처리합니다.

---

## adapter 구조

`app.js` 안에는 다음 계층이 있습니다.

- `DemoAdapter`
  - localStorage에서 샘플/테스트 데이터를 읽고 저장
- `JsonAdapter`
  - 외부 JSON 응답 fetch 후 표준 필드로 정규화
- `GoogleSheetsAdapter`
  - Google Sheets published JSON 또는 `gviz` 응답 파싱

이 구조 덕분에 Airtable, Apps Script endpoint 같은 다른 저장소도 비슷한 방식으로 더 추가할 수 있습니다.

---

## Supabase 연결 방법

### 1. SQL 실행

Supabase SQL Editor에서 `supabase-schema.sql` 내용을 실행합니다.

### 2. 보드 연결

`Lecture mode` → `Live Board`에서 아래처럼 입력합니다.

- `발표 보드 데이터 소스` → `Supabase Table`
- `응답 URL 또는 Supabase Project URL` → `https://YOUR_PROJECT.supabase.co`
- `Supabase anon key` → Project Settings의 **public anon key**
- `Supabase table name` → `pretotype_board_entries`

### 3. 보안 주의

- 브라우저에는 **반드시 `anon public key`만** 넣으십시오.
- `service_role` key는 절대 프론트엔드에 넣으면 안 됩니다.
- 기본 예시는 `select` / `insert`만 열어두는 구조입니다.

---

## 실행 방법

```bash
cd /home/space/rookie
python3 -m http.server 8000
```

브라우저에서 열기:

```text
http://127.0.0.1:8000/index.html
```

## GitHub / Vercel 배포

이 프로젝트는 별도 빌드가 없는 **정적 사이트**라서 바로 GitHub와 Vercel에 올릴 수 있습니다.

### 1. GitHub에 올릴 파일
- `index.html`
- `app.js`
- `README.md`
- `vercel.json` (배포 옵션)

### 2. Vercel 배포 방법
1. GitHub 저장소에 이 프로젝트를 push 합니다.
2. Vercel에서 저장소를 import 합니다.
3. Framework Preset은 **Other** 또는 **Static**으로 두면 됩니다.
4. Build Command는 비워두고, Output Directory도 루트(`/`) 그대로 사용합니다.
5. 배포 후 생성된 `https://...vercel.app` 주소에서 페이지가 바로 열립니다.

### 3. 실제 운영 시 주의
- `Board QR`은 배포 URL이 `https://`로 열릴 때 자동 감지됩니다.
- `Live mode`에서 외부 `JSON` / `Google Sheets`를 읽으려면 해당 응답이 **브라우저 fetch 가능(CORS 허용)** 해야 합니다.
- 학생 입력용 `formUrl`에는 실제 `Tally` 또는 `Google Form` 링크를 넣어야 합니다.

---

## 테마 / 플로팅 버튼

- **좌측 하단 원형 버튼**: 다크그레이 ↔ 화이트톤 테마 전환
- **우측 하단 원형 버튼**: 인스타그램 DM 링크
  - `https://www.instagram.com/sonsmos/`

---

## 프리토타입 vs 프로토타입

- **Prototype**: 기능과 사용성을 확인하는 데 적합
- **Pretotype**: 사람들이 애초에 반응하는지 빠르게 확인하는 데 적합

수업 초기나 짧은 실습에서는 보통 **Pretotype → Prototype** 순서가 더 효율적입니다.

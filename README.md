# 생리주기 케어 앱

Supabase 기반 PWA 생리주기 기록 앱입니다.

## 시작하기

### 1. Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. **SQL Editor** 에서 `supabase_setup.sql` 내용 전체를 실행
   - 이미 테이블을 만든 경우, **갈색혈/시작/끝** 태그용으로 `supabase_migration_tags.sql` 도 실행하세요
   - **태그만 저장(물방울 없이)** 도 하려면 `supabase_migration_allow_tag_only.sql` 도 실행하세요
3. **Project Settings → API** 에서 다음 두 값 복사:
   - `Project URL`
   - `anon public` 키

### 2. 환경변수 설정

`.env.local` 파일을 열고 아래 값으로 교체:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. 실행

```bash
npm install
npm run dev
```

### 4. 빌드 (배포)

```bash
npm run build
```

## 기능

- **이번 달 달력** - 월요일부터 시작
- **날짜 탭** - 생리량 1~10 단계 선택
- **물방울 아이콘** - 연분홍(1) → 새빨강(10) 색상으로 강도 표시
- **PWA** - 홈 화면에 추가해 앱처럼 사용 가능

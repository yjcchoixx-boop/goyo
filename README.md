# GOYO - 감정 운영 인텔리전스

케어 환경의 감정 운영 인텔리전스 데스크톱 애플리케이션

## 프로젝트 개요

GOYO는 심리상담 원리를 돌봄 환경 운영 의사결정에 적용하여 케어 인력 번아웃을 예방하는 감정 운영 인텔리전스 레이어입니다.

### 핵심 가치

> "감정을 측정할 수 있다면, 관리할 수 있습니다. 관리할 수 있다면, 개선할 수 있습니다."

GOYO는 위기가 되기 전에 감지하고, 데이터로 증명하며, 행동을 촉구합니다.

## ✅ 구현된 주요 기능

### 📊 1. 실시간 감정 모니터링 대시보드
- **통계 카드**
  - 전체 인력 현황
  - 안정 상태 인력 수
  - 주의 필요 인력 수
  - 위험 상태 인력 수
- **감정 상태 분포** - 도넛 차트로 시각화
- **번아웃 위험도 추이** - 라인 차트로 트렌드 분석
- **실시간 알림 패널** - 최신 리스크 알림 표시
- **인력 상태 현황** - 전체 케어 인력 상태 리스트

### 🔔 2. 조기 경보 시스템
- **위험도별 알림 통계**
  - 긴급 (위험): 고위험군 리스크
  - 높음 (주의): 중위험군 모니터링
  - 보통 (관찰): 관찰 대상
  - 해결 완료: 처리된 알림
- **활성 알림 목록** - 실시간 리스크 알림
- **알림 필터링** - 전체/활성/확인됨/해결됨
- **알림 확인 기능** - 리스크 인지 표시
- **알림 해결 기능** - 해결 노트 작성 및 완료 처리
- **실시간 알림 배지** - 사이드바에 알림 카운터

### 👥 3. 케어 인력 관리 (Full CRUD)
- **인력 추가** - 모달 기반 폼으로 신규 인력 등록
- **인력 수정** - 기존 인력 정보 업데이트
- **인력 삭제** - 확인 절차를 거친 안전한 삭제
- **테이블 형식 인력 목록** - 정렬 및 필터링 가능
- **검색 기능** - 이름/역할/부서 실시간 검색 (debounce 적용)
- **부서별 필터링** - A팀/B팀/C팀
- **상태별 필터링** - 안정/주의/위험
- **모달 기반 폼 UI** - 세련된 사용자 경험

### 📈 4. 데이터 분석 페이지
- **부서별 감정 상태 비교** - 스택 바 차트
- **월별 번아웃 추이** - 라인 차트로 시간별 트렌드
- **감정 유형 분포** - 폴라 차트로 감정 타입 분석
- **주간 감정 변화** - 단기 트렌드 모니터링

### 📝 5. 리포트 시스템
- **리포트 생성**
  - 주간 리포트: 최근 7일 분석
  - 월간 리포트: 당월 종합 분석
  - 분기 리포트: 분기별 트렌드
  - 위험 분석 리포트: 고위험군 집중 분석
- **리포트 카드 UI** - 직관적인 리포트 선택
- **최근 생성 리포트 목록** - 생성 이력 관리
- **리포트 데이터 저장** - SQLite 데이터베이스

## 🎨 디자인 특징

### 모던하고 전문적인 UI
- 다크 테마 기반 디자인
- 깔끔한 카드 레이아웃
- 시각적 계층 구조

### 반응형 레이아웃
- 모바일 최적화 (768px 이하)
- 태블릿 지원 (768px - 1200px)
- 데스크톱 최적화 (1200px 이상)

### 다크 사이드바
- 명확한 네비게이션
- 활성 상태 표시
- 알림 배지

### 상태별 컬러 코딩
- 🟢 녹색 (안정): 정상 상태
- 🟡 주황 (주의): 관찰 필요
- 🔴 빨강 (위험): 즉각 대응

### 부드러운 애니메이션
- 페이지 전환 효과 (fadeIn)
- 카드 슬라이드 인
- Hover 효과 및 트랜지션

### 인터랙티브 차트
- Chart.js 활용
- 도넛/라인/스택 바/폴라 차트
- 반응형 차트 설정

## 기술 스택

- **Electron ^28.0.0** - 크로스 플랫폼 데스크톱 애플리케이션
- **Chart.js ^4.4.0** - 감정 데이터 시각화
- **SQLite (better-sqlite3 ^9.2.0)** - 로컬 데이터베이스
- **Vanilla JavaScript** - 순수 JavaScript로 구현
- **CSS3** - 모던 스타일링 및 애니메이션

## 설치 및 실행

### 요구사항
- Node.js 16 이상
- npm 또는 yarn

### 설치
```bash
npm install
```

### 실행
```bash
# 프로덕션 모드
npm start

# 개발 모드 (개발자 도구 포함)
npm run dev

# 또는 실행 스크립트 사용
./run.sh
```

## 데이터베이스 스키마

### care_workers (케어 인력)
```sql
id INTEGER PRIMARY KEY
name TEXT NOT NULL
role TEXT NOT NULL
team TEXT NOT NULL
hire_date TEXT NOT NULL
phone TEXT
email TEXT
risk_status TEXT DEFAULT 'normal'
status TEXT DEFAULT 'active'
created_at TEXT
updated_at TEXT
```

### emotion_logs (감정 로그)
```sql
id INTEGER PRIMARY KEY
worker_id INTEGER NOT NULL
timestamp TEXT NOT NULL
emotion_type TEXT NOT NULL
intensity REAL NOT NULL
context TEXT
```

### risk_alerts (리스크 알림)
```sql
id INTEGER PRIMARY KEY
worker_id INTEGER NOT NULL
alert_date TEXT NOT NULL
risk_score REAL NOT NULL
risk_level TEXT NOT NULL
alert_type TEXT DEFAULT 'burnout'
status TEXT DEFAULT 'pending'
acknowledged_at TEXT
resolved_at TEXT
notes TEXT
```

### interventions (개입 조치)
```sql
id INTEGER PRIMARY KEY
alert_id INTEGER NOT NULL
intervention_type TEXT NOT NULL
description TEXT NOT NULL
deadline TEXT NOT NULL
status TEXT DEFAULT 'pending'
completed_date TEXT
```

### reports (리포트)
```sql
id INTEGER PRIMARY KEY
report_type TEXT NOT NULL
report_name TEXT NOT NULL
period_start TEXT NOT NULL
period_end TEXT NOT NULL
generated_at TEXT
data TEXT
summary TEXT
```

## 샘플 데이터

애플리케이션은 시연을 위한 샘플 데이터를 자동으로 생성합니다:
- **8명의 케어 인력** 
  - 김미영 (위험), 이정수 (안정), 박서연 (안정)
  - 최민준 (주의), 정수진 (안정), 강지훈 (안정)
  - 윤서아 (안정), 한민수 (주의)
- **각 인력당 30일간의 감정 로그**
- **3건의 리스크 알림** (김미영: 고위험, 최민준/한민수: 중위험)

## API 엔드포인트

### 케어 인력 관리
- `get-workers` - 활성 인력 목록
- `get-worker-detail` - 인력 상세 정보
- `add-worker` - 신규 인력 추가
- `update-worker` - 인력 정보 수정
- `delete-worker` - 인력 삭제 (소프트 삭제)
- `search-workers` - 인력 검색
- `filter-workers` - 부서/상태별 필터링

### 감정 데이터
- `get-emotion-logs` - 감정 로그 조회
- `get-dashboard-stats` - 대시보드 통계

### 알림 관리
- `get-risk-alerts` - 리스크 알림 목록
- `get-alert-stats` - 알림 통계
- `acknowledge-alert` - 알림 확인
- `resolve-alert` - 알림 해결

### 분석 및 리포트
- `get-analytics-data` - 분석 데이터
- `generate-report` - 리포트 생성
- `get-reports` - 리포트 목록

### 개입 조치
- `get-interventions` - 개입 방안 조회
- `update-intervention-status` - 개입 조치 상태 업데이트

## 시연회 준비

**DEMO_GUIDE.md** 파일에 상세한 5분 시연 시나리오가 준비되어 있습니다.

### 핵심 시연 포인트

1. **대시보드** (30초)
   - 전체 통계 카드 (8명, 안정 5명, 주의 2명, 위험 1명)
   - 감정 분포 및 번아웃 트렌드 차트

2. **리스크 알림** (1분 30초)
   - 알림 통계 강조
   - 김미영님 고위험 알림 (85% 증가, 72% 리스크)
   - 알림 확인/해결 프로세스

3. **개입 방안 - 클라이맥스!** (2분)
   - 4단계 구조화된 액션 플랜
   - 즉시 → 단기 → 중기 → 모니터링

4. **인력 관리** (1분)
   - CRUD 기능 시연 (추가/수정/삭제)
   - 검색 및 필터링

5. **데이터 분석** (30초)
   - 부서별 비교, 월별 추이
   - 폴라 차트

## 프로젝트 구조

```
goyo/
├── main.js                # Electron 메인 프로세스 (Backend + IPC)
├── index.html             # 메인 HTML (모든 뷰 포함)
├── styles.css             # 통합 스타일시트 (7,000+ 줄)
├── renderer.js            # 렌더러 프로세스 (UI 로직 + CRUD)
├── package.json           # 프로젝트 설정
├── goyo.db               # SQLite 데이터베이스 (자동 생성)
├── README.md             # 프로젝트 문서
├── DEMO_GUIDE.md         # 시연회 가이드
├── DEV_GUIDE.md          # 개발자 가이드 (Hot Reload)
├── LIVE_DEMO_SCRIPT.md   # AI MBA 실시간 코딩 데모 스크립트
├── run.sh                # 프로덕션 실행 스크립트
└── dev.sh                # 개발 모드 실행 스크립트 (Hot Reload)
```

## 🔥 개발 모드 (Hot Reload)

### AI MBA 발표용 - 실시간 코딩 데모

GOYO는 **코드 변경 시 자동 새로고침**되는 개발 모드를 지원합니다.

#### 🚀 개발 모드 실행

```bash
# 방법 1: npm 스크립트
npm run dev

# 방법 2: 쉘 스크립트
./dev.sh
```

#### ✨ 자동 새로고침되는 파일

- ✅ **index.html** - HTML 구조 변경 시 즉시 반영
- ✅ **renderer.js** - JavaScript 코드 변경 시 즉시 반영
- ✅ **styles.css** - CSS 스타일 변경 시 즉시 반영
- ✅ **main.js** - Backend 변경 시 앱 자동 재시작

#### 🎤 실시간 데모 시나리오 (5분)

**발표 중 실시간으로 코드를 수정하여 즉시 화면에 반영!**

1. **CSS 색상 변경** (30초)
   - `styles.css`에서 `.stat-card` 색상 변경
   - 저장 → 즉시 대시보드 카드 색상 변경됨

2. **HTML 텍스트 수정** (30초)
   - `index.html`에서 제목 변경
   - 저장 → 즉시 화면 텍스트 업데이트됨

3. **JavaScript 기능 추가** (1분)
   - `renderer.js`에 새로운 알림 함수 추가
   - 저장 → 즉시 알림 기능 작동

4. **애니메이션 추가** (30초)
   - CSS 애니메이션 추가
   - 저장 → 즉시 버튼이 움직임

📋 **자세한 데모 스크립트**: `LIVE_DEMO_SCRIPT.md` 참조

#### 🛠️ 개발자 도구

개발 모드에서는 **Chrome DevTools**가 자동으로 열립니다:
- Console: 로그 출력 확인
- Elements: HTML/CSS 실시간 검사
- Network: API 호출 모니터링
- Sources: 디버깅 & 브레이크포인트

#### 💡 프로덕션 실행

```bash
# Hot Reload 없는 일반 실행
npm start
# 또는
./run.sh
```

📚 **전체 개발 가이드**: `DEV_GUIDE.md` 참조

## 핵심 포지셔닝

GOYO는 독립형 서비스가 아니라 **기존 케어 시스템에 통합되는 인텔리전스 레이어**입니다.

- ❌ 상담 서비스를 제공하는 것이 아님
- ✅ 상담 원리 기반의 운영 인사이트를 제공
- ✅ 조기 감지 및 예방적 개입
- ✅ 데이터 기반 의사결정 지원

## AI 아키텍처

현재 Decision Intelligence(지원형 AI)로 작동하지만, Agentic AI로 확장 가능한 구조:
- **목표 지향적**: 번아웃 예방
- **자율 감지**: 실시간 감정 신호 모니터링
- **맥락 해석**: 상황 기반 패턴 분석
- **행동 제안**: 구체적인 개입 방안
- **학습 루프**: 피드백 기반 개선

## 개발 히스토리

### v1.0.0 - 초기 구현
- 기본 대시보드 및 알림 시스템
- 감정 모니터링 및 차트
- 개입 방안 제안 (9페이지 구현)

### v2.0.0 - 프로페셔널 업그레이드
- 완전한 CRUD 기능
- 검색 및 필터링
- 알림 확인/해결 워크플로우
- 리포트 시스템
- 데이터 분석 페이지
- 반응형 디자인
- 8개 팀원으로 샘플 데이터 확장

## 라이선스

MIT

## 개발자

GOYO Team

---

**"GOYO는 오늘의 솔루션이 아니라 미래 케어 조직의 Emotional Operations Layer입니다."** 🚀

**시연회 대성공을 기원합니다!** 💪🎉

## v3.0.0 - 심리상담 자동 연계 시스템 (2026-02-17)

### 🆕 새로운 기능

#### 🧠 심리상담 자동 연계 시스템
고위험군 케어 인력을 자동으로 감지하고 전문 상담사와 연계하는 완전한 시스템입니다.

**주요 기능:**
- **자동 연계**: 위험도 높은 인력을 감지하면 자동으로 가용한 상담사와 매칭
- **실시간 모니터링**: 대시보드에서 예정된 상담 건수 실시간 확인
- **상담사 관리**: 상담사 추가, 수정, 가동률 모니터링
- **세션 관리**: 상담 세션 시작, 진행, 완료, 취소 관리
- **이력 추적**: 완료된 상담의 결과 및 후속 조치 기록

**통계 카드:**
1. 📅 **예정된 상담** - 예약된 상담 세션 수
2. 👨‍⚕️ **활동 상담사** - 현재 활동 중인 상담사 수
3. ✅ **완료된 상담** - 완료된 상담 총 건수
4. 🔗 **자동 연계 건수** - 시스템이 자동으로 연계한 건수

**3개 탭:**

**1. 상담 세션 탭**
- 모든 상담 세션 목록 (테이블 형식)
- 필터링: 상태별 (예정됨/진행중/완료됨/취소됨), 유형별 (자동/수동)
- 자동 연계 세션에 특별 배지 표시
- 우선순위 표시: 🚨 긴급, ⚠️ 높음, ✅ 보통
- 액션 버튼: 시작, 완료, 취소

**2. 상담사 관리 탭**
- 상담사 카드 그리드 뷰
- 각 카드에 표시:
  - 이름, 자격증
  - 전문 분야 태그 (번아웃, 스트레스, 우울 등)
  - 가용성 상태 (가능/바쁨/불가능)
  - 진행중 세션 수 / 최대 용량
  - 총 상담 건수
  - 가동률 프로그레스바
- 상담사 추가/수정 모달

**3. 상담 이력 탭**
- 타임라인 형식 이력
- 각 이력 항목:
  - 상담 일시
  - 케어 인력 ↔ 상담사
  - 상담 결과
  - 메모
  - 후속 상담 일정

**데이터베이스 스키마:**

```sql
-- 상담사 테이블
counselors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  license TEXT,
  specialties TEXT,
  phone TEXT,
  email TEXT,
  availability TEXT DEFAULT 'available',
  current_load INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- 상담 세션 테이블
counseling_sessions (
  id INTEGER PRIMARY KEY,
  worker_id INTEGER,
  counselor_id INTEGER,
  session_date DATETIME,
  session_type TEXT DEFAULT 'manual',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES care_workers(id),
  FOREIGN KEY (counselor_id) REFERENCES counselors(id)
)

-- 상담 이력 테이블
counseling_history (
  id INTEGER PRIMARY KEY,
  session_id INTEGER,
  outcome TEXT,
  notes TEXT,
  follow_up_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES counseling_sessions(id)
)
```

**API 엔드포인트 (추가):**
1. `get-counseling-stats` - 상담 통계 조회
2. `get-counseling-sessions` - 상담 세션 목록
3. `get-counselors` - 상담사 목록
4. `add-counselor` - 상담사 추가
5. `update-counselor` - 상담사 수정
6. `create-counseling-session` - 상담 세션 생성
7. `auto-link-counseling` - 자동 연계 (위험 인력용)
8. `update-session-status` - 세션 상태 업데이트
9. `get-counseling-history` - 상담 이력 조회
10. `add-counseling-history` - 상담 이력 추가

**샘플 데이터:**
- **5명의 상담사**:
  1. 박지은 - 임상심리사 1급 (번아웃, 스트레스, 우울)
  2. 김민수 - 상담심리사 1급 (직무 스트레스, 대인 관계)
  3. 이수진 - 임상심리사 2급 (정서 조절, 자존감)
  4. 최현우 - 정신건강임상심리사 (트라우마, PTSD)
  5. 정은혜 - 상담심리사 2급 (우울, 불안)

- **3개의 샘플 세션**:
  1. 김미영 ↔ 박지은 (자동 연계, 긴급)
  2. 최민준 ↔ 김민수 (자동 연계, 높음)
  3. 한민수 ↔ 이수진 (수동 생성, 보통)

**자동 연계 알고리즘:**
1. 위험 상태 케어 인력 감지
2. 가용 상담사 검색 (availability='available', current_load < max_capacity)
3. 가장 적은 가동률의 상담사 선택
4. 24시간 이내 세션 자동 생성
5. 우선순위: 위험 → 긴급, 주의 → 높음
6. 상담사 가동률 자동 업데이트

### 🎯 시연 포인트 (업데이트)

기존 5가지 포인트에 추가:

6. **🧠 심리상담 자동 연계**
   - "위험군 감지 시 즉시 전문 상담사 연계"
   - "상담사 가동률 실시간 모니터링"
   - "자동/수동 상담 통합 관리"

### 📊 프로젝트 통계 (업데이트)

- **총 코드 라인**: 4,500+ 줄
- **API 엔드포인트**: 28개 (18개 → 28개)
- **데이터베이스 테이블**: 8개 (5개 → 8개)
- **주요 뷰**: 6개 (5개 → 6개)
- **모달**: 4개 (3개 → 4개)
- **차트**: 6개
- **샘플 데이터**: 케어 인력 8명, 감정 로그 240개, 알림 3건, 상담사 5명, 상담 세션 3건

### 🔄 완전한 워크플로우

1. **감정 모니터링** → 케어 인력의 부정 감정 증가 감지
2. **조기 경보** → 위험도 72% 이상 시 알림 발생
3. **자동 연계** → 시스템이 자동으로 가용 상담사와 매칭
4. **상담 진행** → 상담사가 세션 시작 및 진행
5. **결과 기록** → 상담 완료 후 결과 및 후속 조치 기록
6. **지속 모니터링** → 개입 효과 추적 및 재평가

이제 GOYO는 **감지 → 경보 → 연계 → 개입 → 추적**의 완전한 케어 사이클을 제공합니다! 🎉

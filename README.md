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
├── main.js              # Electron 메인 프로세스
├── index.html           # 메인 HTML (모든 뷰 포함)
├── styles.css           # 통합 스타일시트
├── renderer.js          # 렌더러 프로세스 (UI 로직 + CRUD)
├── package.json         # 프로젝트 설정
├── goyo.db             # SQLite 데이터베이스 (자동 생성)
├── README.md           # 프로젝트 문서
├── DEMO_GUIDE.md       # 시연회 가이드
└── run.sh              # 실행 스크립트
```

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

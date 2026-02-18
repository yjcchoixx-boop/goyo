# GOYO 웹 개발 가이드

## 🌐 웹 버전 개요

GOYO를 **브라우저에서 직접 실행**할 수 있는 웹 버전입니다.
- ✅ Electron 앱 없이 브라우저에서 실행
- ✅ 모든 GOYO 기능 동일하게 작동
- ✅ Chrome DevTools 사용 가능
- ✅ 파일 수정 후 F5로 새로고침

---

## 🚀 빠른 시작

### 방법 1: npm 스크립트 사용
```bash
npm run web
```

### 방법 2: 쉘 스크립트 사용
```bash
./web-dev.sh
```

### 방법 3: 직접 실행
```bash
node web-server.js
```

---

## 📡 서버 정보

실행 후 콘솔에 표시되는 URL로 접속:
```
🌐 GOYO Web Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Local:   http://localhost:8080
📍 Network: http://0.0.0.0:8080
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

브라우저에서 **http://localhost:8080** 접속

---

## 🔧 아키텍처

### Electron 앱 vs 웹 버전

| 구분 | Electron 앱 | 웹 버전 |
|------|-------------|---------|
| 실행 환경 | 데스크톱 앱 | 브라우저 |
| 통신 방식 | IPC (Inter-Process Communication) | HTTP REST API |
| 데이터베이스 | SQLite (직접 접근) | SQLite (서버 경유) |
| 핫 리로드 | `electron-reload` | F5 수동 새로고침 |
| 개발 도구 | Electron DevTools | Chrome DevTools |

### 파일 구조
```
webapp/
├── index.html           # Electron용 HTML (renderer.js 사용)
├── index-web.html       # 웹용 HTML (renderer-web.js 사용)
├── renderer.js          # 공통 프론트엔드 로직
├── renderer-web.js      # 웹용 API 래퍼 (IPC → HTTP)
├── main.js              # Electron 메인 프로세스
├── web-server.js        # Node.js 웹 서버
├── styles.css           # 공통 스타일
└── goyo.db              # SQLite 데이터베이스
```

---

## 📝 API 통신

### Electron 앱 (IPC)
```javascript
// renderer.js에서
const workers = await window.api.invoke('get-active-workers');
```

### 웹 버전 (HTTP)
```javascript
// renderer-web.js가 자동으로 변환
window.api = {
  invoke: async (channel, data) => {
    const response = await fetch('/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, data })
    });
    return await response.json();
  }
};
```

**결과**: `renderer.js` 코드를 **전혀 수정하지 않고** 웹에서 실행 가능!

---

## 🎯 개발 워크플로우

### 1. 서버 시작
```bash
npm run web
```

### 2. 브라우저 접속
```
http://localhost:8080
```

### 3. 파일 수정
- `index-web.html` - HTML 수정
- `styles.css` - 스타일 수정  
- `renderer.js` - 로직 수정
- `web-server.js` - 백엔드 수정 (서버 재시작 필요)

### 4. 변경사항 확인
- 프론트엔드 수정: **F5** 새로고침
- 백엔드 수정: 서버 **재시작** 필요

---

## 🔍 디버깅

### Chrome DevTools 사용
1. 브라우저에서 **F12** 또는 우클릭 → 검사
2. Console 탭에서 로그 확인
3. Network 탭에서 API 요청/응답 확인
4. Elements 탭에서 DOM/CSS 확인

### 서버 로그 확인
터미널에서 서버 실행 시 콘솔 출력 확인:
```
✅ Sample data inserted: 960+ emotion logs, 10 alerts...
GET /styles.css 200
POST /api/ 200 (get-active-workers)
```

---

## 📊 샘플 데이터

웹 서버 시작 시 자동으로 생성:
- 👥 8명의 케어 인력
- 📝 960+ 감정 로그 (60일간)
- 🚨 10개의 리스크 알림
- 👨‍⚕️ 5명의 상담사
- 💬 7건의 상담 세션
- 📄 2개의 리포트

---

## 🛠️ 데이터베이스 초기화

새로운 샘플 데이터로 시작하려면:
```bash
rm goyo.db
npm run web
```

또는:
```bash
./web-dev.sh  # 자동으로 DB 삭제 후 시작
```

---

## 🚦 서버 중지

### 터미널에서 Ctrl+C

또는 프로세스 찾아서 종료:
```bash
# 서버 프로세스 찾기
ps aux | grep web-server

# 종료
kill <PID>
```

---

## 🎨 UI 개발 팁

### 1. 실시간 CSS 수정
```css
/* styles.css 수정 */
.card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```
→ 저장 후 **F5**

### 2. HTML 구조 수정
```html
<!-- index-web.html 수정 -->
<div class="new-feature">
  새로운 기능
</div>
```
→ 저장 후 **F5**

### 3. JavaScript 로직 수정
```javascript
// renderer.js 수정
async function newFeature() {
  const data = await window.api.invoke('get-data');
  console.log(data);
}
```
→ 저장 후 **F5**

---

## 📦 배포

### 프로덕션 빌드 (추후 구현)
```bash
# 빌드 스크립트 예시
npm run build:web
```

### Docker 컨테이너 (추후 구현)
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 8080
CMD ["node", "web-server.js"]
```

---

## 🔐 보안 고려사항

### 개발 환경
- ✅ CORS 활성화 (`Access-Control-Allow-Origin: *`)
- ✅ 로컬호스트 전용
- ⚠️ 인증/인가 없음

### 프로덕션 환경 (추후 구현)
- 🔒 JWT 인증
- 🔒 HTTPS 필수
- 🔒 CORS 제한
- 🔒 Rate Limiting
- 🔒 SQL Injection 방지

---

## 🆚 Electron vs Web 비교

### Electron 앱을 사용해야 할 때
- ✅ 오프라인 실행 필요
- ✅ 파일 시스템 접근 필요
- ✅ 네이티브 기능 필요 (알림, 시스템 트레이 등)
- ✅ 설치형 앱 배포

### 웹 버전을 사용해야 할 때
- ✅ 빠른 개발/테스트
- ✅ 여러 기기에서 접속
- ✅ 팀 협업 개발
- ✅ 클라우드 배포
- ✅ 모바일 브라우저 지원

---

## 📚 관련 문서

- [DEV_GUIDE.md](./DEV_GUIDE.md) - Electron 개발 가이드
- [LIVE_DEMO_SCRIPT.md](./LIVE_DEMO_SCRIPT.md) - 라이브 데모 스크립트
- [README.md](./README.md) - 프로젝트 전체 문서
- [RESET_DATA.md](./RESET_DATA.md) - 데이터 초기화 가이드

---

## 🎯 다음 단계

1. **기능 개발**: `renderer.js`에 새로운 기능 추가
2. **API 확장**: `web-server.js`에 새로운 엔드포인트 추가
3. **UI 개선**: `styles.css`로 디자인 개선
4. **테스트**: 브라우저에서 모든 기능 테스트
5. **배포**: 클라우드 플랫폼에 배포

---

**Happy Coding! 🚀**

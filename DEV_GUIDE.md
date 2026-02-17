# 🔥 GOYO 개발 모드 가이드

## 🚀 빠른 시작

### 개발 모드 실행 (Hot Reload 활성화)
```bash
npm run dev
```

개발 모드에서는 다음 기능이 자동으로 활성화됩니다:
- ✅ **파일 변경 감지 및 자동 새로고침**
- ✅ **개발자 도구 자동 열기**
- ✅ **디버깅 로그 출력**

### 프로덕션 모드 실행
```bash
npm start
```

### 자세한 로그와 함께 개발 모드
```bash
npm run dev:verbose
```

---

## 🔥 Hot Reload 기능

### 자동 새로고침되는 파일
- ✅ `index.html` - HTML 구조 변경
- ✅ `renderer.js` - 프론트엔드 JavaScript
- ✅ `styles.css` - 스타일 변경
- ✅ `main.js` - Electron 메인 프로세스 (앱 재시작)

### 자동 새로고침 **제외**되는 파일
- ❌ `node_modules/` - 의존성 패키지
- ❌ `*.db` - 데이터베이스 파일
- ❌ `*.log` - 로그 파일
- ❌ `package.json` - 패키지 설정 (수정 시 수동 재시작 필요)
- ❌ `package-lock.json` - 잠금 파일

---

## 💡 개발 워크플로우

### 1️⃣ **프론트엔드 개발 (즉시 반영)**

**HTML 수정:**
```bash
# index.html 수정
code index.html
# 저장하면 자동 새로고침! ⚡
```

**CSS 수정:**
```bash
# styles.css 수정
code styles.css
# 저장하면 자동 새로고침! ⚡
```

**JavaScript 수정:**
```bash
# renderer.js 수정
code renderer.js
# 저장하면 자동 새로고침! ⚡
```

### 2️⃣ **백엔드 개발 (앱 재시작)**

**Main Process 수정:**
```bash
# main.js 수정 (IPC 핸들러, DB 스키마 등)
code main.js
# 저장하면 앱 자동 재시작! 🔄
```

### 3️⃣ **실시간 디버깅**

개발 모드에서는 Chrome DevTools가 자동으로 열립니다:
- **Console**: `console.log()` 출력 확인
- **Elements**: HTML/CSS 실시간 수정
- **Network**: API 호출 모니터링
- **Sources**: 브레이크포인트 설정 및 디버깅

---

## 🎯 AI MBA 발표 시연용 팁

### 실시간 데모 시나리오

**시나리오 1: UI 색상 즉시 변경**
```css
/* styles.css에서 */
.stat-card {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); /* 빨강으로 변경 */
}
```
→ 저장 → **즉시 반영!** 🎨

**시나리오 2: 실시간 텍스트 수정**
```html
<!-- index.html에서 -->
<h2>실시간 감정 모니터링 대시보드 🚀 LIVE DEMO</h2>
```
→ 저장 → **즉시 반영!** 📝

**시나리오 3: 새로운 기능 추가**
```javascript
// renderer.js에서 새 함수 추가
function showLiveDemo() {
  showNotification('🔥 실시간 개발 모드 데모!', 'success');
}
```
→ 저장 → **즉시 반영!** ⚡

---

## 🐛 문제 해결

### Hot Reload가 작동하지 않을 때

**1. 개발 모드로 실행했는지 확인:**
```bash
npm run dev  # ✅ 올바름
npm start    # ❌ 프로덕션 모드 (Hot Reload 없음)
```

**2. electron-reload 설치 확인:**
```bash
npm list electron-reload
# 없다면:
npm install --save-dev electron-reload
```

**3. 수동 새로고침:**
- `Ctrl+R` (Windows/Linux) 또는 `Cmd+R` (Mac): 페이지 새로고침
- `Ctrl+Shift+R` (Windows/Linux) 또는 `Cmd+Shift+R` (Mac): 캐시 삭제 후 새로고침

**4. 완전 재시작:**
```bash
# 앱 종료 후
npm run dev
```

### 개발자 도구가 열리지 않을 때

`main.js`에서 확인:
```javascript
if (process.argv.includes('--dev')) {
  mainWindow.webContents.openDevTools(); // ✅ 이 줄이 있는지 확인
}
```

### 데이터베이스 변경이 반영되지 않을 때

데이터베이스 스키마 변경 시:
```bash
# 1. 앱 종료
# 2. DB 파일 삭제 (개발 환경에서만!)
rm goyo.db
# 3. 앱 재시작
npm run dev
```

---

## 📦 패키지 구조

```
goyo/
├── index.html          ← 프론트엔드 HTML (Hot Reload ✅)
├── renderer.js         ← 프론트엔드 JS (Hot Reload ✅)
├── styles.css          ← 스타일 (Hot Reload ✅)
├── main.js             ← 백엔드 (앱 재시작 🔄)
├── package.json        ← 패키지 설정
├── goyo.db             ← SQLite 데이터베이스
├── node_modules/       ← 의존성
└── DEV_GUIDE.md        ← 이 파일
```

---

## 🎓 AI MBA 발표 체크리스트

### 발표 전 준비
- [ ] `npm run dev` 실행하여 개발 모드 시작
- [ ] 개발자 도구가 자동으로 열렸는지 확인
- [ ] 콘솔에 "🔥 Hot reload enabled" 메시지 확인
- [ ] 간단한 CSS 변경으로 Hot Reload 테스트

### 발표 중 실시간 데모
1. **"코드를 저장하면 즉시 반영됩니다"** 강조
2. CSS 색상 변경 → 저장 → **즉시 확인**
3. HTML 텍스트 수정 → 저장 → **즉시 확인**
4. 새로운 알림 기능 추가 → 저장 → **즉시 실행**

### 발표 후
- [ ] 변경 사항 Git 커밋
- [ ] 프로덕션 빌드 테스트 (`npm start`)
- [ ] 최종 코드 GitHub 푸시

---

## 🔧 추가 개발 도구

### VS Code 확장 프로그램 추천
- **ESLint**: JavaScript 린팅
- **Prettier**: 코드 포맷팅
- **Live Server**: HTML 미리보기
- **GitLens**: Git 히스토리 확인

### 유용한 단축키
- `F12`: 개발자 도구 열기/닫기
- `Ctrl+Shift+I`: 개발자 도구 열기
- `Ctrl+R`: 페이지 새로고침
- `Ctrl+Shift+C`: 요소 검사 모드

---

## 📚 참고 자료

### Electron 공식 문서
- [Electron Docs](https://www.electronjs.org/docs)
- [IPC 통신](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [디버깅 가이드](https://www.electronjs.org/docs/latest/tutorial/debugging-main-process)

### GOYO 프로젝트 문서
- `README.md` - 프로젝트 개요 및 기능
- `DEMO_GUIDE.md` - 시연회 가이드
- `DEMO_CHECKLIST.md` - 시연 체크리스트
- `PROJECT_SUMMARY.md` - 프로젝트 요약

---

## 🎉 Happy Coding!

**GOYO v3.3.0**을 위한 최적화된 개발 환경이 준비되었습니다!

질문이나 문제가 있다면:
1. 개발자 도구 콘솔 확인
2. `npm run dev:verbose`로 상세 로그 확인
3. 이 가이드의 "문제 해결" 섹션 참조

**즐거운 개발 되세요!** 🚀

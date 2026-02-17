#!/bin/bash

# GOYO 개발 모드 시작 스크립트
# Hot Reload 활성화 + 개발자 도구 자동 열기

echo "🔥 GOYO 개발 모드 시작..."
echo ""
echo "✅ Hot Reload 활성화됨"
echo "✅ 개발자 도구 자동 열림"
echo "✅ 파일 변경 시 자동 새로고침"
echo ""
echo "📝 수정 가능 파일:"
echo "  - index.html (즉시 반영)"
echo "  - renderer.js (즉시 반영)"
echo "  - styles.css (즉시 반영)"
echo "  - main.js (앱 재시작)"
echo ""
echo "🛑 종료: Ctrl+C"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 개발 모드 실행
npm run dev


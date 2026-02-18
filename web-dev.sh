#!/bin/bash

echo "╔════════════════════════════════════════════════╗"
echo "║  🌐 GOYO 웹 개발 서버 시작                    ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "🔥 Hot Reload: 활성화"
echo "📡 포트: 3000"
echo "🌍 브라우저에서 접속 가능"
echo ""
echo "✨ 편집 가능한 파일:"
echo "   - index.html"
echo "   - renderer.js"
echo "   - styles.css"
echo "   - web-server.js"
echo ""
echo "💡 파일을 저장하면 브라우저를 새로고침하세요 (Ctrl+R)"
echo ""
echo "Starting server..."
echo ""

# nodemon이 설치되어 있으면 사용, 없으면 일반 node 사용
if command -v nodemon &> /dev/null; then
    nodemon web-server.js
else
    echo "💡 Tip: 'npm install -g nodemon'으로 자동 재시작 활성화"
    node web-server.js
fi

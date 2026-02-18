#!/bin/bash
echo "🌐 Starting GOYO Web Development Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Web Server Features:"
echo "  • 브라우저에서 실행 (Electron 불필요)"
echo "  • 실시간 파일 수정 후 F5로 새로고침"
echo "  • Chrome DevTools 사용 가능"
echo "  • 모든 GOYO 기능 동일하게 작동"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Remove old database to get fresh sample data
if [ -f "goyo.db" ]; then
  echo "🗑️  Removing old database..."
  rm goyo.db
fi

# Start the web server
node web-server.js

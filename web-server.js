const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// SQLite 데이터베이스 연결
let db;
try {
  db = new Database(path.join(__dirname, 'goyo.db'));
  console.log('✅ SQLite 데이터베이스 연결 성공');
} catch (error) {
  console.error('데이터베이스 연결 실패:', error);
  process.exit(1);
}

// ===========================
// API 엔드포인트
// ===========================

// 활성 근무자 조회
app.get('/api/active-workers', (req, res) => {
  try {
    const workers = db.prepare("SELECT * FROM care_workers WHERE status = 'active' ORDER BY name").all();
    res.json(workers);
  } catch (error) {
    console.error('근무자 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 특정 근무자 조회
app.get('/api/worker/:id', (req, res) => {
  try {
    const worker = db.prepare("SELECT * FROM care_workers WHERE id = ?").get(req.params.id);
    res.json(worker || {});
  } catch (error) {
    console.error('근무자 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 최근 감정 로그 조회
app.get('/api/emotion-logs', (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const logs = db.prepare(`
      SELECT el.*, cw.name as worker_name
      FROM emotion_logs el
      LEFT JOIN care_workers cw ON el.worker_id = cw.id
      ORDER BY el.timestamp DESC
      LIMIT ?
    `).all(limit);
    res.json(logs);
  } catch (error) {
    console.error('감정 로그 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 감정 로그 추가
app.post('/api/emotion-logs', (req, res) => {
  try {
    const { workerId, emotion, intensity, notes, context } = req.body;
    
    const result = db.prepare(`
      INSERT INTO emotion_logs (worker_id, emotion, intensity, notes, context, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(workerId, emotion, intensity, notes || '', context || 'manual');
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('감정 로그 추가 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 리스크 알림 조회
app.get('/api/risk-alerts', (req, res) => {
  try {
    const status = req.query.status;
    let sql = `
      SELECT ra.*, cw.name as worker_name
      FROM risk_alerts ra
      LEFT JOIN care_workers cw ON ra.worker_id = cw.id
      ORDER BY ra.created_at DESC
    `;
    
    let alerts;
    if (status) {
      sql = `
        SELECT ra.*, cw.name as worker_name
        FROM risk_alerts ra
        LEFT JOIN care_workers cw ON ra.worker_id = cw.id
        WHERE ra.status = ?
        ORDER BY ra.created_at DESC
      `;
      alerts = db.prepare(sql).all(status);
    } else {
      alerts = db.prepare(sql).all();
    }
    
    res.json(alerts);
  } catch (error) {
    console.error('리스크 알림 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 상담 세션 조회
app.get('/api/counseling-sessions', (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT cs.*, 
             cw.name as worker_name,
             c.name as counselor_name
      FROM counseling_sessions cs
      LEFT JOIN care_workers cw ON cs.worker_id = cw.id
      LEFT JOIN counselors c ON cs.counselor_id = c.id
      ORDER BY cs.session_date DESC
    `).all();
    res.json(sessions);
  } catch (error) {
    console.error('상담 세션 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 상담사 조회
app.get('/api/counselors', (req, res) => {
  try {
    const counselors = db.prepare("SELECT * FROM counselors WHERE status = 'active' ORDER BY name").all();
    res.json(counselors);
  } catch (error) {
    console.error('상담사 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 통계 조회
app.get('/api/statistics', (req, res) => {
  try {
    const stats = {
      totalWorkers: db.prepare("SELECT COUNT(*) as count FROM care_workers WHERE status = 'active'").get().count,
      totalLogs: db.prepare("SELECT COUNT(*) as count FROM emotion_logs").get().count,
      activeAlerts: db.prepare("SELECT COUNT(*) as count FROM risk_alerts WHERE status = 'active'").get().count,
      totalSessions: db.prepare("SELECT COUNT(*) as count FROM counseling_sessions").get().count
    };
    res.json(stats);
  } catch (error) {
    console.error('통계 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🚀 GOYO 웹 서버가 시작되었습니다!        ║
╚════════════════════════════════════════════╝

📡 로컬 URL: http://localhost:${PORT}
🌐 네트워크 URL: http://0.0.0.0:${PORT}

✨ API 엔드포인트:
  GET  /api/active-workers
  GET  /api/worker/:id
  GET  /api/emotion-logs?limit=100
  POST /api/emotion-logs
  GET  /api/risk-alerts?status=active
  GET  /api/counseling-sessions
  GET  /api/counselors
  GET  /api/statistics

📊 웹 인터페이스:
  http://localhost:${PORT}

종료하려면 Ctrl+C를 누르세요.
  `);
});

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n\n서버를 종료합니다...');
  db.close();
  console.log('✅ 데이터베이스 연결이 종료되었습니다.');
  process.exit(0);
});

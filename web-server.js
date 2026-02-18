const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PORT = 8080;
let db;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Initialize database (same as Electron app)
function initDatabase() {
  const dbPath = path.join(__dirname, 'goyo.db');
  db = new Database(dbPath);
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      hire_date TEXT NOT NULL,
      contact TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emotion_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      emotion_type TEXT NOT NULL,
      intensity INTEGER NOT NULL,
      notes TEXT,
      activity_context TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES workers (id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      risk_score REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY (worker_id) REFERENCES workers (id)
    );

    CREATE TABLE IF NOT EXISTS interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alert_id) REFERENCES alerts (id)
    );

    CREATE TABLE IF NOT EXISTS counselors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_number TEXT NOT NULL,
      specialties TEXT NOT NULL,
      contact TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS counseling_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      counselor_id INTEGER NOT NULL,
      session_date TEXT NOT NULL,
      session_type TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      is_auto_linked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES workers (id),
      FOREIGN KEY (counselor_id) REFERENCES counselors (id)
    );

    CREATE TABLE IF NOT EXISTS counseling_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      counselor_notes TEXT,
      worker_feedback TEXT,
      effectiveness_score INTEGER,
      follow_up_required INTEGER DEFAULT 0,
      follow_up_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES counseling_sessions (id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      generated_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check if we need to insert sample data
  const workerCount = db.prepare('SELECT COUNT(*) as count FROM workers').get();
  if (workerCount.count === 0) {
    insertSampleData();
  }
}

function insertSampleData() {
  // Same sample data as Electron app
  const workers = [
    { name: '김미영', role: '요양보호사', department: 'A동', hire_date: '2023-01-15', contact: '010-1234-5678', is_active: 1 },
    { name: '이정수', role: '간호사', department: 'B동', hire_date: '2022-06-20', contact: '010-2345-6789', is_active: 1 },
    { name: '박서연', role: '사회복지사', department: 'C동', hire_date: '2023-03-10', contact: '010-3456-7890', is_active: 1 },
    { name: '최민준', role: '물리치료사', department: 'A동', hire_date: '2021-09-05', contact: '010-4567-8901', is_active: 1 },
    { name: '정하늘', role: '요양보호사', department: 'B동', hire_date: '2023-07-01', contact: '010-5678-9012', is_active: 1 },
    { name: '강지우', role: '간호사', department: 'C동', hire_date: '2022-11-15', contact: '010-6789-0123', is_active: 1 },
    { name: '윤서아', role: '사회복지사', department: 'A동', hire_date: '2023-02-28', contact: '010-7890-1234', is_active: 1 },
    { name: '한민수', role: '요양보호사', department: 'B동', hire_date: '2022-04-12', contact: '010-8901-2345', is_active: 1 }
  ];

  const insertWorker = db.prepare('INSERT INTO workers (name, role, department, hire_date, contact, is_active) VALUES (?, ?, ?, ?, ?, ?)');
  workers.forEach(w => {
    insertWorker.run(w.name, w.role, w.department, w.hire_date, w.contact, w.is_active);
  });

  // Emotion logs for 60 days with realistic patterns
  const emotionTypes = ['긍정적', '만족', '중립적', '피로', '스트레스', '부정적'];
  const activities = [
    '환자 체크', '투약 관리', '식사 보조', '이동 지원', '위생 관리', '가족 상담',
    '서류 작업', '팀 미팅', '응급 상황', '야간 근무', '환자 간호', '재활 치료',
    '심리 상담', '활동 프로그램', '건강 모니터링', '약물 관리', '응급 처치',
    '환자 교육', '보호자 상담', '행정 업무'
  ];

  const insertLog = db.prepare('INSERT INTO emotion_logs (worker_id, emotion_type, intensity, notes, activity_context, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  
  const now = new Date();
  for (let workerId = 1; workerId <= 8; workerId++) {
    for (let day = 0; day < 60; day++) {
      const logsPerDay = 2 + Math.floor(Math.random() * 3); // 2-4 logs per day
      
      for (let logIndex = 0; logIndex < logsPerDay; logIndex++) {
        const logDate = new Date(now);
        logDate.setDate(logDate.getDate() - day);
        logDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
        
        let emotionType, intensity;
        
        // Worker 1 (김미영) - high risk pattern (last 2 weeks)
        if (workerId === 1 && day < 14) {
          const negative = Math.random() < 0.75;
          emotionType = negative ? (Math.random() < 0.6 ? '부정적' : '스트레스') : '피로';
          intensity = negative ? 7 + Math.floor(Math.random() * 3) : 6 + Math.floor(Math.random() * 2);
        }
        // Worker 4 (최민준) - caution pattern (last 3 weeks)
        else if (workerId === 4 && day < 21) {
          const fatigued = Math.random() < 0.6;
          emotionType = fatigued ? '피로' : (Math.random() < 0.5 ? '스트레스' : '중립적');
          intensity = fatigued ? 6 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 2);
        }
        // Worker 8 (한민수) - moderate stress (last 10 days)
        else if (workerId === 8 && day < 10) {
          const stressed = Math.random() < 0.5;
          emotionType = stressed ? '스트레스' : (Math.random() < 0.5 ? '피로' : '중립적');
          intensity = 5 + Math.floor(Math.random() * 3);
        }
        // Others - mostly stable with occasional stress
        else {
          const rand = Math.random();
          if (rand < 0.4) emotionType = '긍정적';
          else if (rand < 0.65) emotionType = '만족';
          else if (rand < 0.8) emotionType = '중립적';
          else if (rand < 0.9) emotionType = '피로';
          else emotionType = '스트레스';
          
          intensity = emotionType === '긍정적' || emotionType === '만족' ? 
            3 + Math.floor(Math.random() * 3) : 
            5 + Math.floor(Math.random() * 3);
        }
        
        const activity = activities[Math.floor(Math.random() * activities.length)];
        const note = `${activity} 중 감정 체크`;
        
        insertLog.run(workerId, emotionType, intensity, note, activity, logDate.toISOString());
      }
    }
  }

  // Risk alerts
  const insertAlert = db.prepare('INSERT INTO alerts (worker_id, alert_type, severity, message, status, risk_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  const alerts = [
    { worker_id: 1, type: 'burnout', severity: 'high', message: '최근 2주간 부정적 감정 75% 이상 지속', status: 'active', score: 72 },
    { worker_id: 1, type: 'stress', severity: 'high', message: '스트레스 지수 지속적 상승', status: 'in_progress', score: 68 },
    { worker_id: 4, type: 'fatigue', severity: 'medium', message: '피로도 60% 이상 3주 지속', status: 'active', score: 58 },
    { worker_id: 4, type: 'burnout', severity: 'medium', message: '번아웃 조기 징후 감지', status: 'resolved', score: 55 },
    { worker_id: 8, type: 'stress', severity: 'medium', message: '최근 10일간 스트레스 50% 이상', status: 'active', score: 45 },
    { worker_id: 2, type: 'workload', severity: 'low', message: '업무 부하 증가 감지', status: 'resolved', score: 35 },
    { worker_id: 3, type: 'fatigue', severity: 'low', message: '일시적 피로 증가', status: 'resolved', score: 32 },
    { worker_id: 5, type: 'stress', severity: 'medium', message: '스트레스 주의 단계', status: 'resolved', score: 42 },
    { worker_id: 6, type: 'burnout', severity: 'low', message: '번아웃 예방 필요', status: 'resolved', score: 28 },
    { worker_id: 7, type: 'stress', severity: 'low', message: '일시적 스트레스 증가', status: 'resolved', score: 30 }
  ];

  const alertDate = new Date();
  alerts.forEach((a, index) => {
    const date = new Date(alertDate);
    date.setDate(date.getDate() - index * 2);
    insertAlert.run(a.worker_id, a.type, a.severity, a.message, a.status, a.score, date.toISOString());
  });

  // Counselors
  const counselors = [
    { name: '박지은', license: 'PSY-2021-001', specialties: '번아웃 상담, 스트레스 관리', contact: '010-1111-2222' },
    { name: '김민수', license: 'PSY-2020-045', specialties: '우울증, 불안장애', contact: '010-2222-3333' },
    { name: '이서연', license: 'PSY-2022-012', specialties: '대인관계, 직장 내 갈등', contact: '010-3333-4444' },
    { name: '최정훈', license: 'PSY-2019-078', specialties: '트라우마, PTSD', contact: '010-4444-5555' },
    { name: '한수진', license: 'PSY-2021-089', specialties: '감정조절, 분노관리', contact: '010-5555-6666' }
  ];

  const insertCounselor = db.prepare('INSERT INTO counselors (name, license_number, specialties, contact, is_active) VALUES (?, ?, ?, ?, 1)');
  counselors.forEach(c => {
    insertCounselor.run(c.name, c.license, c.specialties, c.contact);
  });

  // Counseling sessions
  const insertSession = db.prepare('INSERT INTO counseling_sessions (worker_id, counselor_id, session_date, session_type, status, notes, is_auto_linked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  const sessions = [
    { worker_id: 1, counselor_id: 1, type: '개인상담', status: 'scheduled', notes: '긴급 번아웃 상담', is_auto: 1 },
    { worker_id: 1, counselor_id: 1, type: '후속상담', status: 'scheduled', notes: '2회차 상담', is_auto: 0 },
    { worker_id: 4, counselor_id: 2, type: '개인상담', status: 'scheduled', notes: '스트레스 관리 상담', is_auto: 1 },
    { worker_id: 8, counselor_id: 3, type: '개인상담', status: 'in_progress', notes: '직장 내 스트레스 상담', is_auto: 0 },
    { worker_id: 2, counselor_id: 4, type: '그룹상담', status: 'completed', notes: '팀 빌딩 세션', is_auto: 0 },
    { worker_id: 5, counselor_id: 5, type: '개인상담', status: 'completed', notes: '감정관리 상담 완료', is_auto: 0 },
    { worker_id: 3, counselor_id: 1, type: '개인상담', status: 'cancelled', notes: '일정 변경 요청', is_auto: 0 }
  ];

  const sessionDate = new Date();
  sessions.forEach((s, index) => {
    const date = new Date(sessionDate);
    if (s.status === 'scheduled') {
      date.setDate(date.getDate() + (index + 1));
    } else if (s.status === 'completed') {
      date.setDate(date.getDate() - (index * 3));
    } else {
      date.setDate(date.getDate() - index);
    }
    insertSession.run(s.worker_id, s.counselor_id, date.toISOString().split('T')[0], 
                     s.type, s.status, s.notes, s.is_auto, date.toISOString());
  });

  // Counseling history
  const insertHistory = db.prepare('INSERT INTO counseling_history (session_id, counselor_notes, worker_feedback, effectiveness_score, follow_up_required, follow_up_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  const histories = [
    { session_id: 5, notes: '스트레스 관리 기법 교육', feedback: '많은 도움이 되었습니다', score: 9, follow_up: 0 },
    { session_id: 6, notes: '감정 조절 전략 수립', feedback: '실용적인 조언 감사합니다', score: 8, follow_up: 1 },
    { session_id: 7, notes: '일정 조율 필요', feedback: '다음 기회에 참여하겠습니다', score: 5, follow_up: 1 }
  ];

  histories.forEach((h, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (index * 5));
    const followUpDate = h.follow_up ? new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null;
    insertHistory.run(h.session_id, h.notes, h.feedback, h.score, h.follow_up, followUpDate, date.toISOString());
  });

  // Reports
  const insertReport = db.prepare('INSERT INTO reports (report_type, title, content, period_start, period_end, generated_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  const reports = [
    {
      type: 'weekly',
      title: '주간 감정 모니터링 리포트',
      content: JSON.stringify({
        summary: '전체 인력의 감정 상태 양호, 1명 고위험군 감지',
        totalWorkers: 8,
        alertCount: 3,
        avgRiskScore: 42.5
      }),
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      by: 'GOYO System'
    },
    {
      type: 'monthly',
      title: '월간 번아웃 예방 리포트',
      content: JSON.stringify({
        summary: '전월 대비 스트레스 지수 15% 감소',
        interventions: 12,
        successRate: 85
      }),
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      by: 'GOYO System'
    }
  ];

  const reportDate = new Date();
  reports.forEach((r, index) => {
    const date = new Date(reportDate);
    date.setDate(date.getDate() - index * 7);
    insertReport.run(r.type, r.title, r.content, r.start, r.end, r.by, date.toISOString());
  });

  console.log('✅ Sample data inserted: 960+ emotion logs, 10 alerts, 5 counselors, 7 sessions, 3 histories, 2 reports');
}

// API handlers
const apiHandlers = {
  'get-active-workers': () => {
    return db.prepare('SELECT * FROM workers WHERE is_active = 1 ORDER BY name').all();
  },
  
  'get-worker': (data) => {
    return db.prepare('SELECT * FROM workers WHERE id = ?').get(data.id);
  },
  
  'get-emotion-logs': (data) => {
    const { startDate, endDate, workerId } = data;
    let query = 'SELECT el.*, w.name as worker_name FROM emotion_logs el JOIN workers w ON el.worker_id = w.id WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND date(el.created_at) >= date(?)';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date(el.created_at) <= date(?)';
      params.push(endDate);
    }
    if (workerId) {
      query += ' AND el.worker_id = ?';
      params.push(workerId);
    }
    
    query += ' ORDER BY el.created_at DESC';
    return db.prepare(query).all(...params);
  },
  
  'add-emotion-log': (data) => {
    const stmt = db.prepare('INSERT INTO emotion_logs (worker_id, emotion_type, intensity, notes, activity_context, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(data.workerId, data.emotionType, data.intensity, data.notes, data.activityContext, data.createdAt || new Date().toISOString());
    return { id: result.lastInsertRowid, success: true };
  },
  
  'get-risk-alerts': (data) => {
    let query = 'SELECT a.*, w.name as worker_name, w.role, w.department FROM alerts a JOIN workers w ON a.worker_id = w.id';
    const params = [];
    
    if (data && data.status) {
      query += ' WHERE a.status = ?';
      params.push(data.status);
    }
    
    query += ' ORDER BY a.created_at DESC';
    return db.prepare(query).all(...params);
  },
  
  'get-dashboard-stats': () => {
    const workers = db.prepare('SELECT * FROM workers WHERE is_active = 1').all();
    const alerts = db.prepare('SELECT * FROM alerts WHERE status IN ("active", "in_progress")').all();
    
    // Calculate risk categories
    const riskCounts = { stable: 0, caution: 0, risk: 0 };
    workers.forEach(worker => {
      const recentLogs = db.prepare(`
        SELECT emotion_type FROM emotion_logs 
        WHERE worker_id = ? AND date(created_at) >= date('now', '-7 days')
      `).all(worker.id);
      
      if (recentLogs.length === 0) {
        riskCounts.stable++;
        return;
      }
      
      const negativeCount = recentLogs.filter(l => ['부정적', '스트레스'].includes(l.emotion_type)).length;
      const negativePercent = (negativeCount / recentLogs.length) * 100;
      
      if (negativePercent >= 60) riskCounts.risk++;
      else if (negativePercent >= 40) riskCounts.caution++;
      else riskCounts.stable++;
    });
    
    return {
      totalWorkers: workers.length,
      activeAlerts: alerts.length,
      riskCounts,
      recentLogs: db.prepare('SELECT COUNT(*) as count FROM emotion_logs WHERE date(created_at) >= date("now", "-7 days")').get().count
    };
  },
  
  'get-counselors': () => {
    return db.prepare('SELECT * FROM counselors WHERE is_active = 1 ORDER BY name').all();
  },
  
  'get-counseling-sessions': () => {
    const query = `
      SELECT cs.*, 
             w.name as worker_name, w.role as worker_role,
             c.name as counselor_name, c.license_number
      FROM counseling_sessions cs
      JOIN workers w ON cs.worker_id = w.id
      JOIN counselors c ON cs.counselor_id = c.id
      ORDER BY cs.session_date DESC
    `;
    return db.prepare(query).all();
  }
};

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API endpoint
  if (req.url.startsWith('/api/')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { channel, data } = JSON.parse(body);
          const handler = apiHandlers[channel];
          
          if (handler) {
            const result = handler(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unknown API channel' }));
          }
        } catch (error) {
          console.error('API Error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } else {
      res.writeHead(405);
      res.end();
    }
    return;
  }
  
  // Serve static files
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index-web.html';
  }
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Start server
initDatabase();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🌐 GOYO Web Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Local:   http://localhost:${PORT}
📍 Network: http://0.0.0.0:${PORT}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 Hot Reload: Save files to see changes instantly
📁 Serving from: ${__dirname}
💾 Database: goyo.db
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

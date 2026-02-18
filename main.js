const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

// Hot reload for development
if (process.argv.includes('--dev')) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit',
      ignored: [
        /node_modules/,
        /\.db$/,
        /\.log$/,
        /package\.json/,
        /package-lock\.json/
      ]
    });
    console.log('🔥 Hot reload enabled - changes will be automatically reflected!');
  } catch (err) {
    console.log('⚠️ electron-reload not found, continuing without hot reload');
  }
}

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1419'
  });

  mainWindow.loadFile('index.html');
  
  // 개발 모드에서는 개발자 도구 열기
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function initDatabase() {
  db = new Database('goyo.db');
  
  // 케어 인력 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      team TEXT NOT NULL,
      hire_date TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      risk_status TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 감정 데이터 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS emotion_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      emotion_type TEXT NOT NULL,
      intensity REAL NOT NULL,
      context TEXT,
      FOREIGN KEY (worker_id) REFERENCES care_workers(id)
    )
  `);
  
  // 리스크 알림 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS risk_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      alert_date TEXT NOT NULL,
      risk_score REAL NOT NULL,
      risk_level TEXT NOT NULL,
      alert_type TEXT DEFAULT 'burnout',
      status TEXT DEFAULT 'pending',
      acknowledged_at TEXT,
      resolved_at TEXT,
      notes TEXT,
      FOREIGN KEY (worker_id) REFERENCES care_workers(id)
    )
  `);
  
  // 개입 조치 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      intervention_type TEXT NOT NULL,
      description TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      completed_date TEXT,
      FOREIGN KEY (alert_id) REFERENCES risk_alerts(id)
    )
  `);
  
  // 리포트 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL,
      report_name TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      data TEXT,
      summary TEXT
    )
  `);
  
  // 샘플 데이터 삽입
  const workerCount = db.prepare('SELECT COUNT(*) as count FROM care_workers').get();
  if (workerCount.count === 0) {
    insertSampleData();
  }
}

function insertSampleData() {
  const insertWorker = db.prepare(`
    INSERT INTO care_workers (name, role, team, hire_date, phone, email, risk_status) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const workers = [
    ['김미영', '요양보호사', 'A팀', '2022-03-15', '010-1234-5678', 'kim@goyo.kr', 'danger'],
    ['이정수', '간호사', 'A팀', '2021-08-20', '010-2345-6789', 'lee@goyo.kr', 'normal'],
    ['박서연', '요양보호사', 'B팀', '2023-01-10', '010-3456-7890', 'park@goyo.kr', 'normal'],
    ['최민준', '사회복지사', 'B팀', '2020-11-05', '010-4567-8901', 'choi@goyo.kr', 'warning'],
    ['정수진', '요양보호사', 'C팀', '2022-07-18', '010-5678-9012', 'jung@goyo.kr', 'normal'],
    ['강지훈', '간호사', 'C팀', '2023-06-01', '010-6789-0123', 'kang@goyo.kr', 'normal'],
    ['윤서아', '요양보호사', 'A팀', '2023-09-15', '010-7890-1234', 'yoon@goyo.kr', 'normal'],
    ['한민수', '사회복지사', 'B팀', '2022-12-01', '010-8901-2345', 'han@goyo.kr', 'warning']
  ];
  
  workers.forEach(worker => insertWorker.run(worker));
  
  // 감정 로그 샘플 데이터 생성 (풍부한 데이터)
  const insertEmotion = db.prepare(`
    INSERT INTO emotion_logs (worker_id, timestamp, emotion_type, intensity, context)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const emotionTypes = ['긍정적', '부정적', '중립적', '피로', '스트레스', '만족'];
  const contexts = [
    '일상 케어 활동',
    '환자 상태 확인',
    '식사 도움',
    '위생 관리',
    '운동 보조',
    '투약 관리',
    '가족 상담',
    '팀 회의',
    '응급 상황 대응',
    '환자와 대화',
    '기록 작성',
    '인수인계',
    '야간 근무',
    '주간 근무',
    '환자 이송',
    '물리치료 보조',
    '정서적 지원',
    '환자 관찰',
    '협력 업무',
    '교육 참여'
  ];
  
  const now = new Date();
  
  for (let workerId = 1; workerId <= 8; workerId++) {
    // 각 워커별로 지난 60일간 데이터 생성 (더 많은 데이터)
    for (let i = 0; i < 60; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // 하루에 2-4개 로그 생성 (랜덤)
      const logsPerDay = Math.floor(Math.random() * 3) + 2;
      
      for (let j = 0; j < logsPerDay; j++) {
        const logDate = new Date(date);
        logDate.setHours(8 + Math.floor(Math.random() * 12)); // 8시~20시
        logDate.setMinutes(Math.floor(Math.random() * 60));
        
        let emotionType, intensity;
        
        // 워커별 특성 부여
        if (workerId === 1 && i < 14) {
          // 김미영 - 고위험군 (최근 2주간 부정적)
          emotionType = Math.random() > 0.25 ? (Math.random() > 0.5 ? '부정적' : '스트레스') : '피로';
          intensity = 7 + Math.floor(Math.random() * 3);
        } else if (workerId === 4 && i < 21) {
          // 최민준 - 주의군 (최근 3주간 피로 누적)
          emotionType = Math.random() > 0.4 ? '피로' : (Math.random() > 0.5 ? '스트레스' : '중립적');
          intensity = 5 + Math.floor(Math.random() * 3);
        } else if (workerId === 8 && i < 10) {
          // 한민수 - 경미한 스트레스
          emotionType = Math.random() > 0.5 ? '스트레스' : (Math.random() > 0.6 ? '중립적' : '만족');
          intensity = 4 + Math.floor(Math.random() * 4);
        } else if (workerId === 2 || workerId === 3) {
          // 이정수, 박서연 - 안정적 (긍정적 비율 높음)
          emotionType = Math.random() > 0.3 ? (Math.random() > 0.5 ? '긍정적' : '만족') : '중립적';
          intensity = 3 + Math.floor(Math.random() * 5);
        } else {
          // 나머지 - 일반적 패턴
          const rand = Math.random();
          if (rand > 0.7) emotionType = '긍정적';
          else if (rand > 0.5) emotionType = '만족';
          else if (rand > 0.3) emotionType = '중립적';
          else if (rand > 0.15) emotionType = '피로';
          else if (rand > 0.05) emotionType = '스트레스';
          else emotionType = '부정적';
          
          intensity = 3 + Math.floor(Math.random() * 6);
        }
        
        const context = contexts[Math.floor(Math.random() * contexts.length)];
        
        insertEmotion.run(
          workerId,
          logDate.toISOString(),
          emotionType,
          intensity,
          `${context} - ${Math.floor(Math.random() * 15) + 1}번 대상자`
        );
      }
    }
  }
  
  console.log('✅ 감정 로그 샘플 데이터 생성 완료 (약 960+ 건)');
  
  // 리스크 알림 샘플 (더 많은 데이터)
  const insertAlert = db.prepare(`
    INSERT INTO risk_alerts (worker_id, alert_date, risk_score, risk_level, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const alertData = [
    // 최근 활성 알림
    [1, new Date(), 72, 'high', 'active'],
    [1, new Date(Date.now() - 86400000), 68, 'high', 'acknowledged'],
    [4, new Date(Date.now() - 86400000 * 2), 58, 'medium', 'active'],
    [8, new Date(Date.now() - 86400000 * 3), 45, 'medium', 'acknowledged'],
    
    // 해결된 알림
    [1, new Date(Date.now() - 86400000 * 7), 65, 'medium', 'resolved'],
    [4, new Date(Date.now() - 86400000 * 10), 52, 'medium', 'resolved'],
    [8, new Date(Date.now() - 86400000 * 14), 48, 'medium', 'resolved'],
    
    // 오래된 알림
    [1, new Date(Date.now() - 86400000 * 21), 55, 'medium', 'resolved'],
    [2, new Date(Date.now() - 86400000 * 28), 42, 'low', 'resolved'],
    [5, new Date(Date.now() - 86400000 * 35), 38, 'low', 'resolved']
  ];
  
  alertData.forEach(alert => insertAlert.run(alert));
  console.log('✅ 리스크 알림 샘플 데이터 생성 완료 (10건)');
  
  // 상담사 샘플 데이터
  const insertCounselor = db.prepare(`
    INSERT INTO counselors (name, license, specialty, phone, email, availability, current_load, max_capacity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const counselors = [
    ['박지은', '임상심리사 1급', '번아웃 증후군, 직무 스트레스', '010-1111-2222', 'park.counselor@goyo.kr', 'available', 2, 5],
    ['김민수', '정신건강임상심리사', '우울증, 불안장애', '010-2222-3333', 'kim.counselor@goyo.kr', 'available', 3, 5],
    ['이서연', '상담심리사 1급', '감정 조절, 대인관계', '010-3333-4444', 'lee.counselor@goyo.kr', 'available', 1, 4],
    ['최정훈', '임상심리사 2급', '트라우마, PTSD', '010-4444-5555', 'choi.counselor@goyo.kr', 'busy', 4, 4],
    ['한수진', '상담심리사 2급', '직장 적응, 커리어 상담', '010-5555-6666', 'han.counselor@goyo.kr', 'available', 1, 5]
  ];
  
  counselors.forEach(counselor => insertCounselor.run(counselor));
  console.log('✅ 상담사 샘플 데이터 생성 완료 (5명)');
  
  // 상담 세션 샘플 데이터
  const insertSession = db.prepare(`
    INSERT INTO counseling_sessions 
    (worker_id, counselor_id, session_date, session_type, priority, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const sessions = [
    [1, 1, new Date(Date.now() + 86400000).toISOString(), 'automatic', 'urgent', 'scheduled', '고위험군 자동 연계 - 즉시 상담 필요'],
    [4, 2, new Date(Date.now() + 86400000 * 2).toISOString(), 'automatic', 'high', 'scheduled', '피로 누적 감지 - 정기 상담'],
    [8, 3, new Date(Date.now() + 86400000 * 3).toISOString(), 'manual', 'normal', 'scheduled', '직장 적응 상담 요청'],
    [1, 1, new Date(Date.now() - 86400000 * 7).toISOString(), 'automatic', 'high', 'completed', '1차 상담 완료 - 스트레스 관리 기법 교육'],
    [2, 3, new Date(Date.now() - 86400000 * 14).toISOString(), 'manual', 'normal', 'completed', '정기 검진 - 안정적 상태 유지'],
    [4, 5, new Date(Date.now() - 86400000 * 21).toISOString(), 'automatic', 'high', 'completed', '번아웃 예방 프로그램 참여'],
    [1, 1, new Date(Date.now() - 86400000 * 28).toISOString(), 'manual', 'normal', 'cancelled', '본인 일정 충돌로 취소']
  ];
  
  sessions.forEach(session => insertSession.run(session));
  console.log('✅ 상담 세션 샘플 데이터 생성 완료 (7건)');
  
  // 상담 이력 샘플 데이터
  const insertHistory = db.prepare(`
    INSERT INTO counseling_history
    (session_id, counseling_date, outcome, follow_up_needed, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const histories = [
    [4, new Date(Date.now() - 86400000 * 7).toISOString(), 'improved', 1, '스트레스 관리 기법 교육. 호흡법, 명상 실천 권장. 2주 후 재상담 예정.'],
    [5, new Date(Date.now() - 86400000 * 14).toISOString(), 'stable', 0, '정기 검진 결과 양호. 긍정적 감정 유지 중. 특별한 조치 불필요.'],
    [6, new Date(Date.now() - 86400000 * 21).toISOString(), 'improved', 1, '번아웃 예방 프로그램 참여. 워크-라이프 밸런스 개선. 1개월 후 추적 관찰.']
  ];
  
  histories.forEach(history => insertHistory.run(history));
  console.log('✅ 상담 이력 샘플 데이터 생성 완료 (3건)');
  
  // 리포트 샘플 데이터
  const insertReport = db.prepare(`
    INSERT INTO reports (report_type, generated_date, title, summary)
    VALUES (?, ?, ?, ?)
  `);
  
  const reports = [
    ['weekly', new Date(Date.now() - 86400000 * 2).toISOString(), 
     '주간 감정 분석 리포트 (2026-02-10 ~ 2026-02-16)', 
     '전체 인력 8명 중 안정 5명(62.5%), 주의 2명(25%), 위험 1명(12.5%). 김미영님 고위험 상태로 즉시 개입 필요.'],
    ['monthly', new Date(Date.now() - 86400000 * 15).toISOString(), 
     '월간 종합 리포트 (2026년 1월)', 
     '전월 대비 스트레스 지수 15% 증가. A팀 부담 집중. 인력 재배치 및 추가 지원 검토 필요.'],
    ['quarterly', new Date(Date.now() - 86400000 * 45).toISOString(), 
     '분기 트렌드 분석 (2025년 4분기)', 
     '연말 업무 증가로 전반적 피로도 상승. 휴가 사용률 저조(38%). 복지 프로그램 강화 권장.'],
    ['risk', new Date(Date.now() - 86400000 * 7).toISOString(), 
     '고위험군 집중 분석', 
     '김미영님 리스크 점수 72점. 최근 2주간 부정적 감정 75%. 즉시 심리상담 연계 및 업무 조정 필요.']
  ];
  
  reports.forEach(report => insertReport.run(report));
  console.log('✅ 리포트 샘플 데이터 생성 완료 (4건)');
  
  console.log('\n🎉 모든 샘플 데이터 생성 완료!');
  console.log('📊 데이터 요약:');
  console.log('  - 케어 인력: 8명');
  console.log('  - 감정 로그: 960+ 건 (60일간, 하루 2-4회)');
  console.log('  - 리스크 알림: 10건');
  console.log('  - 상담사: 5명');
  console.log('  - 상담 세션: 7건');
  console.log('  - 상담 이력: 3건');
  console.log('  - 리포트: 4건');
}

// IPC 핸들러
ipcMain.handle('get-workers', () => {
  return db.prepare('SELECT * FROM care_workers WHERE status = "active"').all();
});

ipcMain.handle('get-worker-detail', (event, workerId) => {
  return db.prepare('SELECT * FROM care_workers WHERE id = ?').get(workerId);
});

ipcMain.handle('get-emotion-logs', (event, workerId, days = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return db.prepare(`
    SELECT * FROM emotion_logs 
    WHERE worker_id = ? AND timestamp >= ?
    ORDER BY timestamp DESC
  `).all(workerId, cutoffDate.toISOString());
});

ipcMain.handle('get-risk-alerts', (event, status = 'all') => {
  let query = `
    SELECT ra.*, cw.name, cw.role, cw.team
    FROM risk_alerts ra
    JOIN care_workers cw ON ra.worker_id = cw.id
  `;
  
  if (status !== 'all') {
    query += ` WHERE ra.status = ?`;
    return db.prepare(query).all(status);
  }
  
  return db.prepare(query).all();
});

ipcMain.handle('get-interventions', (event, alertId) => {
  return db.prepare(`
    SELECT * FROM interventions WHERE alert_id = ?
  `).all(alertId);
});

ipcMain.handle('update-intervention-status', (event, interventionId, status) => {
  const completedDate = status === 'completed' ? new Date().toISOString() : null;
  return db.prepare(`
    UPDATE interventions 
    SET status = ?, completed_date = ?
    WHERE id = ?
  `).run(status, completedDate, interventionId);
});

ipcMain.handle('get-dashboard-stats', () => {
  const totalWorkers = db.prepare('SELECT COUNT(*) as count FROM care_workers WHERE status = "active"').get();
  const normalWorkers = db.prepare('SELECT COUNT(*) as count FROM care_workers WHERE status = "active" AND risk_status = "normal"').get();
  const warningWorkers = db.prepare('SELECT COUNT(*) as count FROM care_workers WHERE status = "active" AND risk_status = "warning"').get();
  const dangerWorkers = db.prepare('SELECT COUNT(*) as count FROM care_workers WHERE status = "active" AND risk_status = "danger"').get();
  const highRiskAlerts = db.prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE risk_level = "high" AND status = "pending"').get();
  
  const recentEmotions = db.prepare(`
    SELECT emotion_type, COUNT(*) as count
    FROM emotion_logs
    WHERE timestamp >= datetime('now', '-7 days')
    GROUP BY emotion_type
  `).all();
  
  return {
    totalWorkers: totalWorkers.count,
    normalWorkers: normalWorkers.count,
    warningWorkers: warningWorkers.count,
    dangerWorkers: dangerWorkers.count,
    highRiskAlerts: highRiskAlerts.count,
    recentEmotions
  };
});

// CRUD 핸들러
ipcMain.handle('add-worker', (event, worker) => {
  const stmt = db.prepare(`
    INSERT INTO care_workers (name, role, team, hire_date, phone, email, risk_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(worker.name, worker.role, worker.team, worker.hire_date, worker.phone, worker.email, 'normal');
});

ipcMain.handle('update-worker', (event, id, worker) => {
  const stmt = db.prepare(`
    UPDATE care_workers 
    SET name = ?, role = ?, team = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(worker.name, worker.role, worker.team, worker.phone, worker.email, id);
});

ipcMain.handle('delete-worker', (event, id) => {
  const stmt = db.prepare('UPDATE care_workers SET status = "inactive" WHERE id = ?');
  return stmt.run(id);
});

ipcMain.handle('search-workers', (event, query) => {
  const stmt = db.prepare(`
    SELECT * FROM care_workers 
    WHERE status = "active" 
    AND (name LIKE ? OR role LIKE ? OR team LIKE ?)
  `);
  const searchTerm = `%${query}%`;
  return stmt.all(searchTerm, searchTerm, searchTerm);
});

ipcMain.handle('filter-workers', (event, filters) => {
  let query = 'SELECT * FROM care_workers WHERE status = "active"';
  const params = [];
  
  if (filters.team && filters.team !== 'all') {
    query += ' AND team = ?';
    params.push(filters.team);
  }
  
  if (filters.risk_status && filters.risk_status !== 'all') {
    query += ' AND risk_status = ?';
    params.push(filters.risk_status);
  }
  
  return db.prepare(query).all(...params);
});

// 알림 관리
ipcMain.handle('acknowledge-alert', (event, alertId) => {
  const stmt = db.prepare('UPDATE risk_alerts SET acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?');
  return stmt.run(alertId);
});

ipcMain.handle('resolve-alert', (event, alertId, notes) => {
  const stmt = db.prepare('UPDATE risk_alerts SET status = "resolved", resolved_at = CURRENT_TIMESTAMP, notes = ? WHERE id = ?');
  return stmt.run(notes, alertId);
});

ipcMain.handle('get-alert-stats', () => {
  const critical = db.prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE risk_level = "high" AND status = "pending"').get();
  const high = db.prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE risk_level = "medium" AND status = "pending"').get();
  const medium = db.prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE risk_level = "low" AND status = "pending"').get();
  const resolved = db.prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE status = "resolved"').get();
  
  return {
    critical: critical.count,
    high: high.count,
    medium: medium.count,
    resolved: resolved.count
  };
});

// 분석 데이터
ipcMain.handle('get-analytics-data', () => {
  // 부서별 감정 상태
  const teamEmotions = db.prepare(`
    SELECT cw.team, el.emotion_type, COUNT(*) as count
    FROM care_workers cw
    JOIN emotion_logs el ON cw.id = el.worker_id
    WHERE el.timestamp >= datetime('now', '-7 days')
    GROUP BY cw.team, el.emotion_type
  `).all();
  
  // 월별 번아웃 추이
  const monthlyBurnout = db.prepare(`
    SELECT strftime('%Y-%m', alert_date) as month, COUNT(*) as count, AVG(risk_score) as avg_score
    FROM risk_alerts
    WHERE alert_date >= datetime('now', '-6 months')
    GROUP BY month
    ORDER BY month
  `).all();
  
  return {
    teamEmotions,
    monthlyBurnout
  };
});

// 리포트 생성
ipcMain.handle('generate-report', (event, reportType, periodStart, periodEnd) => {
  const reportData = {
    workers: db.prepare('SELECT COUNT(*) as count FROM care_workers WHERE status = "active"').get(),
    alerts: db.prepare(`
      SELECT COUNT(*) as count, AVG(risk_score) as avg_score
      FROM risk_alerts 
      WHERE alert_date BETWEEN ? AND ?
    `).get(periodStart, periodEnd),
    emotions: db.prepare(`
      SELECT emotion_type, COUNT(*) as count
      FROM emotion_logs
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY emotion_type
    `).all(periodStart, periodEnd)
  };
  
  const summary = `기간: ${periodStart} ~ ${periodEnd}\n활성 인력: ${reportData.workers.count}명\n알림 발생: ${reportData.alerts.count}건\n평균 리스크: ${Math.round(reportData.alerts.avg_score || 0)}%`;
  
  const stmt = db.prepare(`
    INSERT INTO reports (report_type, report_name, period_start, period_end, data, summary)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const reportName = `${reportType} 리포트 - ${new Date().toLocaleDateString('ko-KR')}`;
  
  return stmt.run(reportType, reportName, periodStart, periodEnd, JSON.stringify(reportData), summary);
});

ipcMain.handle('get-reports', () => {
  return db.prepare('SELECT * FROM reports ORDER BY generated_at DESC LIMIT 10').all();
});

app.whenReady().then(() => {
  initDatabase();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.close();
    app.quit();
  }
});

// 심리상담 연계 시스템 테이블 추가
function initCounselingTables() {
  // 상담사 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS counselors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialization TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      license_number TEXT,
      availability_status TEXT DEFAULT 'available',
      current_load INTEGER DEFAULT 0,
      max_capacity INTEGER DEFAULT 8,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 상담 세션 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS counseling_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      counselor_id INTEGER,
      session_type TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      priority TEXT DEFAULT 'medium',
      scheduled_date TEXT NOT NULL,
      completed_date TEXT,
      duration INTEGER DEFAULT 60,
      session_notes TEXT,
      auto_linked BOOLEAN DEFAULT 0,
      alert_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES care_workers(id),
      FOREIGN KEY (counselor_id) REFERENCES counselors(id),
      FOREIGN KEY (alert_id) REFERENCES risk_alerts(id)
    )
  `);
  
  // 상담 이력 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS counseling_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      session_date TEXT NOT NULL,
      counselor_id INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      result TEXT,
      follow_up_needed BOOLEAN DEFAULT 0,
      follow_up_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES counseling_sessions(id),
      FOREIGN KEY (counselor_id) REFERENCES counselors(id),
      FOREIGN KEY (worker_id) REFERENCES care_workers(id)
    )
  `);
  
  // 샘플 상담사 데이터
  const counselorCount = db.prepare('SELECT COUNT(*) as count FROM counselors').get();
  if (counselorCount.count === 0) {
    insertCounselorSampleData();
  }
}

function insertCounselorSampleData() {
  const insertCounselor = db.prepare(`
    INSERT INTO counselors (name, specialization, phone, email, license_number, availability_status, current_load, max_capacity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const counselors = [
    ['박지은', '번아웃 전문', '010-1111-2222', 'park@counsel.kr', 'PSY-2020-1234', 'available', 3, 8],
    ['김태수', '스트레스 관리', '010-2222-3333', 'kim@counsel.kr', 'PSY-2019-5678', 'available', 5, 8],
    ['이민지', '직장 내 관계', '010-3333-4444', 'lee@counsel.kr', 'PSY-2021-9012', 'available', 2, 8],
    ['정수현', '감정 코칭', '010-4444-5555', 'jung@counsel.kr', 'PSY-2018-3456', 'busy', 7, 8],
    ['최현우', '위기 개입', '010-5555-6666', 'choi@counsel.kr', 'PSY-2020-7890', 'available', 4, 8]
  ];
  
  counselors.forEach(counselor => insertCounselor.run(counselor));
  
  // 샘플 상담 세션 생성
  const insertSession = db.prepare(`
    INSERT INTO counseling_sessions (worker_id, counselor_id, session_type, status, priority, scheduled_date, auto_linked, alert_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date();
  
  // 김미영 - 자동 연계 세션 (고위험)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  insertSession.run(1, 1, '긴급 개입', 'scheduled', 'high', tomorrow.toISOString(), 1, 1);
  
  // 최민준 - 예약 세션
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  insertSession.run(4, 2, '스트레스 관리', 'scheduled', 'medium', nextWeek.toISOString(), 0, 2);
  
  // 이정수 - 완료된 세션
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const completedSession = db.prepare(`
    INSERT INTO counseling_sessions (worker_id, counselor_id, session_type, status, priority, scheduled_date, completed_date, session_notes, auto_linked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  completedSession.run(2, 3, '정기 상담', 'completed', 'low', lastWeek.toISOString(), now.toISOString(), '상태 양호, 스트레스 관리 잘 하고 있음', 0);
  
  // 상담 이력 추가
  const insertHistory = db.prepare(`
    INSERT INTO counseling_history (session_id, session_date, counselor_id, worker_id, result, follow_up_needed, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertHistory.run(3, now.toISOString(), 3, 2, '긍정적', 0, '월 1회 정기 상담으로 충분');
}

// 상담 연계 IPC 핸들러
ipcMain.handle('get-counseling-stats', () => {
  const scheduled = db.prepare('SELECT COUNT(*) as count FROM counseling_sessions WHERE status = "scheduled"').get();
  const activeCounselors = db.prepare('SELECT COUNT(*) as count FROM counselors WHERE availability_status = "available"').get();
  const completed = db.prepare('SELECT COUNT(*) as count FROM counseling_sessions WHERE status = "completed"').get();
  const autoLinked = db.prepare('SELECT COUNT(*) as count FROM counseling_sessions WHERE auto_linked = 1').get();
  
  return {
    scheduled: scheduled.count,
    activeCounselors: activeCounselors.count,
    completed: completed.count,
    autoLinked: autoLinked.count
  };
});

ipcMain.handle('get-counseling-sessions', (event, filters = {}) => {
  let query = `
    SELECT cs.*, cw.name as worker_name, cw.role as worker_role, 
           co.name as counselor_name, co.specialization
    FROM counseling_sessions cs
    LEFT JOIN care_workers cw ON cs.worker_id = cw.id
    LEFT JOIN counselors co ON cs.counselor_id = co.id
    WHERE 1=1
  `;
  const params = [];
  
  if (filters.status && filters.status !== 'all') {
    query += ' AND cs.status = ?';
    params.push(filters.status);
  }
  
  if (filters.session_type && filters.session_type !== 'all') {
    query += ' AND cs.session_type = ?';
    params.push(filters.session_type);
  }
  
  query += ' ORDER BY cs.scheduled_date DESC';
  
  return db.prepare(query).all(...params);
});

ipcMain.handle('get-counselors', () => {
  return db.prepare('SELECT * FROM counselors ORDER BY name').all();
});

ipcMain.handle('add-counselor', (event, counselor) => {
  const stmt = db.prepare(`
    INSERT INTO counselors (name, specialization, phone, email, license_number, max_capacity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    counselor.name,
    counselor.specialization,
    counselor.phone,
    counselor.email,
    counselor.license_number,
    counselor.max_capacity || 8
  );
});

ipcMain.handle('update-counselor', (event, id, counselor) => {
  const stmt = db.prepare(`
    UPDATE counselors
    SET name = ?, specialization = ?, phone = ?, email = ?, license_number = ?
    WHERE id = ?
  `);
  return stmt.run(
    counselor.name,
    counselor.specialization,
    counselor.phone,
    counselor.email,
    counselor.license_number,
    id
  );
});

ipcMain.handle('create-counseling-session', (event, session) => {
  const stmt = db.prepare(`
    INSERT INTO counseling_sessions (worker_id, counselor_id, session_type, priority, scheduled_date, auto_linked, alert_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  // 상담사 current_load 증가
  if (session.counselor_id) {
    db.prepare('UPDATE counselors SET current_load = current_load + 1 WHERE id = ?').run(session.counselor_id);
  }
  
  return stmt.run(
    session.worker_id,
    session.counselor_id,
    session.session_type,
    session.priority,
    session.scheduled_date,
    session.auto_linked || 0,
    session.alert_id || null
  );
});

ipcMain.handle('auto-link-counseling', (event, workerId, alertId) => {
  // 가용한 상담사 찾기 (번아웃 전문 우선)
  const counselor = db.prepare(`
    SELECT * FROM counselors 
    WHERE availability_status = 'available' 
    AND current_load < max_capacity
    ORDER BY 
      CASE WHEN specialization LIKE '%번아웃%' THEN 1 ELSE 2 END,
      current_load ASC
    LIMIT 1
  `).get();
  
  if (!counselor) {
    throw new Error('가용한 상담사가 없습니다');
  }
  
  // 내일 날짜로 긴급 상담 세션 생성
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  const stmt = db.prepare(`
    INSERT INTO counseling_sessions (worker_id, counselor_id, session_type, status, priority, scheduled_date, auto_linked, alert_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    workerId,
    counselor.id,
    '긴급 개입',
    'scheduled',
    'high',
    tomorrow.toISOString(),
    1,
    alertId
  );
  
  // 상담사 load 증가
  db.prepare('UPDATE counselors SET current_load = current_load + 1 WHERE id = ?').run(counselor.id);
  
  return {
    sessionId: result.lastInsertRowid,
    counselor: counselor,
    scheduledDate: tomorrow
  };
});

ipcMain.handle('update-session-status', (event, sessionId, status, notes) => {
  const completedDate = status === 'completed' ? new Date().toISOString() : null;
  
  const stmt = db.prepare(`
    UPDATE counseling_sessions
    SET status = ?, completed_date = ?, session_notes = ?
    WHERE id = ?
  `);
  
  const result = stmt.run(status, completedDate, notes, sessionId);
  
  // 완료 시 상담사 load 감소
  if (status === 'completed') {
    const session = db.prepare('SELECT counselor_id FROM counseling_sessions WHERE id = ?').get(sessionId);
    if (session && session.counselor_id) {
      db.prepare('UPDATE counselors SET current_load = current_load - 1 WHERE id = ?').run(session.counselor_id);
    }
  }
  
  return result;
});

ipcMain.handle('get-counseling-history', (event, workerId) => {
  return db.prepare(`
    SELECT ch.*, co.name as counselor_name, co.specialization,
           cs.session_type
    FROM counseling_history ch
    LEFT JOIN counselors co ON ch.counselor_id = co.id
    LEFT JOIN counseling_sessions cs ON ch.session_id = cs.id
    WHERE ch.worker_id = ?
    ORDER BY ch.session_date DESC
  `).all(workerId);
});

ipcMain.handle('add-counseling-history', (event, history) => {
  const stmt = db.prepare(`
    INSERT INTO counseling_history (session_id, session_date, counselor_id, worker_id, result, follow_up_needed, follow_up_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    history.session_id,
    history.session_date,
    history.counselor_id,
    history.worker_id,
    history.result,
    history.follow_up_needed ? 1 : 0,
    history.follow_up_date || null,
    history.notes
  );
});


// ==================== 감정 로그 추가 ====================
ipcMain.handle('add-emotion-log', async (event, data) => {
  const { worker_id, emotion_type, intensity, notes, logged_at } = data;
  
  const date = logged_at || new Date().toISOString().split('T')[0];
  
  const stmt = db.prepare(`
    INSERT INTO emotion_logs (worker_id, emotion_type, intensity, notes, logged_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(worker_id, emotion_type, intensity, notes, date);
  
  // 워커의 리스크 상태 재계산
  await updateWorkerRiskStatus(worker_id);
  
  return { success: true };
});

// ==================== 최근 감정 로그 조회 ====================
ipcMain.handle('get-recent-emotion-logs', async (event, options = {}) => {
  const limit = options.limit || 20;
  
  const logs = db.prepare(`
    SELECT 
      el.*,
      cw.name as worker_name,
      cw.role as worker_role,
      cw.team as worker_team
    FROM emotion_logs el
    LEFT JOIN care_workers cw ON el.worker_id = cw.id
    ORDER BY el.logged_at DESC, el.created_at DESC
    LIMIT ?
  `).all(limit);
  
  return logs;
});

// ==================== 워커 리스크 상태 업데이트 ====================
async function updateWorkerRiskStatus(workerId) {
  // 최근 7일간의 감정 로그 분석
  const recentLogs = db.prepare(`
    SELECT emotion_type, intensity
    FROM emotion_logs
    WHERE worker_id = ? AND logged_at >= date('now', '-7 days')
    ORDER BY logged_at DESC
  `).all(workerId);
  
  if (recentLogs.length === 0) return;
  
  // 부정적 감정 비율 계산
  const negativeEmotions = ['피로', '스트레스', '부정적'];
  const negativeCount = recentLogs.filter(log => 
    negativeEmotions.includes(log.emotion_type)
  ).length;
  
  const negativeRatio = negativeCount / recentLogs.length;
  
  // 평균 강도 계산
  const avgIntensity = recentLogs.reduce((sum, log) => sum + log.intensity, 0) / recentLogs.length;
  
  // 리스크 레벨 결정
  let riskStatus = 'normal';
  if (negativeRatio > 0.6 || avgIntensity > 7) {
    riskStatus = 'danger';
  } else if (negativeRatio > 0.4 || avgIntensity > 5.5) {
    riskStatus = 'warning';
  }
  
  // 워커 상태 업데이트
  db.prepare(`
    UPDATE care_workers
    SET risk_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(riskStatus, workerId);
  
  // 고위험인 경우 알림 생성 (중복 체크)
  if (riskStatus === 'danger') {
    const existingAlert = db.prepare(`
      SELECT id FROM risk_alerts
      WHERE worker_id = ? AND status = 'pending'
    `).get(workerId);
    
    if (!existingAlert) {
      const worker = db.prepare('SELECT * FROM care_workers WHERE id = ?').get(workerId);
      db.prepare(`
        INSERT INTO risk_alerts (worker_id, risk_level, description, status)
        VALUES (?, ?, ?, ?)
      `).run(
        workerId,
        'high',
        `${worker.name}님의 최근 7일간 부정 감정 비율이 ${Math.round(negativeRatio * 100)}%로 높습니다.`,
        'pending'
      );
    }
  }
}

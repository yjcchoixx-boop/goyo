const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

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
      status TEXT DEFAULT 'active'
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
      status TEXT DEFAULT 'pending',
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
  
  // 샘플 데이터 삽입
  const workerCount = db.prepare('SELECT COUNT(*) as count FROM care_workers').get();
  if (workerCount.count === 0) {
    insertSampleData();
  }
}

function insertSampleData() {
  const insertWorker = db.prepare(`
    INSERT INTO care_workers (name, role, team, hire_date) 
    VALUES (?, ?, ?, ?)
  `);
  
  const workers = [
    ['김미영', '요양보호사', 'A팀', '2022-03-15'],
    ['이정수', '간호사', 'A팀', '2021-08-20'],
    ['박서연', '요양보호사', 'B팀', '2023-01-10'],
    ['최민준', '사회복지사', 'B팀', '2020-11-05'],
    ['정수진', '요양보호사', 'C팀', '2022-07-18']
  ];
  
  workers.forEach(worker => insertWorker.run(worker));
  
  // 감정 로그 샘플 데이터 생성
  const insertEmotion = db.prepare(`
    INSERT INTO emotion_logs (worker_id, timestamp, emotion_type, intensity, context)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const emotionTypes = ['긍정적', '부정적', '중립적', '피로', '스트레스', '만족'];
  const now = new Date();
  
  for (let workerId = 1; workerId <= 5; workerId++) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      let emotionType, intensity;
      
      // 워커 1번은 고위험군 (부정적 감정 증가)
      if (workerId === 1 && i < 14) {
        emotionType = Math.random() > 0.3 ? '부정적' : '스트레스';
        intensity = 0.6 + Math.random() * 0.4;
      } else {
        emotionType = emotionTypes[Math.floor(Math.random() * emotionTypes.length)];
        intensity = Math.random();
      }
      
      insertEmotion.run(
        workerId,
        date.toISOString(),
        emotionType,
        intensity,
        `일상 케어 활동 - ${Math.floor(Math.random() * 10) + 1}번 환자`
      );
    }
  }
  
  // 리스크 알림 샘플
  const insertAlert = db.prepare(`
    INSERT INTO risk_alerts (worker_id, alert_date, risk_score, risk_level)
    VALUES (?, ?, ?, ?)
  `);
  
  insertAlert.run(1, new Date().toISOString(), 72, 'high');
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
  const highRiskAlerts = db.prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE risk_level = "high" AND status = "pending"').get();
  
  const recentEmotions = db.prepare(`
    SELECT emotion_type, COUNT(*) as count
    FROM emotion_logs
    WHERE timestamp >= datetime('now', '-7 days')
    GROUP BY emotion_type
  `).all();
  
  return {
    totalWorkers: totalWorkers.count,
    highRiskAlerts: highRiskAlerts.count,
    recentEmotions
  };
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

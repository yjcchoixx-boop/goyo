const { ipcRenderer } = require('electron');

// 전역 변수
let currentView = 'dashboard';
let workers = [];
let alerts = [];

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  await loadDashboard();
  setupModalHandlers();
});

// 네비게이션 설정
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
      
      // 활성 상태 업데이트
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// 뷰 전환
async function switchView(view) {
  currentView = view;
  
  // 모든 뷰 숨기기
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  
  // 선택한 뷰 표시
  const viewElement = document.getElementById(`${view}-view`);
  if (viewElement) {
    viewElement.classList.add('active');
  }
  
  // 각 뷰별 데이터 로드
  switch(view) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'alerts':
      await loadAlerts();
      break;
    case 'workers':
      await loadWorkersList();
      break;
    case 'analytics':
      await loadAnalytics();
      break;
    case 'reports':
      await loadReports();
      break;
    case 'counseling':
      await loadCounselingView();
      break;
    case 'preview':
      loadPreviewView();
      break;
    case 'data-collection':
      await loadDataCollectionView();
      break;
  }
}

// 대시보드 로드
async function loadDashboard() {
  try {
    // 통계 데이터 가져오기
    const stats = await ipcRenderer.invoke('get-dashboard-stats');
    workers = await ipcRenderer.invoke('get-workers');
    alerts = await ipcRenderer.invoke('get-risk-alerts', 'pending');
    
    // 상담 통계 가져오기
    try {
      const counselingStats = await ipcRenderer.invoke('get-counseling-stats');
      document.getElementById('dashboard-scheduled-sessions').textContent = counselingStats.scheduled_sessions;
    } catch (e) {
      document.getElementById('dashboard-scheduled-sessions').textContent = '0';
    }
    
    // 통계 업데이트
    document.getElementById('total-workers').textContent = stats.totalWorkers;
    document.getElementById('normal-workers').textContent = stats.normalWorkers || 0;
    document.getElementById('warning-workers').textContent = stats.warningWorkers || 0;
    document.getElementById('danger-workers').textContent = stats.dangerWorkers || 0;
    document.getElementById('alert-badge').textContent = stats.highRiskAlerts;
    
    // 평균 감정 점수 계산
    const avgScore = calculateAverageEmotionScore(stats.recentEmotions);
    document.getElementById('avg-emotion-score').textContent = avgScore + '%';
    
    // 긍정적 트렌드 계산
    const positiveCount = stats.recentEmotions.find(e => e.emotion_type === '긍정적')?.count || 0;
    const totalCount = stats.recentEmotions.reduce((sum, e) => sum + e.count, 0);
    const positivePercent = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0;
    document.getElementById('positive-trend').textContent = positivePercent + '%';
    
    // 차트 그리기
    drawEmotionDistributionChart(stats.recentEmotions);
    await drawEmotionTrendChart();
    
    // 워커 목록 표시
    displayWorkersList(workers);
  } catch (error) {
    console.error('대시보드 로드 실패:', error);
  }
}

// 평균 감정 점수 계산
function calculateAverageEmotionScore(emotions) {
  if (!emotions || emotions.length === 0) return 0;
  
  const weights = {
    '긍정적': 1,
    '만족': 0.8,
    '중립적': 0.5,
    '피로': 0.3,
    '스트레스': 0.2,
    '부정적': 0.1
  };
  
  let totalWeight = 0;
  let totalCount = 0;
  
  emotions.forEach(e => {
    const weight = weights[e.emotion_type] || 0.5;
    totalWeight += weight * e.count;
    totalCount += e.count;
  });
  
  return totalCount > 0 ? Math.round((totalWeight / totalCount) * 100) : 0;
}

// 감정 분포 차트
function drawEmotionDistributionChart(emotions) {
  const ctx = document.getElementById('emotion-distribution-chart');
  if (!ctx) return;
  
  const labels = emotions.map(e => e.emotion_type);
  const data = emotions.map(e => e.count);
  
  const emotionColors = {
    '긍정적': '#4ade80',
    '만족': '#60a5fa',
    '중립적': '#94a3b8',
    '피로': '#fbbf24',
    '스트레스': '#fb923c',
    '부정적': '#ef4444'
  };
  
  const colors = labels.map(label => emotionColors[label] || '#667eea');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e8eaed',
            padding: 15,
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

// 번아웃 위험도 추이 차트
async function drawEmotionTrendChart() {
  const ctx = document.getElementById('burnout-trend-chart');
  if (!ctx) return;
  
  // 워커 1번(고위험군)의 최근 14일 데이터
  const emotionLogs = await ipcRenderer.invoke('get-emotion-logs', 1, 14);
  
  // 날짜별 부정적 감정 비율 계산
  const dailyData = {};
  
  emotionLogs.forEach(log => {
    const date = new Date(log.timestamp).toLocaleDateString('ko-KR');
    if (!dailyData[date]) {
      dailyData[date] = { positive: 0, negative: 0 };
    }
    
    if (log.emotion_type === '부정적' || log.emotion_type === '스트레스') {
      dailyData[date].negative++;
    } else if (log.emotion_type === '긍정적' || log.emotion_type === '만족') {
      dailyData[date].positive++;
    }
  });
  
  // 날짜순 정렬
  const sortedDates = Object.keys(dailyData).sort((a, b) => {
    return new Date(a) - new Date(b);
  });
  
  const negativePercentages = sortedDates.map(date => {
    const total = dailyData[date].positive + dailyData[date].negative;
    return total > 0 ? (dailyData[date].negative / total) * 100 : 0;
  });
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: '부정적 감정 비율 (%)',
        data: negativePercentages,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '#e8eaed',
            font: {
              size: 12
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: '#8e9aaf',
            callback: function(value) {
              return value + '%';
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#8e9aaf'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  });
}

// 워커 목록 표시
function displayWorkersList(workers) {
  const container = document.getElementById('workers-list');
  if (!container) return;
  
  container.innerHTML = workers.map(worker => {
    const riskLevel = worker.id === 1 ? 'danger' : 'normal';
    const statusText = worker.id === 1 ? '고위험' : '정상';
    
    return `
      <div class="worker-card" onclick="showWorkerDetail(${worker.id})">
        <div class="worker-header">
          <div class="worker-name">${worker.name}</div>
          <div class="worker-status ${riskLevel}">${statusText}</div>
        </div>
        <div class="worker-info">${worker.role} | ${worker.team}</div>
        <div class="worker-info">입사일: ${formatDate(worker.hire_date)}</div>
        ${worker.id === 1 ? '<div class="worker-emotion">⚠️ 최근 2주간 부정적 감정 85% 증가</div>' : ''}
      </div>
    `;
  }).join('');
}

// 알림 로드
async function loadAlerts() {
  try {
    // 알림 통계 로드
    const alertStats = await ipcRenderer.invoke('get-alert-stats');
    document.getElementById('critical-alerts').textContent = alertStats.critical;
    document.getElementById('high-alerts').textContent = alertStats.high;
    document.getElementById('medium-alerts').textContent = alertStats.medium;
    document.getElementById('resolved-alerts').textContent = alertStats.resolved;
    
    alerts = await ipcRenderer.invoke('get-risk-alerts', 'pending');
    displayAlertsWithActions(alerts);
    alerts = await ipcRenderer.invoke('get-risk-alerts', 'pending');
    displayAlertsWithActions(alerts);
  } catch (error) {
    console.error('알림 로드 실패:', error);
  }
}

// 개입 방안 표시
async function showInterventions(alertId, workerName) {
  const modal = document.getElementById('intervention-modal');
  const content = document.getElementById('intervention-content');
  
  // 9페이지의 개입 방안 내용
  const interventions = [
    {
      type: 'immediate',
      title: '즉시 실행 (24시간 이내)',
      description: `관리자와 1:1 면담 일정 잡기. ${workerName}님의 최근 업무 부담과 감정 상태에 대해 비공식적으로 대화하세요.`,
      deadline: '24시간 이내'
    },
    {
      type: 'short-term',
      title: '단기 조치 (1주일 이내)',
      description: '업무량 재조정. 특히 감정적으로 부담이 큰 케이스를 일시적으로 다른 팀원과 분담하세요.',
      deadline: '1주일 이내'
    },
    {
      type: 'medium-term',
      title: '중기 지원 (2-4주)',
      description: '전문 상담 서비스 연결. 필요시 외부 EAP(Employee Assistance Program) 프로그램 안내.',
      deadline: '2-4주'
    },
    {
      type: 'monitoring',
      title: '지속 모니터링',
      description: '향후 2주간 감정 패턴 추적. 개선 여부를 데이터로 확인하고 추가 개입 필요성 판단.',
      deadline: '진행 중'
    }
  ];
  
  content.innerHTML = `
    <div style="margin-bottom: 24px;">
      <p style="font-size: 16px; line-height: 1.6; color: #b4bcc8; margin-bottom: 16px;">
        리스크를 감지하는 것만으로는 충분하지 않습니다. GOYO는 무엇을 해야 하는지 구체적으로 제안합니다.
      </p>
    </div>
    
    ${interventions.map((intervention, index) => `
      <div class="intervention-section">
        <div class="intervention-header">
          <div class="intervention-number">${index + 1}</div>
          <div>
            <div class="intervention-title">${intervention.title}</div>
            <div style="font-size: 12px; color: #8e9aaf;">기한: ${intervention.deadline}</div>
          </div>
        </div>
        <div class="intervention-description">
          ${intervention.description}
        </div>
        <div class="intervention-actions">
          <button class="btn btn-primary" onclick="completeIntervention(${index})">
            ✓ 완료 처리
          </button>
          <button class="btn btn-secondary" onclick="scheduleIntervention(${index})">
            📅 일정 등록
          </button>
        </div>
      </div>
    `).join('')}
    
    <div style="margin-top: 32px; padding: 20px; background: rgba(102, 126, 234, 0.1); border-radius: 12px; text-align: center;">
      <div style="font-size: 18px; font-weight: 600; color: #667eea; margin-bottom: 8px;">
        "감정 리스크를 줄이는 것은 곧 운영 비용을 줄이는 것입니다."
      </div>
      <div style="font-size: 14px; color: #8e9aaf;">
        이것이 GOYO의 핵심 가치입니다. 위기가 되기 전에 감지하고, 데이터로 증명하며, 행동을 촉구합니다.
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

// 워커 상세 정보
async function showWorkerDetail(workerId) {
  // 워커 뷰로 전환
  await switchView('workers');
  
  const worker = await ipcRenderer.invoke('get-worker-detail', workerId);
  const emotionLogs = await ipcRenderer.invoke('get-emotion-logs', workerId, 30);
  
  const container = document.getElementById('workers-detail-container');
  
  container.innerHTML = `
    <div class="section-card">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 28px; margin-bottom: 8px;">${worker.name}</h2>
          <div style="color: #8e9aaf; font-size: 14px;">
            ${worker.role} | ${worker.team} | 입사일: ${formatDate(worker.hire_date)}
          </div>
        </div>
        <div class="worker-status ${workerId === 1 ? 'danger' : 'normal'}">
          ${workerId === 1 ? '고위험' : '정상'}
        </div>
      </div>
      
      <div style="margin-top: 24px;">
        <h3 style="margin-bottom: 16px;">최근 30일 감정 이력</h3>
        <div style="background: rgba(102, 126, 234, 0.05); border-radius: 12px; padding: 20px;">
          <canvas id="worker-emotion-chart"></canvas>
        </div>
      </div>
      
      <div style="margin-top: 24px;">
        <h3 style="margin-bottom: 16px;">감정 로그</h3>
        <div style="max-height: 400px; overflow-y: auto;">
          ${emotionLogs.slice(0, 10).map(log => `
            <div style="padding: 16px; background: rgba(102, 126, 234, 0.05); border-radius: 8px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: 600;">${log.emotion_type}</span>
                <span style="color: #8e9aaf; font-size: 12px;">${formatDateTime(log.timestamp)}</span>
              </div>
              <div style="color: #8e9aaf; font-size: 14px;">${log.context}</div>
              <div style="margin-top: 8px;">
                <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${log.intensity * 100}%; background: ${getEmotionColor(log.emotion_type)};"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  // 워커별 감정 차트 그리기
  drawWorkerEmotionChart(emotionLogs);
}

// 워커 감정 차트
function drawWorkerEmotionChart(logs) {
  const ctx = document.getElementById('worker-emotion-chart');
  if (!ctx) return;
  
  // 날짜별 감정 타입 집계
  const dailyEmotions = {};
  
  logs.forEach(log => {
    const date = new Date(log.timestamp).toLocaleDateString('ko-KR');
    if (!dailyEmotions[date]) {
      dailyEmotions[date] = {};
    }
    dailyEmotions[date][log.emotion_type] = (dailyEmotions[date][log.emotion_type] || 0) + 1;
  });
  
  const dates = Object.keys(dailyEmotions).sort((a, b) => new Date(a) - new Date(b));
  const emotionTypes = ['긍정적', '부정적', '스트레스', '피로'];
  
  const datasets = emotionTypes.map(type => ({
    label: type,
    data: dates.map(date => dailyEmotions[date][type] || 0),
    backgroundColor: getEmotionColor(type),
    borderColor: getEmotionColor(type),
    tension: 0.4
  }));
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '#e8eaed'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#8e9aaf'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#8e9aaf'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  });
}

// 워커 로드
async function loadWorkers() {
  const workers = await ipcRenderer.invoke('get-workers');
  const container = document.getElementById('workers-detail-container');
  
  container.innerHTML = `
    <div class="workers-grid">
      ${workers.map(worker => {
        const riskLevel = worker.id === 1 ? 'danger' : 'normal';
        const statusText = worker.id === 1 ? '고위험' : '정상';
        
        return `
          <div class="worker-card" onclick="showWorkerDetail(${worker.id})">
            <div class="worker-header">
              <div class="worker-name">${worker.name}</div>
              <div class="worker-status ${riskLevel}">${statusText}</div>
            </div>
            <div class="worker-info">${worker.role} | ${worker.team}</div>
            <div class="worker-info">입사일: ${formatDate(worker.hire_date)}</div>
            ${worker.id === 1 ? '<div class="worker-emotion">⚠️ 최근 2주간 부정적 감정 85% 증가</div>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 모달 핸들러 설정
function setupModalHandlers() {
  const modal = document.getElementById('intervention-modal');
  const closeBtn = document.querySelector('.modal-close');
  
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}

// 개입 완료 처리
function completeIntervention(index) {
  alert(`개입 조치 ${index + 1}번이 완료 처리되었습니다.`);
}

// 개입 일정 등록
function scheduleIntervention(index) {
  alert(`개입 조치 ${index + 1}번의 일정이 등록되었습니다.`);
}

// 유틸리티 함수
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR');
}

function getEmotionColor(emotionType) {
  const colors = {
    '긍정적': '#4ade80',
    '만족': '#60a5fa',
    '중립적': '#94a3b8',
    '피로': '#fbbf24',
    '스트레스': '#fb923c',
    '부정적': '#ef4444'
  };
  return colors[emotionType] || '#667eea';
}

// ============ 새로운 기능들 ============

// 워커 모달 관련
let editingWorkerId = null;

function openWorkerModal(workerId = null) {
  const modal = document.getElementById('worker-modal');
  const form = document.getElementById('worker-form');
  const title = document.getElementById('worker-modal-title');
  
  if (workerId) {
    // 수정 모드
    editingWorkerId = workerId;
    title.textContent = '인력 정보 수정';
    
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      document.getElementById('worker-id').value = worker.id;
      document.getElementById('worker-name').value = worker.name;
      document.getElementById('worker-role').value = worker.role;
      document.getElementById('worker-team').value = worker.team;
      document.getElementById('worker-hire-date').value = worker.hire_date;
      document.getElementById('worker-phone').value = worker.phone || '';
      document.getElementById('worker-email').value = worker.email || '';
    }
  } else {
    // 추가 모드
    editingWorkerId = null;
    title.textContent = '인력 추가';
    form.reset();
  }
  
  modal.classList.add('active');
}

function closeWorkerModal() {
  const modal = document.getElementById('worker-modal');
  modal.classList.remove('active');
  editingWorkerId = null;
}

// 워커 폼 제출
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('worker-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const workerData = {
        name: document.getElementById('worker-name').value,
        role: document.getElementById('worker-role').value,
        team: document.getElementById('worker-team').value,
        hire_date: document.getElementById('worker-hire-date').value,
        phone: document.getElementById('worker-phone').value,
        email: document.getElementById('worker-email').value
      };
      
      try {
        if (editingWorkerId) {
          await ipcRenderer.invoke('update-worker', editingWorkerId, workerData);
          alert('인력 정보가 수정되었습니다.');
        } else {
          await ipcRenderer.invoke('add-worker', workerData);
          alert('새 인력이 추가되었습니다.');
        }
        
        closeWorkerModal();
        await loadWorkersList();
      } catch (error) {
        console.error('워커 저장 실패:', error);
        alert('저장 중 오류가 발생했습니다.');
      }
    });
  }
  
  // 워커 추가 버튼
  const addBtn = document.getElementById('add-worker-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openWorkerModal());
  }
  
  // 검색
  const searchInput = document.getElementById('worker-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleWorkerSearch, 300));
  }
  
  // 필터
  const teamFilter = document.getElementById('team-filter');
  const riskFilter = document.getElementById('risk-filter');
  if (teamFilter) teamFilter.addEventListener('change', handleWorkerFilter);
  if (riskFilter) riskFilter.addEventListener('change', handleWorkerFilter);
  
  // 알림 필터 버튼
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const filter = this.dataset.filter;
      loadAlertsByFilter(filter);
    });
  });
});

// 워커 목록 로드
async function loadWorkersList() {
  workers = await ipcRenderer.invoke('get-workers');
  displayWorkersTable(workers);
}

// 워커 테이블 표시
function displayWorkersTable(workerList) {
  const tbody = document.getElementById('workers-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = workerList.map(worker => `
    <tr>
      <td>${worker.name}</td>
      <td>${worker.role}</td>
      <td>${worker.team}</td>
      <td>${formatDate(worker.hire_date)}</td>
      <td>${worker.phone || '-'}</td>
      <td>
        <span class="status-badge ${worker.risk_status}">${getRiskStatusText(worker.risk_status)}</span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" onclick="openWorkerModal(${worker.id})">수정</button>
          <button class="action-btn delete" onclick="deleteWorker(${worker.id})">삭제</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// 워커 검색
async function handleWorkerSearch(e) {
  const query = e.target.value.trim();
  if (query.length === 0) {
    await loadWorkersList();
    return;
  }
  
  const results = await ipcRenderer.invoke('search-workers', query);
  displayWorkersTable(results);
}

// 워커 필터
async function handleWorkerFilter() {
  const team = document.getElementById('team-filter').value;
  const riskStatus = document.getElementById('risk-filter').value;
  
  const results = await ipcRenderer.invoke('filter-workers', { team, risk_status: riskStatus });
  displayWorkersTable(results);
}

// 워커 삭제
async function deleteWorker(workerId) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  
  try {
    await ipcRenderer.invoke('delete-worker', workerId);
    alert('삭제되었습니다.');
    await loadWorkersList();
  } catch (error) {
    console.error('삭제 실패:', error);
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// 알림 확인
async function acknowledgeAlert(alertId) {
  await ipcRenderer.invoke('acknowledge-alert', alertId);
  await loadAlerts();
}

// 알림 해결 모달
function openResolveModal(alertId) {
  const modal = document.getElementById('resolve-modal');
  document.getElementById('resolve-alert-id').value = alertId;
  modal.classList.add('active');
}

function closeResolveModal() {
  const modal = document.getElementById('resolve-modal');
  modal.classList.remove('active');
  document.getElementById('resolve-form').reset();
}

// 알림 해결 폼 제출
document.addEventListener('DOMContentLoaded', () => {
  const resolveForm = document.getElementById('resolve-form');
  if (resolveForm) {
    resolveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const alertId = document.getElementById('resolve-alert-id').value;
      const notes = document.getElementById('resolve-notes').value;
      
      try {
        await ipcRenderer.invoke('resolve-alert', alertId, notes);
        alert('알림이 해결되었습니다.');
        closeResolveModal();
        await loadAlerts();
      } catch (error) {
        console.error('해결 처리 실패:', error);
        alert('처리 중 오류가 발생했습니다.');
      }
    });
  }
});

// 알림 필터별 로드
async function loadAlertsByFilter(filter) {
  const allAlerts = await ipcRenderer.invoke('get-risk-alerts', 'all');
  let filteredAlerts = allAlerts;
  
  if (filter !== 'all') {
    filteredAlerts = allAlerts.filter(alert => alert.status === filter);
  }
  
  displayAlertsWithActions(filteredAlerts);
}

// 알림 표시 (액션 버튼 포함)
function displayAlertsWithActions(alertList) {
  const container = document.getElementById('alerts-container');
  
  if (alertList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-text">알림이 없습니다</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = alertList.map(alert => `
    <div class="alert-card">
      <div class="alert-header">
        <div>
          <div class="alert-title">⚠️ ${alert.risk_level === 'high' ? '긴급' : '주의'} 번아웃 리스크 감지</div>
          <div class="alert-worker">${alert.name} (${alert.role})</div>
        </div>
        <div class="alert-meta">
          <div>${alert.team}</div>
          <div>${formatDateTime(alert.alert_date)}</div>
          ${alert.status === 'resolved' ? '<div style="color: #4ade80;">✅ 해결됨</div>' : ''}
        </div>
      </div>
      
      <div class="alert-body">
        <div class="risk-metrics">
          <div class="risk-metric">
            <div class="risk-metric-value">85%</div>
            <div class="risk-metric-label">부정적 감정 증가율</div>
          </div>
          <div class="risk-metric">
            <div class="risk-metric-value">${alert.risk_score}%</div>
            <div class="risk-metric-label">번아웃 리스크 점수</div>
          </div>
          <div class="risk-metric">
            <div class="risk-metric-value">3일</div>
            <div class="risk-metric-label">예상 임계점 도달</div>
          </div>
        </div>
        
        <div class="alert-message">
          ⚠️ 긴급 알림: ${alert.name}님은 고위험군으로 분류되었습니다. 즉각적인 관리자 개입이 필요합니다.
        </div>
      </div>
      
      <div class="alert-actions">
        ${alert.status === 'pending' ? `
          <button class="btn btn-primary" onclick="showInterventions(${alert.id}, '${alert.name}')">
            💡 개입 방안 보기
          </button>
          <button class="btn btn-secondary" onclick="acknowledgeAlert(${alert.id})">
            ✓ 확인
          </button>
          <button class="btn btn-secondary" onclick="openResolveModal(${alert.id})">
            ✅ 해결
          </button>
        ` : alert.status === 'acknowledged' ? `
          <button class="btn btn-primary" onclick="showInterventions(${alert.id}, '${alert.name}')">
            💡 개입 방안 보기
          </button>
          <button class="btn btn-secondary" onclick="openResolveModal(${alert.id})">
            ✅ 해결
          </button>
        ` : `
          <button class="btn btn-secondary" onclick="showWorkerDetail(${alert.worker_id})">
            📊 상세 분석
          </button>
        `}
      </div>
    </div>
  `).join('');
}

// 리포트 생성
async function generateReport(reportType) {
  const now = new Date();
  let periodStart, periodEnd;
  
  switch(reportType) {
    case 'weekly':
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      periodEnd = now.toISOString();
      break;
    case 'monthly':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      periodEnd = now.toISOString();
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1).toISOString();
      periodEnd = now.toISOString();
      break;
    case 'risk':
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      periodEnd = now.toISOString();
      break;
  }
  
  try {
    await ipcRenderer.invoke('generate-report', reportType, periodStart, periodEnd);
    alert('리포트가 생성되었습니다.');
    await loadReports();
  } catch (error) {
    console.error('리포트 생성 실패:', error);
    alert('리포트 생성 중 오류가 발생했습니다.');
  }
}

// 리포트 목록 로드
async function loadReports() {
  const reports = await ipcRenderer.invoke('get-reports');
  const container = document.getElementById('reports-list');
  
  if (!container) return;
  
  if (reports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">생성된 리포트가 없습니다</div>
        <div class="empty-state-subtext">위의 버튼을 클릭하여 리포트를 생성하세요</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = reports.map(report => `
    <div class="report-item">
      <div class="report-item-info">
        <h4>${report.report_name}</h4>
        <p>${report.summary}</p>
        <p style="font-size: 12px; margin-top: 8px;">생성일: ${formatDateTime(report.generated_at)}</p>
      </div>
      <div class="report-item-actions">
        <button class="btn btn-secondary" onclick="alert('리포트 상세 기능 준비 중')">
          📄 보기
        </button>
      </div>
    </div>
  `).join('');
}

// 분석 데이터 로드
async function loadAnalytics() {
  const data = await ipcRenderer.invoke('get-analytics-data');
  
  // 부서별 감정 상태 차트
  drawTeamEmotionChart(data.teamEmotions);
  
  // 월별 번아웃 추이 차트
  drawMonthlyBurnoutChart(data.monthlyBurnout);
  
  // 폴라 차트
  drawEmotionPolarChart();
}

// 부서별 감정 차트
function drawTeamEmotionChart(teamEmotions) {
  const ctx = document.getElementById('team-emotion-chart');
  if (!ctx) return;
  
  // 데이터 구조화
  const teams = [...new Set(teamEmotions.map(t => t.team))];
  const emotionTypes = [...new Set(teamEmotions.map(t => t.emotion_type))];
  
  const datasets = emotionTypes.map(emotion => ({
    label: emotion,
    data: teams.map(team => {
      const item = teamEmotions.find(t => t.team === team && t.emotion_type === emotion);
      return item ? item.count : 0;
    }),
    backgroundColor: getEmotionColor(emotion)
  }));
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: teams,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '#e8eaed'
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#8e9aaf' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        y: {
          stacked: true,
          ticks: { color: '#8e9aaf' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

// 월별 번아웃 차트
function drawMonthlyBurnoutChart(monthlyData) {
  const ctx = document.getElementById('monthly-burnout-chart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthlyData.map(d => d.month),
      datasets: [{
        label: '평균 리스크 점수',
        data: monthlyData.map(d => Math.round(d.avg_score)),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: '#e8eaed' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: '#8e9aaf',
            callback: value => value + '%'
          },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        x: {
          ticks: { color: '#8e9aaf' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

// 폴라 차트
function drawEmotionPolarChart() {
  const ctx = document.getElementById('emotion-polar-chart');
  if (!ctx) return;
  
  const emotionTypes = ['긍정적', '만족', '중립적', '피로', '스트레스', '부정적'];
  const colors = emotionTypes.map(e => getEmotionColor(e));
  
  new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: emotionTypes,
      datasets: [{
        data: [25, 20, 15, 18, 12, 10],
        backgroundColor: colors.map(c => c + '80'),
        borderColor: colors,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#e8eaed' }
        }
      }
    }
  });
}

// 헬퍼 함수들
function getRiskStatusText(status) {
  const texts = {
    normal: '안정',
    warning: '주의',
    danger: '위험'
  };
  return texts[status] || '알 수 없음';
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 모달 닫기 핸들러 추가
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.modal').classList.remove('active');
    });
  });
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  });
});


// ==================== 심리상담 연계 시스템 ====================

// 심리상담 데이터 로드
async function loadCounselingView() {
  await loadCounselingStats();
  await loadSessions();
  await loadCounselors();
  await loadCounselingHistory();
}

// 상담 통계 로드
async function loadCounselingStats() {
  try {
    const stats = await window.api.invoke('get-counseling-stats');
    document.getElementById('scheduled-sessions').textContent = stats.scheduled_sessions;
    document.getElementById('active-counselors').textContent = stats.active_counselors;
    document.getElementById('completed-sessions').textContent = stats.completed_sessions;
    document.getElementById('auto-linked').textContent = stats.auto_linked_count;
    document.getElementById('counseling-badge').textContent = stats.scheduled_sessions;
  } catch (error) {
    console.error('상담 통계 로드 실패:', error);
  }
}

// 상담 세션 로드
async function loadSessions() {
  try {
    const sessions = await window.api.invoke('get-counseling-sessions');
    const tbody = document.getElementById('sessions-table-body');
    
    if (!sessions || sessions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">📭</div><h3>등록된 상담이 없습니다</h3><p>고위험군이 감지되면 자동으로 연계됩니다.</p></td></tr>';
      return;
    }
    
    tbody.innerHTML = sessions.map(session => `
      <tr>
        <td>
          <div>
            <strong>${session.worker_name || '-'}</strong>
            <div style="font-size: 0.85rem; color: #8e9aaf;">${session.worker_role || ''}</div>
          </div>
        </td>
        <td>
          <div>
            <strong>${session.counselor_name || '-'}</strong>
            <div style="font-size: 0.85rem; color: #8e9aaf;">${session.counselor_license || ''}</div>
          </div>
        </td>
        <td>${session.session_date ? new Date(session.session_date).toLocaleString('ko-KR') : '-'}</td>
        <td>
          <span class="session-type ${session.session_type}">
            ${session.session_type === 'auto' ? '🔗 자동 연계' : '📝 수동 생성'}
          </span>
        </td>
        <td>
          <span class="priority-badge ${session.priority}">
            ${session.priority === 'urgent' ? '🚨 긴급' : session.priority === 'high' ? '⚠️높음' : '✅ 보통'}
          </span>
        </td>
        <td>
          <span class="session-status ${session.status}">
            ${getSessionStatusText(session.status)}
          </span>
        </td>
        <td>
          ${session.status === 'scheduled' ? 
            `<button class="btn btn-sm btn-success" onclick="startSession(${session.id})">시작</button>
             <button class="btn btn-sm btn-danger" onclick="cancelSession(${session.id})">취소</button>` :
            session.status === 'in_progress' ?
            `<button class="btn btn-sm btn-primary" onclick="completeSession(${session.id})">완료</button>` :
            `<button class="btn btn-sm btn-secondary" onclick="viewSessionDetails(${session.id})">상세</button>`
          }
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('상담 세션 로드 실패:', error);
  }
}

// 상담사 로드
async function loadCounselors() {
  try {
    const counselors = await window.api.invoke('get-counselors');
    const grid = document.getElementById('counselors-grid');
    
    if (!counselors || counselors.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👨‍⚕️</div><h3>등록된 상담사가 없습니다</h3><p>상담사를 추가해주세요.</p></div>';
      return;
    }
    
    grid.innerHTML = counselors.map(counselor => {
      const specialties = counselor.specialties.split(',').map(s => s.trim());
      const loadPercent = Math.min(100, (counselor.current_load / counselor.max_capacity) * 100);
      const statusText = counselor.availability === 'available' ? '가능' : 
                        counselor.availability === 'busy' ? '바쁨' : '불가능';
      
      return `
        <div class="counselor-card" data-counselor-id="${counselor.id}">
          <div class="counselor-header">
            <div class="counselor-info">
              <h4>${counselor.name}</h4>
              <p>${counselor.license}</p>
            </div>
            <span class="counselor-status ${counselor.availability}">${statusText}</span>
          </div>
          
          <div class="counselor-specialties">
            <h5>전문 분야</h5>
            <div class="specialty-tags">
              ${specialties.map(s => `<span class="specialty-tag">${s}</span>`).join('')}
            </div>
          </div>
          
          <div class="counselor-stats">
            <div class="counselor-stat">
              <div class="counselor-stat-value">${counselor.current_load}</div>
              <div class="counselor-stat-label">진행중</div>
            </div>
            <div class="counselor-stat">
              <div class="counselor-stat-value">${counselor.max_capacity}</div>
              <div class="counselor-stat-label">최대 용량</div>
            </div>
            <div class="counselor-stat">
              <div class="counselor-stat-value">${counselor.total_sessions || 0}</div>
              <div class="counselor-stat-label">총 상담</div>
            </div>
          </div>
          
          <div class="counselor-load-bar">
            <label>가동률: ${Math.round(loadPercent)}%</label>
            <div class="load-bar">
              <div class="load-bar-fill" style="width: ${loadPercent}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // 상담사 카드 클릭 이벤트
    document.querySelectorAll('.counselor-card').forEach(card => {
      card.addEventListener('click', function() {
        const counselorId = this.dataset.counselorId;
        editCounselor(counselorId);
      });
    });
  } catch (error) {
    console.error('상담사 로드 실패:', error);
  }
}

// 상담 이력 로드
async function loadCounselingHistory() {
  try {
    const history = await window.api.invoke('get-counseling-history');
    const timeline = document.getElementById('history-timeline');
    
    if (!history || history.length === 0) {
      timeline.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>상담 이력이 없습니다</h3><p>완료된 상담이 없습니다.</p></div>';
      return;
    }
    
    timeline.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="history-item-date">${new Date(item.created_at).toLocaleString('ko-KR')}</div>
        <div class="history-item-content">
          <div class="history-item-title">
            ${item.worker_name} ↔ ${item.counselor_name}
          </div>
          <div class="history-item-text">
            <strong>상담 결과:</strong> ${item.outcome || '-'}<br>
            ${item.notes ? `<strong>메모:</strong> ${item.notes}` : ''}
          </div>
          <div class="history-item-footer">
            <span>📅 ${new Date(item.session_date).toLocaleDateString('ko-KR')}</span>
            ${item.follow_up_date ? `<span>🔄 후속 상담: ${new Date(item.follow_up_date).toLocaleDateString('ko-KR')}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('상담 이력 로드 실패:', error);
  }
}

// 탭 전환
function setupCounselingTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      
      // 모든 탭 비활성화
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // 선택된 탭 활성화
      this.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      // 탭별 데이터 로드
      if (tabName === 'sessions') loadSessions();
      else if (tabName === 'counselors') loadCounselors();
      else if (tabName === 'history') loadCounselingHistory();
    });
  });
}

// 상담사 추가 모달
function openCounselorModal(counselorId = null) {
  const modal = document.getElementById('counselor-modal');
  const form = document.getElementById('counselor-form');
  const title = document.getElementById('counselor-modal-title');
  
  form.reset();
  
  if (counselorId) {
    title.textContent = '상담사 수정';
    // 상담사 정보 로드
    window.api.invoke('get-counselors').then(counselors => {
      const counselor = counselors.find(c => c.id === parseInt(counselorId));
      if (counselor) {
        document.getElementById('counselor-id').value = counselor.id;
        document.getElementById('counselor-name').value = counselor.name;
        document.getElementById('counselor-license').value = counselor.license;
        document.getElementById('counselor-specialties').value = counselor.specialties;
        document.getElementById('counselor-phone').value = counselor.phone;
        document.getElementById('counselor-email').value = counselor.email;
        document.getElementById('counselor-availability').value = counselor.availability;
      }
    });
  } else {
    title.textContent = '상담사 추가';
    document.getElementById('counselor-id').value = '';
  }
  
  modal.classList.add('active');
}

function closeCounselorModal() {
  document.getElementById('counselor-modal').classList.remove('active');
}

// 상담사 저장
document.getElementById('counselor-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const id = document.getElementById('counselor-id').value;
  const data = {
    name: document.getElementById('counselor-name').value,
    license: document.getElementById('counselor-license').value,
    specialties: document.getElementById('counselor-specialties').value,
    phone: document.getElementById('counselor-phone').value,
    email: document.getElementById('counselor-email').value,
    availability: document.getElementById('counselor-availability').value
  };
  
  try {
    if (id) {
      await window.api.invoke('update-counselor', { id: parseInt(id), ...data });
    } else {
      await window.api.invoke('add-counselor', data);
    }
    
    closeCounselorModal();
    await loadCounselors();
    await loadCounselingStats();
  } catch (error) {
    console.error('상담사 저장 실패:', error);
    alert('저장에 실패했습니다: ' + error.message);
  }
});

// 상담사 추가 버튼
document.getElementById('add-counselor-btn')?.addEventListener('click', () => {
  openCounselorModal();
});

// 상담사 수정
function editCounselor(counselorId) {
  openCounselorModal(counselorId);
}

// 세션 상태 변경
async function startSession(sessionId) {
  try {
    await window.api.invoke('update-session-status', { 
      session_id: sessionId, 
      status: 'in_progress' 
    });
    await loadSessions();
    await loadCounselingStats();
  } catch (error) {
    console.error('세션 시작 실패:', error);
    alert('세션 시작에 실패했습니다: ' + error.message);
  }
}

async function completeSession(sessionId) {
  const outcome = prompt('상담 결과를 입력하세요:');
  const notes = prompt('추가 메모 (선택사항):');
  
  if (outcome) {
    try {
      await window.api.invoke('update-session-status', { 
        session_id: sessionId, 
        status: 'completed',
        outcome: outcome,
        notes: notes
      });
      
      await window.api.invoke('add-counseling-history', {
        session_id: sessionId,
        outcome: outcome,
        notes: notes
      });
      
      await loadSessions();
      await loadCounselingStats();
      await loadCounselingHistory();
    } catch (error) {
      console.error('세션 완료 실패:', error);
      alert('세션 완료에 실패했습니다: ' + error.message);
    }
  }
}

async function cancelSession(sessionId) {
  if (confirm('정말로 이 상담을 취소하시겠습니까?')) {
    try {
      await window.api.invoke('update-session-status', { 
        session_id: sessionId, 
        status: 'cancelled' 
      });
      await loadSessions();
      await loadCounselingStats();
    } catch (error) {
      console.error('세션 취소 실패:', error);
      alert('세션 취소에 실패했습니다: ' + error.message);
    }
  }
}

function viewSessionDetails(sessionId) {
  alert('상세 보기 기능은 추후 구현 예정입니다.');
}

// 세션 상태 텍스트
function getSessionStatusText(status) {
  const statusMap = {
    'scheduled': '📅 예정됨',
    'in_progress': '⏳ 진행중',
    'completed': '✅ 완료됨',
    'cancelled': '❌ 취소됨'
  };
  return statusMap[status] || status;
}

// 세션 필터링
document.getElementById('session-status-filter')?.addEventListener('change', filterSessions);
document.getElementById('session-type-filter')?.addEventListener('change', filterSessions);

async function filterSessions() {
  const statusFilter = document.getElementById('session-status-filter').value;
  const typeFilter = document.getElementById('session-type-filter').value;
  
  try {
    const allSessions = await window.api.invoke('get-counseling-sessions');
    let filtered = allSessions;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(s => s.session_type === typeFilter);
    }
    
    const tbody = document.getElementById('sessions-table-body');
    
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">🔍</div><h3>검색 결과가 없습니다</h3></td></tr>';
      return;
    }
    
    tbody.innerHTML = filtered.map(session => `
      <tr>
        <td>
          <div>
            <strong>${session.worker_name || '-'}</strong>
            <div style="font-size: 0.85rem; color: #8e9aaf;">${session.worker_role || ''}</div>
          </div>
        </td>
        <td>
          <div>
            <strong>${session.counselor_name || '-'}</strong>
            <div style="font-size: 0.85rem; color: #8e9aaf;">${session.counselor_license || ''}</div>
          </div>
        </td>
        <td>${session.session_date ? new Date(session.session_date).toLocaleString('ko-KR') : '-'}</td>
        <td>
          <span class="session-type ${session.session_type}">
            ${session.session_type === 'auto' ? '🔗 자동 연계' : '📝 수동 생성'}
          </span>
        </td>
        <td>
          <span class="priority-badge ${session.priority}">
            ${session.priority === 'urgent' ? '🚨 긴급' : session.priority === 'high' ? '⚠️ 높음' : '✅ 보통'}
          </span>
        </td>
        <td>
          <span class="session-status ${session.status}">
            ${getSessionStatusText(session.status)}
          </span>
        </td>
        <td>
          ${session.status === 'scheduled' ? 
            `<button class="btn btn-sm btn-success" onclick="startSession(${session.id})">시작</button>
             <button class="btn btn-sm btn-danger" onclick="cancelSession(${session.id})">취소</button>` :
            session.status === 'in_progress' ?
            `<button class="btn btn-sm btn-primary" onclick="completeSession(${session.id})">완료</button>` :
            `<button class="btn btn-sm btn-secondary" onclick="viewSessionDetails(${session.id})">상세</button>`
          }
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('세션 필터링 실패:', error);
  }
}

// 초기화 시 탭 설정
document.addEventListener('DOMContentLoaded', () => {
  setupCounselingTabs();
});

// ==================== 미리보기 시스템 ====================

// 미리보기 뷰 로드
function loadPreviewView() {
  setupPreviewTabs();
}

// 미리보기 탭 설정
function setupPreviewTabs() {
  const tabBtns = document.querySelectorAll('.preview-tab-btn');
  const tabContents = document.querySelectorAll('.preview-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const previewType = this.dataset.preview;
      
      // 모든 탭 비활성화
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // 선택된 탭 활성화
      this.classList.add('active');
      const targetContent = document.getElementById(`${previewType}-preview`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// ==================== 데이터 수집 시스템 ====================

// 데이터 수집 뷰 로드
async function loadDataCollectionView() {
  await loadWorkerSelects();
  setupCollectionTabs();
  setupIntensitySlider();
  setupForms();
  loadRecentLogs();
}

// 워커 선택 드롭다운 로드
async function loadWorkerSelects() {
  try {
    const workers = await window.api.invoke('get-workers');
    
    // 직접 입력용
    const selfSelect = document.getElementById('self-worker-select');
    if (selfSelect) {
      selfSelect.innerHTML = '<option value="">선택하세요</option>' +
        workers.filter(w => w.status === 'active').map(w => 
          `<option value="${w.id}">${w.name} - ${w.role}</option>`
        ).join('');
    }
    
    // 관리자 입력용
    const managerSelect = document.getElementById('manager-worker-select');
    if (managerSelect) {
      managerSelect.innerHTML = '<option value="">선택하세요</option>' +
        workers.filter(w => w.status === 'active').map(w => 
          `<option value="${w.id}">${w.name} - ${w.role} (${w.team})</option>`
        ).join('');
    }
    
    // 필터용
    const filterSelect = document.getElementById('log-worker-filter');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">전체 인력</option>' +
        workers.map(w => 
          `<option value="${w.id}">${w.name}</option>`
        ).join('');
    }
    
  } catch (error) {
    console.error('워커 목록 로드 실패:', error);
  }
}

// 수집 탭 설정
function setupCollectionTabs() {
  const tabBtns = document.querySelectorAll('.collection-tab-btn');
  const tabContents = document.querySelectorAll('.collection-tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      
      // 모든 탭 비활성화
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // 선택된 탭 활성화
      this.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      if (tabName === 'recent-logs') {
        loadRecentLogs();
      }
    });
  });
}

// 강도 슬라이더 설정
function setupIntensitySlider() {
  const slider = document.getElementById('self-intensity');
  const valueDisplay = document.getElementById('intensity-value');
  
  if (slider && valueDisplay) {
    slider.addEventListener('input', function() {
      valueDisplay.textContent = this.value;
    });
  }
}

// 폼 설정
function setupForms() {
  // 직접 입력 폼
  const selfForm = document.getElementById('self-checkin-form');
  if (selfForm) {
    selfForm.addEventListener('submit', handleSelfCheckin);
  }
  
  // 관리자 입력 폼
  const managerForm = document.getElementById('manager-input-form');
  if (managerForm) {
    // 오늘 날짜 기본값
    const dateInput = document.getElementById('manager-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    managerForm.addEventListener('submit', handleManagerInput);
  }
}

// 직접 체크인 처리
async function handleSelfCheckin(e) {
  e.preventDefault();
  
  const workerId = document.getElementById('self-worker-select').value;
  const emotion = document.querySelector('input[name="emotion"]:checked').value;
  const intensity = document.getElementById('self-intensity').value;
  const notes = document.getElementById('self-notes').value;
  
  try {
    await window.api.invoke('add-emotion-log', {
      worker_id: parseInt(workerId),
      emotion_type: emotion,
      intensity: parseInt(intensity),
      notes: notes || null
    });
    
    // 성공 메시지
    alert('✅ 체크인이 완료되었습니다!');
    
    // 폼 초기화
    e.target.reset();
    document.getElementById('intensity-value').textContent = '5';
    
    // 대시보드 새로고침
    if (currentView === 'dashboard') {
      await loadDashboard();
    }
    
  } catch (error) {
    console.error('체크인 실패:', error);
    alert('❌ 체크인에 실패했습니다: ' + error.message);
  }
}

// 관리자 입력 처리
async function handleManagerInput(e) {
  e.preventDefault();
  
  const workerId = document.getElementById('manager-worker-select').value;
  const date = document.getElementById('manager-date').value;
  const emotion = document.querySelector('input[name="manager-emotion"]:checked').value;
  const intensity = document.getElementById('manager-intensity').value;
  const source = document.getElementById('manager-source').value;
  const notes = document.getElementById('manager-notes').value;
  
  try {
    await window.api.invoke('add-emotion-log', {
      worker_id: parseInt(workerId),
      emotion_type: emotion,
      intensity: parseInt(intensity),
      notes: `[${source}] ${notes}`,
      logged_at: date
    });
    
    // 성공 메시지
    alert('✅ 감정 기록이 저장되었습니다!');
    
    // 폼 초기화
    e.target.reset();
    document.getElementById('manager-date').value = new Date().toISOString().split('T')[0];
    
    // 대시보드 새로고침
    if (currentView === 'dashboard') {
      await loadDashboard();
    }
    
  } catch (error) {
    console.error('기록 저장 실패:', error);
    alert('❌ 기록 저장에 실패했습니다: ' + error.message);
  }
}

// 최근 로그 로드
async function loadRecentLogs() {
  try {
    const logs = await window.api.invoke('get-recent-emotion-logs', { limit: 20 });
    const container = document.getElementById('recent-logs-container');
    
    if (!logs || logs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>기록이 없습니다</h3><p>감정 데이터를 입력해주세요.</p></div>';
      return;
    }
    
    container.innerHTML = logs.map(log => {
      const emotionClass = getEmotionClass(log.emotion_type);
      return `
        <div class="log-item">
          <div class="log-info">
            <div class="log-header">
              <span class="log-worker-name">${log.worker_name || '알 수 없음'}</span>
              <span class="log-emotion-badge ${emotionClass}">${getEmotionEmoji(log.emotion_type)} ${log.emotion_type}</span>
              <span class="intensity-badge">강도: ${log.intensity}/10</span>
            </div>
            <div class="log-details">
              ${log.notes ? log.notes : '추가 메모 없음'}
            </div>
          </div>
          <div class="log-time">
            ${formatDateTime(log.logged_at)}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('최근 로그 로드 실패:', error);
  }
}

// 감정 타입별 클래스
function getEmotionClass(emotion) {
  const classes = {
    '긍정적': 'positive',
    '만족': 'satisfied',
    '중립적': 'neutral',
    '피로': 'tired',
    '스트레스': 'stressed',
    '부정적': 'negative'
  };
  return classes[emotion] || 'neutral';
}

// 감정 이모지
function getEmotionEmoji(emotion) {
  const emojis = {
    '긍정적': '😊',
    '만족': '😌',
    '중립적': '😐',
    '피로': '😓',
    '스트레스': '😰',
    '부정적': '😢'
  };
  return emojis[emotion] || '😐';
}

// 날짜 시간 포맷
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================
// 모바일 체크인 시스템
// ============================================

function setupMobileCheckin() {
  const mobileSubmit = document.getElementById('mobile-submit');
  
  if (mobileSubmit) {
    mobileSubmit.addEventListener('click', handleMobileCheckin);
  }
  
  // 모바일 감정 버튼 클릭 효과
  const emotionBtns = document.querySelectorAll('.mobile-emotion-btn');
  emotionBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      emotionBtns.forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
}

async function handleMobileCheckin() {
  const selectedEmotion = document.querySelector('input[name="mobile-emotion"]:checked');
  
  if (!selectedEmotion) {
    showNotification('감정을 선택해주세요', 'warning');
    return;
  }
  
  const emotionValue = selectedEmotion.value;
  const emotionLabel = selectedEmotion.parentElement.dataset.emotion;
  
  // 감정에 따른 강도 자동 설정
  const intensityMap = {
    '긍정적': 9,
    '만족': 7,
    '중립적': 5,
    '피로': 4,
    '부정적': 2
  };
  
  try {
    // 현재 활성 워커 중 첫 번째 선택 (데모용)
    const workers = await window.api.invoke('get-workers');
    const activeWorkers = workers.filter(w => w.status === 'active');
    
    if (activeWorkers.length === 0) {
      showNotification('활성 인력이 없습니다', 'warning');
      return;
    }
    
    // 랜덤 워커 선택 (실제로는 로그인한 사용자)
    const randomWorker = activeWorkers[Math.floor(Math.random() * activeWorkers.length)];
    
    const logData = {
      workerId: randomWorker.id,
      emotionType: emotionValue,
      intensity: intensityMap[emotionValue] || 5,
      notes: `모바일 체크인 - ${emotionLabel}`,
      timestamp: new Date().toISOString()
    };
    
    await window.api.invoke('add-emotion-log', logData);
    
    // 성공 애니메이션
    const mobileScreen = document.querySelector('.mobile-screen');
    if (mobileScreen) {
      mobileScreen.style.transform = 'scale(0.95)';
      setTimeout(() => {
        mobileScreen.style.transform = 'scale(1)';
      }, 200);
    }
    
    showNotification(`✅ ${randomWorker.name}님의 체크인이 완료되었습니다!`, 'success');
    
    // 체크인 후 선택 해제
    document.querySelectorAll('input[name="mobile-emotion"]').forEach(input => {
      input.checked = false;
    });
    document.querySelectorAll('.mobile-emotion-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    
  } catch (error) {
    console.error('모바일 체크인 실패:', error);
    showNotification('체크인 실패: ' + error.message, 'error');
  }
}

// ============================================
// 웨어러블 디바이스 시뮬레이션
// ============================================

let simulationRunning = false;
let simulationInterval = null;
let simulationData = {
  totalCount: 0,
  activeDevices: 0,
  heartRates: [],
  stressLevels: []
};

function setupAutoCollection() {
  const startBtn = document.getElementById('start-simulation');
  
  if (startBtn) {
    startBtn.addEventListener('click', toggleSimulation);
  }
}

function toggleSimulation() {
  if (simulationRunning) {
    stopSimulation();
  } else {
    startSimulation();
  }
}

async function startSimulation() {
  simulationRunning = true;
  const startBtn = document.getElementById('start-simulation');
  startBtn.textContent = '⏸️ 시뮬레이션 중지';
  startBtn.style.backgroundColor = '#e63946';
  
  // 활성 워커 로드
  const workers = await window.api.invoke('get-workers');
  const activeWorkers = workers.filter(w => w.status === 'active');
  
  if (activeWorkers.length === 0) {
    showNotification('활성 인력이 없습니다', 'warning');
    stopSimulation();
    return;
  }
  
  simulationData.activeDevices = Math.min(activeWorkers.length, 5); // 최대 5개 디바이스
  updateSimulationStats();
  
  // 센서 모니터 생성
  createSensorMonitors(simulationData.activeDevices, activeWorkers);
  
  // 10초마다 데이터 생성
  simulationInterval = setInterval(() => {
    generateSensorData(activeWorkers);
  }, 10000); // 10초
  
  // 첫 데이터 즉시 생성
  generateSensorData(activeWorkers);
  
  showNotification('시뮬레이션이 시작되었습니다', 'success');
}

function stopSimulation() {
  simulationRunning = false;
  const startBtn = document.getElementById('start-simulation');
  startBtn.textContent = '▶️ 시뮬레이션 시작';
  startBtn.style.backgroundColor = '#457b9d';
  
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  showNotification('시뮬레이션이 중지되었습니다', 'info');
}

function createSensorMonitors(count, workers) {
  const container = document.getElementById('sensor-monitor-container');
  if (!container) return;
  
  container.innerHTML = workers.slice(0, count).map((worker, index) => `
    <div class="sensor-card" id="sensor-${index}">
      <div class="sensor-header">
        <strong>${worker.name}</strong>
        <span class="sensor-status active">🟢 활성</span>
      </div>
      <div class="sensor-data">
        <div class="sensor-item">
          <span class="sensor-label">💓 심박수</span>
          <span class="sensor-value" id="hr-${index}">--</span>
        </div>
        <div class="sensor-item">
          <span class="sensor-label">😰 스트레스</span>
          <span class="sensor-value" id="stress-${index}">--</span>
        </div>
        <div class="sensor-item">
          <span class="sensor-label">😴 수면품질</span>
          <span class="sensor-value" id="sleep-${index}">--</span>
        </div>
        <div class="sensor-item">
          <span class="sensor-label">🚶 걸음수</span>
          <span class="sensor-value" id="steps-${index}">--</span>
        </div>
      </div>
    </div>
  `).join('');
}

async function generateSensorData(workers) {
  const activeDevices = simulationData.activeDevices;
  
  for (let i = 0; i < activeDevices; i++) {
    const worker = workers[i];
    
    // 랜덤 센서 데이터 생성
    const heartRate = 60 + Math.floor(Math.random() * 40); // 60-100 bpm
    const stressIndex = Math.floor(Math.random() * 100); // 0-100
    const sleepQuality = 50 + Math.floor(Math.random() * 50); // 50-100%
    const steps = Math.floor(Math.random() * 10000); // 0-10000 걸음
    
    // UI 업데이트
    updateSensorDisplay(i, heartRate, stressIndex, sleepQuality, steps);
    
    // 데이터 저장
    simulationData.heartRates.push(heartRate);
    simulationData.stressLevels.push(stressIndex);
    simulationData.totalCount++;
    
    // 타임라인 추가
    addTimelineItem(worker.name, heartRate, stressIndex);
    
    // 스트레스 지수가 높으면 자동으로 감정 로그 생성
    if (stressIndex >= 70) {
      try {
        const emotionType = stressIndex >= 85 ? '부정적' : '스트레스';
        const intensity = Math.ceil(stressIndex / 10);
        
        await window.api.invoke('add-emotion-log', {
          workerId: worker.id,
          emotionType: emotionType,
          intensity: intensity,
          notes: `자동 수집 - 높은 스트레스 지수 감지 (${stressIndex})`,
          timestamp: new Date().toISOString()
        });
        
        addTimelineItem(worker.name, heartRate, stressIndex, true); // 경고 표시
      } catch (error) {
        console.error('자동 로그 생성 실패:', error);
      }
    }
  }
  
  updateSimulationStats();
}

function updateSensorDisplay(index, heartRate, stressIndex, sleepQuality, steps) {
  const hrEl = document.getElementById(`hr-${index}`);
  const stressEl = document.getElementById(`stress-${index}`);
  const sleepEl = document.getElementById(`sleep-${index}`);
  const stepsEl = document.getElementById(`steps-${index}`);
  
  if (hrEl) hrEl.textContent = `${heartRate} bpm`;
  if (stressEl) {
    stressEl.textContent = `${stressIndex}/100`;
    // 스트레스 수준에 따른 색상
    stressEl.style.color = stressIndex >= 70 ? '#e63946' : stressIndex >= 50 ? '#f77f00' : '#06d6a0';
  }
  if (sleepEl) sleepEl.textContent = `${sleepQuality}%`;
  if (stepsEl) stepsEl.textContent = steps.toLocaleString();
}

function updateSimulationStats() {
  const totalEl = document.getElementById('sim-total-count');
  const devicesEl = document.getElementById('sim-active-devices');
  const avgHrEl = document.getElementById('sim-avg-heartrate');
  const avgStressEl = document.getElementById('sim-avg-stress');
  
  if (totalEl) totalEl.textContent = simulationData.totalCount;
  if (devicesEl) devicesEl.textContent = simulationData.activeDevices;
  
  if (avgHrEl && simulationData.heartRates.length > 0) {
    const avgHr = Math.round(
      simulationData.heartRates.reduce((a, b) => a + b, 0) / simulationData.heartRates.length
    );
    avgHrEl.textContent = `${avgHr} bpm`;
  }
  
  if (avgStressEl && simulationData.stressLevels.length > 0) {
    const avgStress = Math.round(
      simulationData.stressLevels.reduce((a, b) => a + b, 0) / simulationData.stressLevels.length
    );
    avgStressEl.textContent = `${avgStress}/100`;
  }
}

function addTimelineItem(workerName, heartRate, stressIndex, isWarning = false) {
  const timeline = document.getElementById('simulation-timeline');
  if (!timeline) return;
  
  // Empty 메시지 제거
  const emptyMsg = timeline.querySelector('.timeline-empty');
  if (emptyMsg) emptyMsg.remove();
  
  const timeStr = new Date().toLocaleTimeString('ko-KR');
  const warningClass = isWarning ? 'warning' : '';
  const warningIcon = isWarning ? '⚠️ ' : '';
  
  const item = document.createElement('div');
  item.className = `timeline-item ${warningClass}`;
  item.innerHTML = `
    <div class="timeline-time">${timeStr}</div>
    <div class="timeline-content">
      <strong>${warningIcon}${workerName}</strong>
      <div class="timeline-data">
        💓 ${heartRate} bpm | 😰 스트레스 ${stressIndex}/100
        ${isWarning ? '<span style="color: #e63946;">→ 자동 감정 로그 생성</span>' : ''}
      </div>
    </div>
  `;
  
  // 최신 항목을 위에 추가
  timeline.insertBefore(item, timeline.firstChild);
  
  // 최대 20개 항목만 유지
  while (timeline.children.length > 20) {
    timeline.removeChild(timeline.lastChild);
  }
}

// ============================================
// 초기화
// ============================================

// 데이터 수집 뷰 로드 시 모바일과 자동수집 초기화 추가
const originalLoadDataCollectionView = loadDataCollectionView;
loadDataCollectionView = async function() {
  await originalLoadDataCollectionView();
  setupMobileCheckin();
  setupAutoCollection();
};


// ============================================
// 얼굴 인식 체크인 시스템
// ============================================

let selfCameraStream = null;
let selfCapturedImage = null;

function setupFacialCheckin() {
  const startCameraBtn = document.getElementById('self-start-camera');
  const captureBtn = document.getElementById('self-capture-photo');
  const analyzeBtn = document.getElementById('self-analyze-face');
  const retakeBtn = document.getElementById('self-retake-photo');
  
  if (startCameraBtn) {
    startCameraBtn.addEventListener('click', startSelfCamera);
  }
  
  if (captureBtn) {
    captureBtn.addEventListener('click', captureSelfPhoto);
  }
  
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeSelfFace);
  }
  
  if (retakeBtn) {
    retakeBtn.addEventListener('click', retakeSelfPhoto);
  }
}

async function startSelfCamera() {
  try {
    const video = document.getElementById('self-camera-video');
    const preview = document.getElementById('self-camera-preview');
    const startBtn = document.getElementById('self-start-camera');
    const captureBtn = document.getElementById('self-capture-photo');
    
    // 카메라 권한 요청 및 스트림 가져오기
    selfCameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } 
    });
    
    video.srcObject = selfCameraStream;
    video.style.display = 'block';
    preview.style.display = 'none';
    
    // 버튼 상태 변경
    startBtn.style.display = 'none';
    captureBtn.style.display = 'inline-block';
    
    showNotification('카메라가 시작되었습니다', 'success');
    
  } catch (error) {
    console.error('카메라 접근 실패:', error);
    
    let errorMsg = '카메라 접근이 거부되었습니다.';
    if (error.name === 'NotFoundError') {
      errorMsg = '카메라를 찾을 수 없습니다.';
    } else if (error.name === 'NotAllowedError') {
      errorMsg = '카메라 권한이 필요합니다. 브라우저 설정에서 카메라를 허용해주세요.';
    } else if (error.name === 'NotReadableError') {
      errorMsg = '카메라가 다른 애플리케이션에서 사용 중입니다.';
    }
    
    showNotification(errorMsg, 'error');
  }
}

function captureSelfPhoto() {
  const video = document.getElementById('self-camera-video');
  const canvas = document.getElementById('self-camera-canvas');
  const capturedPhoto = document.getElementById('self-captured-photo');
  const photoPreview = document.getElementById('self-photo-preview');
  const captureBtn = document.getElementById('self-capture-photo');
  const analyzeBtn = document.getElementById('self-analyze-face');
  
  // 캔버스에 비디오 프레임 그리기
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // 이미지 데이터 저장
  selfCapturedImage = canvas.toDataURL('image/jpeg', 0.9);
  photoPreview.src = selfCapturedImage;
  
  // UI 업데이트
  video.style.display = 'none';
  capturedPhoto.style.display = 'block';
  captureBtn.style.display = 'none';
  analyzeBtn.style.display = 'inline-block';
  
  // 카메라 스트림 중지
  if (selfCameraStream) {
    selfCameraStream.getTracks().forEach(track => track.stop());
    selfCameraStream = null;
  }
  
  showNotification('사진이 촬영되었습니다', 'success');
}

function retakeSelfPhoto() {
  const video = document.getElementById('self-camera-video');
  const capturedPhoto = document.getElementById('self-captured-photo');
  const analysisResult = document.getElementById('self-analysis-result');
  const startBtn = document.getElementById('self-start-camera');
  const analyzeBtn = document.getElementById('self-analyze-face');
  
  // UI 초기화
  video.style.display = 'none';
  capturedPhoto.style.display = 'none';
  analysisResult.style.display = 'none';
  startBtn.style.display = 'inline-block';
  analyzeBtn.style.display = 'none';
  
  // 데이터 초기화
  selfCapturedImage = null;
  
  // 카메라 미리보기 다시 표시
  const preview = document.getElementById('self-camera-preview');
  preview.style.display = 'flex';
  
  showNotification('다시 촬영할 수 있습니다', 'info');
}

async function analyzeSelfFace() {
  if (!selfCapturedImage) {
    showNotification('먼저 사진을 촬영해주세요', 'warning');
    return;
  }
  
  const analyzeBtn = document.getElementById('self-analyze-face');
  const analysisResult = document.getElementById('self-analysis-result');
  const capturedPhoto = document.getElementById('self-captured-photo');
  
  try {
    // 분석 중 표시
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🤖 분석 중...';
    capturedPhoto.classList.add('analyzing');
    
    // AI 감정 분석 시뮬레이션 (실제로는 AI API 호출)
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 지연
    
    // 랜덤 감정 분석 결과 생성 (데모용)
    const emotions = [
      { type: '긍정적', emoji: '😊', confidence: 85 + Math.floor(Math.random() * 15) },
      { type: '만족', emoji: '🙂', confidence: 80 + Math.floor(Math.random() * 15) },
      { type: '중립적', emoji: '😐', confidence: 75 + Math.floor(Math.random() * 15) },
      { type: '피로', emoji: '😓', confidence: 70 + Math.floor(Math.random() * 20) },
      { type: '스트레스', emoji: '😰', confidence: 65 + Math.floor(Math.random() * 20) },
      { type: '부정적', emoji: '😢', confidence: 60 + Math.floor(Math.random() * 25) }
    ];
    
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    // 감정에 따른 강도 계산
    const intensityMap = {
      '긍정적': 8 + Math.floor(Math.random() * 3),
      '만족': 7 + Math.floor(Math.random() * 2),
      '중립적': 5 + Math.floor(Math.random() * 2),
      '피로': 4 + Math.floor(Math.random() * 3),
      '스트레스': 6 + Math.floor(Math.random() * 3),
      '부정적': 7 + Math.floor(Math.random() * 3)
    };
    
    const detectedIntensity = intensityMap[randomEmotion.type];
    
    // 상세 분석 데이터 생성
    const analysisData = {
      emotion: randomEmotion.type,
      emoji: randomEmotion.emoji,
      confidence: randomEmotion.confidence,
      intensity: detectedIntensity,
      happiness: Math.floor(Math.random() * 100),
      stress: Math.floor(Math.random() * 100),
      fatigue: Math.floor(Math.random() * 100),
      engagement: Math.floor(Math.random() * 100)
    };
    
    // 결과 표시
    displayAnalysisResult(analysisData);
    
    // 감정 선택 자동 설정
    autoSelectEmotion(randomEmotion.type, detectedIntensity);
    
    // UI 업데이트
    capturedPhoto.classList.remove('analyzing');
    analyzeBtn.style.display = 'none';
    analysisResult.style.display = 'block';
    
    showNotification('AI 감정 분석이 완료되었습니다!', 'success');
    
  } catch (error) {
    console.error('감정 분석 실패:', error);
    showNotification('감정 분석에 실패했습니다', 'error');
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '🤖 AI 감정 분석';
    capturedPhoto.classList.remove('analyzing');
  }
}

function displayAnalysisResult(data) {
  const detectedEmoji = document.getElementById('self-detected-emoji');
  const detectedEmotion = document.getElementById('self-detected-emotion');
  const confidence = document.getElementById('self-confidence');
  const analysisDetails = document.getElementById('self-analysis-details');
  
  // 주요 결과 표시
  detectedEmoji.textContent = data.emoji;
  detectedEmotion.textContent = data.emotion;
  confidence.textContent = data.confidence;
  
  // 상세 분석 결과 표시
  analysisDetails.innerHTML = `
    <div class="detail-item">
      <div class="detail-label">행복도</div>
      <div class="detail-value">${data.happiness}%</div>
      <div class="detail-bar">
        <div class="detail-fill" style="width: ${data.happiness}%"></div>
      </div>
    </div>
    <div class="detail-item">
      <div class="detail-label">스트레스</div>
      <div class="detail-value">${data.stress}%</div>
      <div class="detail-bar">
        <div class="detail-fill" style="width: ${data.stress}%"></div>
      </div>
    </div>
    <div class="detail-item">
      <div class="detail-label">피로도</div>
      <div class="detail-value">${data.fatigue}%</div>
      <div class="detail-bar">
        <div class="detail-fill" style="width: ${data.fatigue}%"></div>
      </div>
    </div>
    <div class="detail-item">
      <div class="detail-label">집중도</div>
      <div class="detail-value">${data.engagement}%</div>
      <div class="detail-bar">
        <div class="detail-fill" style="width: ${data.engagement}%"></div>
      </div>
    </div>
  `;
}

function autoSelectEmotion(emotionType, intensity) {
  // 감정 라디오 버튼 자동 선택
  const emotionInputs = document.querySelectorAll('input[name="emotion"]');
  emotionInputs.forEach(input => {
    if (input.value === emotionType) {
      input.checked = true;
      input.parentElement.classList.add('selected');
    } else {
      input.parentElement.classList.remove('selected');
    }
  });
  
  // 강도 슬라이더 자동 설정
  const intensitySlider = document.getElementById('self-intensity');
  const intensityValue = document.getElementById('intensity-value');
  if (intensitySlider && intensityValue) {
    intensitySlider.value = intensity;
    intensityValue.textContent = intensity;
  }
  
  // 메모 자동 추가
  const notesTextarea = document.getElementById('self-notes');
  if (notesTextarea) {
    notesTextarea.value = `AI 얼굴 인식 자동 체크인 - ${new Date().toLocaleString('ko-KR')}`;
  }
}

// 데이터 수집 뷰 로드 시 얼굴 인식 초기화
const originalLoadDataCollectionView2 = loadDataCollectionView;
loadDataCollectionView = async function() {
  await originalLoadDataCollectionView2();
  setupFacialCheckin();
};

// 페이지 언로드 시 카메라 스트림 정리
window.addEventListener('beforeunload', () => {
  if (selfCameraStream) {
    selfCameraStream.getTracks().forEach(track => track.stop());
  }
});


// ============================================
// 라이브 프리뷰 & 테스트 시스템
// ============================================

function setupLivePreview() {
  // CSS 라이브 테스트
  const bgColorInput = document.getElementById('live-bg-color');
  const textColorInput = document.getElementById('live-text-color');
  const accentColorInput = document.getElementById('live-accent-color');
  const fontSizeInput = document.getElementById('live-font-size');
  const borderRadiusInput = document.getElementById('live-border-radius');
  const previewBox = document.getElementById('css-preview-box');
  
  if (bgColorInput && previewBox) {
    bgColorInput.addEventListener('input', (e) => {
      previewBox.style.background = e.target.value;
    });
    
    textColorInput.addEventListener('input', (e) => {
      previewBox.style.color = e.target.value;
    });
    
    accentColorInput.addEventListener('input', (e) => {
      const btn = previewBox.querySelector('.btn');
      if (btn) btn.style.background = e.target.value;
    });
    
    fontSizeInput.addEventListener('input', (e) => {
      previewBox.style.fontSize = e.target.value + 'px';
      document.getElementById('font-size-value').textContent = e.target.value + 'px';
    });
    
    borderRadiusInput.addEventListener('input', (e) => {
      previewBox.style.borderRadius = e.target.value + 'px';
      document.getElementById('border-radius-value').textContent = e.target.value + 'px';
    });
  }
  
  // CSS 초기화
  const resetCssBtn = document.getElementById('reset-css');
  if (resetCssBtn) {
    resetCssBtn.addEventListener('click', () => {
      bgColorInput.value = '#1a1c2e';
      textColorInput.value = '#e0e1dd';
      accentColorInput.value = '#4f86ff';
      fontSizeInput.value = 16;
      borderRadiusInput.value = 12;
      
      previewBox.style.background = '#1a1c2e';
      previewBox.style.color = '#e0e1dd';
      previewBox.style.fontSize = '16px';
      previewBox.style.borderRadius = '12px';
      
      const btn = previewBox.querySelector('.btn');
      if (btn) btn.style.background = '#4f86ff';
      
      document.getElementById('font-size-value').textContent = '16px';
      document.getElementById('border-radius-value').textContent = '12px';
      
      showNotification('CSS 설정이 초기화되었습니다', 'info');
    });
  }
  
  // HTML 라이브 렌더링
  const htmlInput = document.getElementById('live-html-input');
  const applyHtmlBtn = document.getElementById('apply-html');
  const htmlPreview = document.getElementById('html-preview-box');
  
  if (applyHtmlBtn && htmlInput && htmlPreview) {
    const renderHTML = () => {
      try {
        htmlPreview.innerHTML = htmlInput.value;
        showNotification('HTML이 적용되었습니다', 'success');
      } catch (error) {
        showNotification('HTML 렌더링 실패: ' + error.message, 'error');
      }
    };
    
    applyHtmlBtn.addEventListener('click', renderHTML);
    
    // 초기 렌더링
    renderHTML();
    
    // 실시간 렌더링 (타이핑 중)
    htmlInput.addEventListener('input', renderHTML);
  }
  
  // JavaScript 실행
  const jsInput = document.getElementById('live-js-input');
  const runJsBtn = document.getElementById('run-js');
  const jsResult = document.getElementById('js-result');
  
  if (runJsBtn && jsInput && jsResult) {
    runJsBtn.addEventListener('click', () => {
      try {
        jsResult.style.color = '#06d6a0';
        
        // 콘솔 로그 캡처
        const logs = [];
        const originalLog = console.log;
        console.log = function(...args) {
          logs.push(args.join(' '));
          originalLog.apply(console, args);
        };
        
        // 코드 실행
        const func = new Function(jsInput.value);
        const result = func();
        
        // 콘솔 복원
        console.log = originalLog;
        
        // 결과 표시
        let output = '';
        if (logs.length > 0) {
          output += '📋 Console 출력:\n' + logs.join('\n') + '\n\n';
        }
        if (result !== undefined) {
          output += '✅ 반환 값:\n' + result;
        }
        if (output === '') {
          output = '✅ 코드가 성공적으로 실행되었습니다';
        }
        
        jsResult.textContent = output;
        
      } catch (error) {
        jsResult.style.color = '#e63946';
        jsResult.textContent = '❌ 에러:\n' + error.message;
      }
    });
  }
}

// ============================================
// 기능 테스트 시스템
// ============================================

function setupFunctionTests() {
  // 감정 로그 추가 테스트
  const testAddEmotion = document.getElementById('test-add-emotion');
  if (testAddEmotion) {
    testAddEmotion.addEventListener('click', async () => {
      const result = document.getElementById('data-test-result');
      result.classList.add('show', 'success');
      result.textContent = '⏳ 감정 로그 생성 중...';
      
      try {
        const workers = await window.api.invoke('get-workers');
        if (workers.length === 0) {
          throw new Error('워커가 없습니다');
        }
        
        const randomWorker = workers[Math.floor(Math.random() * workers.length)];
        const emotions = ['긍정적', '만족', '중립적', '피로', '스트레스', '부정적'];
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        const randomIntensity = Math.floor(Math.random() * 10) + 1;
        
        await window.api.invoke('add-emotion-log', {
          workerId: randomWorker.id,
          emotionType: randomEmotion,
          intensity: randomIntensity,
          notes: '테스트 로그 - ' + new Date().toLocaleTimeString('ko-KR'),
          timestamp: new Date().toISOString()
        });
        
        result.textContent = `✅ 감정 로그 추가 완료\n워커: ${randomWorker.name}\n감정: ${randomEmotion}\n강도: ${randomIntensity}/10`;
        showNotification('감정 로그가 추가되었습니다', 'success');
        
      } catch (error) {
        result.classList.remove('success');
        result.classList.add('error');
        result.textContent = '❌ 실패: ' + error.message;
      }
    });
  }
  
  // 카메라 테스트
  const testCamera = document.getElementById('test-camera');
  if (testCamera) {
    testCamera.addEventListener('click', async () => {
      const result = document.getElementById('camera-test-result');
      result.classList.add('show');
      result.textContent = '⏳ 카메라 권한 확인 중...';
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        
        result.classList.add('success');
        result.textContent = '✅ 카메라 접근 가능\n권한이 허용되었습니다';
        showNotification('카메라 권한이 확인되었습니다', 'success');
        
      } catch (error) {
        result.classList.add('error');
        result.textContent = '❌ 카메라 접근 실패\n' + error.message;
        showNotification('카메라 권한을 확인하세요', 'error');
      }
    });
  }
  
  // 차트 테스트
  const testChart = document.getElementById('test-chart');
  if (testChart) {
    testChart.addEventListener('click', () => {
      const canvas = document.getElementById('test-chart-canvas');
      canvas.style.display = 'block';
      
      if (canvas.chart) {
        canvas.chart.destroy();
      }
      
      const ctx = canvas.getContext('2d');
      canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['월', '화', '수', '목', '금'],
          datasets: [{
            label: '테스트 데이터',
            data: [65, 59, 80, 81, 56],
            borderColor: '#4f86ff',
            backgroundColor: 'rgba(79, 134, 255, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#e0e1dd' } }
          },
          scales: {
            y: { ticks: { color: '#8e9aaf' }, grid: { color: '#3a3d5a' } },
            x: { ticks: { color: '#8e9aaf' }, grid: { color: '#3a3d5a' } }
          }
        }
      });
      
      showNotification('차트가 생성되었습니다', 'success');
    });
  }
  
  // 성능 테스트
  const testPerformance = document.getElementById('test-performance');
  if (testPerformance) {
    testPerformance.addEventListener('click', () => {
      const result = document.getElementById('performance-test-result');
      result.classList.add('show', 'success');
      
      const startTime = performance.now();
      
      // 무거운 작업 시뮬레이션
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
      }
      
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      result.textContent = `✅ 성능 테스트 완료\n실행 시간: ${duration}ms\n계산 결과: ${sum.toFixed(2)}`;
      showNotification(`성능 테스트 완료 (${duration}ms)`, 'success');
    });
  }
  
  // API 테스트
  const testApi = document.getElementById('test-api');
  if (testApi) {
    testApi.addEventListener('click', async () => {
      const result = document.getElementById('api-test-result');
      result.classList.add('show', 'success');
      result.textContent = '⏳ API 테스트 중...';
      
      const tests = [];
      
      try {
        // 1. 워커 목록
        const workers = await window.api.invoke('get-workers');
        tests.push(`✅ get-workers: ${workers.length}명`);
        
        // 2. 대시보드 통계
        const stats = await window.api.invoke('get-dashboard-stats');
        tests.push(`✅ get-dashboard-stats: OK`);
        
        // 3. 알림 목록
        const alerts = await window.api.invoke('get-risk-alerts', 'all');
        tests.push(`✅ get-risk-alerts: ${alerts.length}건`);
        
        // 4. 상담사 목록
        const counselors = await window.api.invoke('get-counselors');
        tests.push(`✅ get-counselors: ${counselors.length}명`);
        
        result.textContent = '✅ 모든 API 테스트 통과\n\n' + tests.join('\n');
        showNotification('API 테스트가 완료되었습니다', 'success');
        
      } catch (error) {
        result.classList.remove('success');
        result.classList.add('error');
        result.textContent = '❌ API 테스트 실패\n' + error.message;
      }
    });
  }
}

// 미리보기 뷰 로드 시 초기화
const originalLoadPreviewView = loadPreviewView;
loadPreviewView = function() {
  originalLoadPreviewView();
  setupLivePreview();
  setupFunctionTests();
};


// ===========================
// 실시간 모니터링 기능
// ===========================

let realtimeMonitor = {
  isActive: false,
  isPaused: false,
  startTime: Date.now(),
  stats: {
    totalLogs: 0,
    activeAlerts: 0,
    totalWorkers: 0,
    sessions: 0
  },
  previousStats: {},
  apiCallCount: 0,
  responseTimes: [],
  updateInterval: null,
  trendChart: null,
  trendData: {
    labels: [],
    logs: [],
    alerts: []
  }
};

// 실시간 모니터 초기화
function setupRealtimeMonitor() {
  const realtimeContent = document.getElementById('realtime-preview');
  if (!realtimeContent) return;
  
  // 초기 데이터 로드
  loadRealtimeStats();
  
  // 실시간 차트 초기화
  initRealtimeTrendChart();
  
  // 이벤트 리스너 설정
  setupRealtimeEventListeners();
  
  // 자동 업데이트 시작
  startRealtimeMonitoring();
  
  addRealtimeLog('시스템이 초기화되었습니다', 'success');
}

// 실시간 통계 로드
async function loadRealtimeStats() {
  try {
    const startTime = performance.now();
    
    // 병렬로 모든 데이터 가져오기
    const [workers, logs, alerts, sessions] = await Promise.all([
      window.api.invoke('get-active-workers'),
      window.api.invoke('get-recent-emotion-logs', 100),
      window.api.invoke('get-risk-alerts'),
      window.api.invoke('get-counseling-sessions')
    ]);
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    // 이전 값 저장
    realtimeMonitor.previousStats = { ...realtimeMonitor.stats };
    
    // 새 값 설정
    realtimeMonitor.stats = {
      totalLogs: logs.length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      totalWorkers: workers.length,
      sessions: sessions.length
    };
    
    // API 호출 통계 업데이트
    realtimeMonitor.apiCallCount += 4;
    realtimeMonitor.responseTimes.push(responseTime);
    if (realtimeMonitor.responseTimes.length > 20) {
      realtimeMonitor.responseTimes.shift();
    }
    
    // UI 업데이트
    updateRealtimeUI();
    updateRealtimeChart();
    
    // 변경사항이 있으면 로그 추가
    checkForChanges();
    
  } catch (error) {
    console.error('실시간 통계 로드 실패:', error);
    addRealtimeLog('데이터 로드 중 오류 발생', 'error');
  }
}

// 실시간 UI 업데이트
function updateRealtimeUI() {
  const stats = realtimeMonitor.stats;
  const prev = realtimeMonitor.previousStats;
  
  // 값 업데이트
  updateStatValue('rt-total-logs', stats.totalLogs, prev.totalLogs);
  updateStatValue('rt-active-alerts', stats.activeAlerts, prev.activeAlerts);
  updateStatValue('rt-total-workers', stats.totalWorkers, prev.totalWorkers);
  updateStatValue('rt-sessions', stats.sessions, prev.sessions);
  
  // 성능 지표 업데이트
  const avgResponse = realtimeMonitor.responseTimes.length > 0
    ? Math.round(realtimeMonitor.responseTimes.reduce((a, b) => a + b, 0) / realtimeMonitor.responseTimes.length)
    : 0;
  
  document.getElementById('rt-avg-response').textContent = `${avgResponse} ms`;
  document.getElementById('rt-api-calls').textContent = realtimeMonitor.apiCallCount;
  
  // 메모리 사용량 (근사치)
  if (performance.memory) {
    const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
    document.getElementById('rt-memory-usage').textContent = `${memoryMB} MB`;
  }
  
  // 업타임
  const uptime = Math.floor((Date.now() - realtimeMonitor.startTime) / 1000);
  document.getElementById('rt-uptime').textContent = formatUptime(uptime);
  
  // 마지막 업데이트 시간
  document.getElementById('realtime-last-update').textContent = '방금 전';
}

// 통계 값 업데이트 및 변화 표시
function updateStatValue(elementId, newValue, oldValue) {
  const valueElement = document.getElementById(elementId);
  const changeElement = document.getElementById(`${elementId.replace('rt-', 'rt-')}-change`);
  
  if (!valueElement || !changeElement) return;
  
  // 애니메이션과 함께 값 업데이트
  valueElement.style.transform = 'scale(1.1)';
  valueElement.textContent = newValue;
  
  setTimeout(() => {
    valueElement.style.transform = 'scale(1)';
  }, 200);
  
  // 변화량 계산
  const diff = newValue - (oldValue || 0);
  
  if (diff > 0) {
    changeElement.textContent = `▲ +${diff}`;
    changeElement.classList.remove('negative');
    changeElement.style.color = '#6ec576';
  } else if (diff < 0) {
    changeElement.textContent = `▼ ${diff}`;
    changeElement.classList.add('negative');
    changeElement.style.color = '#ff6b6b';
  } else {
    changeElement.textContent = '변화 없음';
    changeElement.classList.remove('negative');
    changeElement.style.color = '#8e9aaf';
  }
}

// 실시간 차트 초기화
function initRealtimeTrendChart() {
  const canvas = document.getElementById('realtime-trend-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  realtimeMonitor.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '감정 로그',
          data: [],
          borderColor: '#4f86ff',
          backgroundColor: 'rgba(79, 134, 255, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: '활성 알림',
          data: [],
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#e0e1dd' }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#8e9aaf' },
          grid: { color: '#3a3d5a' }
        },
        x: {
          ticks: { color: '#8e9aaf' },
          grid: { color: '#3a3d5a' }
        }
      },
      animation: {
        duration: 500
      }
    }
  });
}

// 실시간 차트 업데이트
function updateRealtimeChart() {
  if (!realtimeMonitor.trendChart) return;
  
  const now = new Date();
  const timeLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  // 데이터 추가
  realtimeMonitor.trendData.labels.push(timeLabel);
  realtimeMonitor.trendData.logs.push(realtimeMonitor.stats.totalLogs);
  realtimeMonitor.trendData.alerts.push(realtimeMonitor.stats.activeAlerts);
  
  // 최대 20개 데이터 포인트 유지
  if (realtimeMonitor.trendData.labels.length > 20) {
    realtimeMonitor.trendData.labels.shift();
    realtimeMonitor.trendData.logs.shift();
    realtimeMonitor.trendData.alerts.shift();
  }
  
  // 차트 업데이트
  realtimeMonitor.trendChart.data.labels = realtimeMonitor.trendData.labels;
  realtimeMonitor.trendChart.data.datasets[0].data = realtimeMonitor.trendData.logs;
  realtimeMonitor.trendChart.data.datasets[1].data = realtimeMonitor.trendData.alerts;
  realtimeMonitor.trendChart.update('none'); // 애니메이션 없이 업데이트
}

// 변경사항 확인 및 로그 추가
function checkForChanges() {
  const stats = realtimeMonitor.stats;
  const prev = realtimeMonitor.previousStats;
  
  if (stats.totalLogs > (prev.totalLogs || 0)) {
    addRealtimeLog(`새로운 감정 로그 ${stats.totalLogs - prev.totalLogs}건 추가됨`, 'success');
  }
  
  if (stats.activeAlerts > (prev.activeAlerts || 0)) {
    addRealtimeLog(`새로운 리스크 알림 ${stats.activeAlerts - prev.activeAlerts}건 생성됨`, 'warning');
  }
  
  if (stats.totalWorkers > (prev.totalWorkers || 0)) {
    addRealtimeLog(`케어 인력 ${stats.totalWorkers - prev.totalWorkers}명 추가됨`, 'info');
  }
  
  if (stats.sessions > (prev.sessions || 0)) {
    addRealtimeLog(`상담 세션 ${stats.sessions - prev.sessions}건 생성됨`, 'info');
  }
}

// 실시간 로그 추가
function addRealtimeLog(message, type = 'info') {
  if (realtimeMonitor.isPaused) return;
  
  const logContainer = document.getElementById('realtime-activity-log');
  if (!logContainer) return;
  
  const now = new Date();
  const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  const logItem = document.createElement('div');
  logItem.className = `activity-item ${type}`;
  logItem.innerHTML = `
    <span class="activity-time">${timeStr}</span>
    <span class="activity-icon">${icons[type]}</span>
    <span class="activity-message">${message}</span>
  `;
  
  // 맨 위에 추가
  logContainer.insertBefore(logItem, logContainer.firstChild);
  
  // 최대 50개 로그 유지
  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// 실시간 모니터링 시작
function startRealtimeMonitoring() {
  if (realtimeMonitor.isActive) return;
  
  realtimeMonitor.isActive = true;
  realtimeMonitor.startTime = Date.now();
  
  // 3초마다 업데이트
  realtimeMonitor.updateInterval = setInterval(() => {
    if (!realtimeMonitor.isPaused) {
      loadRealtimeStats();
    }
  }, 3000);
  
  addRealtimeLog('실시간 모니터링이 시작되었습니다', 'success');
}

// 실시간 모니터링 중지
function stopRealtimeMonitoring() {
  if (!realtimeMonitor.isActive) return;
  
  realtimeMonitor.isActive = false;
  
  if (realtimeMonitor.updateInterval) {
    clearInterval(realtimeMonitor.updateInterval);
    realtimeMonitor.updateInterval = null;
  }
  
  addRealtimeLog('실시간 모니터링이 중지되었습니다', 'warning');
}

// 이벤트 리스너 설정
function setupRealtimeEventListeners() {
  // 로그 지우기
  const clearLogBtn = document.getElementById('rt-clear-log');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      const logContainer = document.getElementById('realtime-activity-log');
      logContainer.innerHTML = '';
      addRealtimeLog('로그가 초기화되었습니다', 'info');
    });
  }
  
  // 일시정지/재개
  const pauseLogBtn = document.getElementById('rt-pause-log');
  if (pauseLogBtn) {
    pauseLogBtn.addEventListener('click', () => {
      realtimeMonitor.isPaused = !realtimeMonitor.isPaused;
      
      if (realtimeMonitor.isPaused) {
        pauseLogBtn.textContent = '재개';
        pauseLogBtn.classList.remove('btn-primary');
        pauseLogBtn.classList.add('btn-success');
        addRealtimeLog('로그 기록이 일시정지되었습니다', 'warning');
      } else {
        pauseLogBtn.textContent = '일시정지';
        pauseLogBtn.classList.remove('btn-success');
        pauseLogBtn.classList.add('btn-primary');
        addRealtimeLog('로그 기록이 재개되었습니다', 'success');
      }
    });
  }
  
  // 빠른 액션 버튼들
  setupQuickActionButtons();
}

// 빠른 액션 버튼 설정
function setupQuickActionButtons() {
  // 감정 로그 추가
  const addLogBtn = document.getElementById('rt-add-log');
  if (addLogBtn) {
    addLogBtn.addEventListener('click', async () => {
      const emotions = ['neutral', 'tired', 'stress', 'negative', 'positive'];
      const emotion = emotions[Math.floor(Math.random() * emotions.length)];
      const intensity = Math.floor(Math.random() * 10) + 1;
      
      try {
        await window.api.invoke('add-emotion-log', {
          workerId: 1,
          emotion: emotion,
          intensity: intensity,
          notes: `실시간 테스트 로그 (${new Date().toLocaleTimeString('ko-KR')})`
        });
        
        addRealtimeLog(`감정 로그가 추가되었습니다 (${emotion}, 강도: ${intensity})`, 'success');
        showNotification('감정 로그가 추가되었습니다', 'success');
        
        // 즉시 업데이트
        setTimeout(() => loadRealtimeStats(), 500);
        
      } catch (error) {
        addRealtimeLog('감정 로그 추가 실패', 'error');
      }
    });
  }
  
  // 알림 생성
  const createAlertBtn = document.getElementById('rt-create-alert');
  if (createAlertBtn) {
    createAlertBtn.addEventListener('click', () => {
      addRealtimeLog('리스크 알림 생성 요청 (데모)', 'warning');
      showNotification('알림 생성 기능은 데모 모드입니다', 'info');
    });
  }
  
  // 인력 추가
  const addWorkerBtn = document.getElementById('rt-add-worker');
  if (addWorkerBtn) {
    addWorkerBtn.addEventListener('click', () => {
      addRealtimeLog('케어 인력 추가 요청 (데모)', 'info');
      showNotification('인력 추가 기능은 데모 모드입니다', 'info');
    });
  }
  
  // 데이터 새로고침
  const refreshBtn = document.getElementById('rt-refresh-data');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      addRealtimeLog('수동 데이터 새로고침 시작...', 'info');
      await loadRealtimeStats();
      showNotification('데이터가 새로고침되었습니다', 'success');
    });
  }
}

// 업타임 포맷팅
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else if (minutes > 0) {
    return `${minutes}분 ${secs}초`;
  } else {
    return `${secs}초`;
  }
}

// 미리보기 뷰 로더 확장
const originalLoadPreviewView = window.loadPreviewView;
window.loadPreviewView = function() {
  if (originalLoadPreviewView) {
    originalLoadPreviewView();
  }
  
  // 실시간 모니터 초기화
  setTimeout(() => {
    setupRealtimeMonitor();
  }, 500);
};


// ============================================
// 스크린샷 풀스크린 기능
// ============================================

function viewFullscreen(imgElement) {
  // 풀스크린 모달 생성
  const modal = document.createElement('div');
  modal.className = 'fullscreen-modal active';
  
  const img = document.createElement('img');
  img.src = imgElement.src;
  img.alt = imgElement.alt;
  img.className = 'fullscreen-image';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'fullscreen-close';
  closeBtn.innerHTML = '✕';
  closeBtn.onclick = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  };
  
  modal.appendChild(img);
  modal.appendChild(closeBtn);
  document.body.appendChild(modal);
  
  // ESC 키로 닫기
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeBtn.click();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
  
  // 모달 배경 클릭으로 닫기
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeBtn.click();
    }
  });
}

// 전역 함수로 노출 (HTML에서 직접 호출)
window.viewFullscreen = viewFullscreen;


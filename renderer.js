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
  }
}

// 대시보드 로드
async function loadDashboard() {
  try {
    // 통계 데이터 가져오기
    const stats = await ipcRenderer.invoke('get-dashboard-stats');
    workers = await ipcRenderer.invoke('get-workers');
    alerts = await ipcRenderer.invoke('get-risk-alerts', 'pending');
    
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


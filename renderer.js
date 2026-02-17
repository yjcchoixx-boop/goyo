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
      await loadWorkers();
      break;
    case 'analytics':
      // 이미 정적 콘텐츠로 표시됨
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
    document.getElementById('high-risk-count').textContent = stats.highRiskAlerts;
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

// 감정 트렌드 차트
async function drawEmotionTrendChart() {
  const ctx = document.getElementById('emotion-trend-chart');
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
    alerts = await ipcRenderer.invoke('get-risk-alerts', 'pending');
    const container = document.getElementById('alerts-container');
    
    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #8e9aaf;">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <div style="font-size: 18px;">현재 활성화된 리스크 알림이 없습니다.</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = alerts.map(alert => {
      return `
        <div class="alert-card">
          <div class="alert-header">
            <div>
              <div class="alert-title">⚠️ 긴급 번아웃 리스크 감지</div>
              <div class="alert-worker">${alert.name} (${alert.role})</div>
            </div>
            <div class="alert-meta">
              <div>${alert.team}</div>
              <div>${formatDateTime(alert.alert_date)}</div>
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
              방치 시 서비스 품질 저하 및 이직 가능성이 높습니다.
            </div>
          </div>
          
          <div class="alert-actions">
            <button class="btn btn-primary" onclick="showInterventions(${alert.id}, '${alert.name}')">
              💡 개입 방안 보기
            </button>
            <button class="btn btn-secondary" onclick="showWorkerDetail(${alert.worker_id})">
              📊 상세 분석
            </button>
          </div>
        </div>
      `;
    }).join('');
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

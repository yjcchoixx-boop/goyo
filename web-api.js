// 웹 브라우저용 API 어댑터
// Electron의 window.api를 REST API 호출로 대체

const API_BASE_URL = window.location.origin;

// Electron API 시뮬레이션
window.api = {
  invoke: async function(channel, ...args) {
    const apiMap = {
      // 케어 워커 API
      'get-active-workers': () => fetch(`${API_BASE_URL}/api/active-workers`).then(r => r.json()),
      'get-workers': () => fetch(`${API_BASE_URL}/api/active-workers`).then(r => r.json()),
      'get-worker-details': (id) => fetch(`${API_BASE_URL}/api/worker/${id}`).then(r => r.json()),
      
      // 감정 로그 API
      'get-recent-emotion-logs': (limit) => fetch(`${API_BASE_URL}/api/emotion-logs?limit=${limit || 100}`).then(r => r.json()),
      'add-emotion-log': (data) => fetch(`${API_BASE_URL}/api/emotion-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json()),
      
      // 리스크 알림 API
      'get-risk-alerts': (status) => {
        const url = status ? `${API_BASE_URL}/api/risk-alerts?status=${status}` : `${API_BASE_URL}/api/risk-alerts`;
        return fetch(url).then(r => r.json());
      },
      
      // 상담 API
      'get-counseling-sessions': () => fetch(`${API_BASE_URL}/api/counseling-sessions`).then(r => r.json()),
      'get-counseling-history': (workerId) => {
        // 임시: 세션 데이터를 히스토리로 사용
        return fetch(`${API_BASE_URL}/api/counseling-sessions`).then(r => r.json());
      },
      'get-counseling-stats': () => {
        // 임시: 기본 통계 반환
        return fetch(`${API_BASE_URL}/api/statistics`).then(r => r.json());
      },
      'get-counselors': () => fetch(`${API_BASE_URL}/api/counselors`).then(r => r.json()),
      'add-counselor': (data) => {
        console.log('add-counselor called (not implemented)', data);
        return Promise.resolve({ success: true, message: 'API not implemented in web mode' });
      },
      'update-counselor': (data) => {
        console.log('update-counselor called (not implemented)', data);
        return Promise.resolve({ success: true, message: 'API not implemented in web mode' });
      },
      'update-session-status': (data) => {
        console.log('update-session-status called (not implemented)', data);
        return Promise.resolve({ success: true, message: 'API not implemented in web mode' });
      },
      'add-counseling-history': (data) => {
        console.log('add-counseling-history called (not implemented)', data);
        return Promise.resolve({ success: true, message: 'API not implemented in web mode' });
      },
      
      // 통계 API
      'get-statistics': () => fetch(`${API_BASE_URL}/api/statistics`).then(r => r.json()),
      'get-dashboard-stats': () => fetch(`${API_BASE_URL}/api/dashboard-stats`).then(r => r.json()),
    };
    
    const handler = apiMap[channel];
    if (handler) {
      try {
        return await handler(...args);
      } catch (error) {
        console.error(`API 호출 실패 (${channel}):`, error);
        throw error;
      }
    } else {
      console.warn(`구현되지 않은 API: ${channel}`, args);
      // 기본 빈 응답 반환
      return [];
    }
  }
};

// 웹 환경 표시
console.log('🌐 웹 브라우저 모드로 실행 중');
console.log('📡 API Base URL:', API_BASE_URL);
console.log('✅ window.api 준비 완료');

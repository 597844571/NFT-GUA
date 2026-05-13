const API_BASE = '';

// WebSocket 连接
let ws = null;
const listeners = { log: [], status: [], monitor: [] };

function connectWS() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
  ws.onmessage = (event) => {
    try {
      const { type, data } = JSON.parse(event.data);
      if (listeners[type]) listeners[type].forEach((cb) => cb(data));
    } catch {}
  };
  ws.onclose = () => setTimeout(connectWS, 3000);
}
connectWS();

function on(type, callback) {
  listeners[type].push(callback);
  return () => {
    listeners[type] = listeners[type].filter((cb) => cb !== callback);
  };
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json();
}

export const api = {
  // 引擎
  startEngine: (config) => post('/api/engine/start', config),
  stopEngine: () => post('/api/engine/stop', {}),
  pauseEngine: () => post('/api/engine/pause', {}),
  resumeEngine: () => post('/api/engine/resume', {}),
  getEngineStatus: () => get('/api/engine/status'),

  // 任务
  runTask: (taskId) => post('/api/task/run', { taskId }),

  // 监控
  monitorAdd: (item) => post('/api/monitor/add', item),
  monitorRemove: (id) => post('/api/monitor/remove', { id }),
  monitorToggle: (id) => post('/api/monitor/toggle', { id }),
  buyNow: (monitorId) => post('/api/monitor/buyNow', { monitorId }),

  // 日志
  getLogs: () => get('/api/logs'),
  clearLogs: () => post('/api/logs/clear', {}),

  // 通知
  testNotify: (config) => post('/api/notify/test', config),

  // 扫描
  scanPage: (url, pageType) => post('/api/scanner/scan', { url, pageType }),

  // 文件
  exportConfig: (data) => post('/api/fs/exportConfig', data),
  importConfig: () => post('/api/fs/importConfig', {}),
  exportExcel: (data) => post('/api/fs/exportExcel', data),
  importExcel: () => post('/api/fs/importExcel', {}),

  // WebSocket 监听
  onLog: (cb) => on('log', cb),
  onEngineStatus: (cb) => on('status', cb),
  onMonitorUpdate: (cb) => on('monitor', cb),
  removeAllListeners: (type) => { listeners[type] = []; },
};

export default api;

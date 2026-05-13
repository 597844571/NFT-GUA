const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给前端
contextBridge.exposeInMainWorld('electronAPI', {
  // 引擎控制
  startEngine: (config) => ipcRenderer.invoke('engine:start', config),
  stopEngine: () => ipcRenderer.invoke('engine:stop'),
  pauseEngine: () => ipcRenderer.invoke('engine:pause'),
  resumeEngine: () => ipcRenderer.invoke('engine:resume'),

  // 任务操作
  runTask: (taskId) => ipcRenderer.invoke('task:run', taskId),
  monitorAdd: (item) => ipcRenderer.invoke('monitor:add', item),
  monitorRemove: (id) => ipcRenderer.invoke('monitor:remove', id),
  monitorToggle: (id) => ipcRenderer.invoke('monitor:toggle', id),
  buyNow: (monitorId) => ipcRenderer.invoke('monitor:buyNow', monitorId),

  // 状态查询
  getEngineStatus: () => ipcRenderer.invoke('engine:status'),
  getLogs: () => ipcRenderer.invoke('logs:get'),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),

  // 监听推送
  onLog: (callback) => ipcRenderer.on('push:log', (_event, value) => callback(value)),
  onMonitorUpdate: (callback) => ipcRenderer.on('push:monitor', (_event, value) => callback(value)),
  onEngineStatus: (callback) => ipcRenderer.on('push:status', (_event, value) => callback(value)),

  // 移除监听（避免内存泄漏）
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // 通知测试
  testNotify: (config) => ipcRenderer.invoke('notify:test', config),

  // 文件系统
  exportConfig: (data) => ipcRenderer.invoke('fs:exportConfig', data),
  importConfig: () => ipcRenderer.invoke('fs:importConfig'),
  exportExcel: (data) => ipcRenderer.invoke('fs:exportExcel', data),
  importExcel: () => ipcRenderer.invoke('fs:importExcel'),
});

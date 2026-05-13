const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const Engine = require('./src/main/engine');
const Logger = require('./src/main/logger');

let mainWindow = null;
let engine = null;
let logger = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'DC AutoBot',
    webPreferences: {
      preload: path.join(__dirname, 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
    backgroundColor: '#070911',
  });

  // 加载页面
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(devUrl).catch(() => {
      // 如果 dev server 还没启动，等 1 秒重试
      setTimeout(() => mainWindow.loadURL(devUrl), 1000);
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (engine) {
      engine.stop().catch(() => {});
      engine = null;
    }
  });
}

app.whenReady().then(() => {
  // 启动本地 HTTP 服务（供浏览器访问）
  const server = express();
  server.use(express.json());
  server.use(express.static(path.join(__dirname, 'dist')));
  server.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  server.listen(8765, () => {
    console.log('DC AutoBot Web Server running at http://localhost:8765');
  });

  logger = new Logger((logEntry) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('push:log', logEntry);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (engine) {
    engine.stop().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    if (process.platform !== 'darwin') app.quit();
  }
});

// ===== IPC 处理器 =====

ipcMain.handle('engine:start', async (_event, config) => {
  try {
    if (engine) await engine.stop();
    engine = new Engine(config, logger, (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('push:status', status);
      }
    }, (monitorState) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('push:monitor', monitorState);
      }
    });
    await engine.start();
    return { success: true };
  } catch (err) {
    logger.error(`引擎启动失败: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('engine:stop', async () => {
  if (!engine) return { success: true };
  try {
    await engine.stop();
    engine = null;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('engine:pause', async () => {
  if (!engine) return { success: false, error: '引擎未启动' };
  engine.pause();
  return { success: true };
});

ipcMain.handle('engine:resume', async () => {
  if (!engine) return { success: false, error: '引擎未启动' };
  engine.resume();
  return { success: true };
});

ipcMain.handle('engine:status', () => {
  return engine ? engine.getStatus() : { status: 'stopped' };
});

ipcMain.handle('task:run', async (_event, taskId) => {
  if (!engine) return { success: false, error: '引擎未启动' };
  try {
    await engine.runTaskNow(taskId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 监控中心 IPC
ipcMain.handle('monitor:add', (_event, item) => {
  if (!engine) return { success: false, error: '引擎未启动' };
  engine.addMonitor(item);
  return { success: true };
});

ipcMain.handle('monitor:remove', (_event, id) => {
  if (!engine) return { success: false, error: '引擎未启动' };
  engine.removeMonitor(id);
  return { success: true };
});

ipcMain.handle('monitor:toggle', (_event, id) => {
  if (!engine) return { success: false, error: '引擎未启动' };
  engine.toggleMonitor(id);
  return { success: true };
});

ipcMain.handle('monitor:buyNow', async (_event, monitorId) => {
  if (!engine) return { success: false, error: '引擎未启动' };
  try {
    await engine.buyNow(monitorId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 日志 IPC
ipcMain.handle('logs:get', () => {
  return logger ? logger.getLogs() : [];
});

ipcMain.handle('logs:clear', () => {
  if (logger) logger.clear();
  return { success: true };
});

// 通知测试 IPC
ipcMain.handle('notify:test', async (_event, config) => {
  const Notifier = require('./src/main/notifier');
  const notifier = new Notifier(config);
  try {
    const results = await notifier.send('DC AutoBot 测试消息', '这是一条测试推送，如果你收到，说明配置正确 ✅');
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 文件系统 IPC
ipcMain.handle('fs:exportConfig', async (_event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `autobot-config-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('fs:importConfig', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { success: true, data: JSON.parse(content) };
  }
  return { success: false };
});

ipcMain.handle('fs:exportExcel', async (_event, { accounts }) => {
  const XLSX = require('xlsx');
  const ws = XLSX.utils.json_to_sheet(accounts);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `accounts-${Date.now()}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (!result.canceled && result.filePath) {
    XLSX.writeFile(wb, result.filePath);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('fs:importExcel', async () => {
  const XLSX = require('xlsx');
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Excel/CSV', extensions: ['xlsx', 'xls', 'csv'] }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const wb = XLSX.readFile(result.filePaths[0]);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    return { success: true, data };
  }
  return { success: false };
});

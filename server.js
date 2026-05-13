const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const Engine = require('./src/main/engine');
const Logger = require('./src/main/logger');
const Scanner = require('./src/main/scanner');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// 状态
let engine = null;
let logger = null;
const clients = new Set();

// WebSocket 推送
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

// CORS + JSON
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// 兜底：SPA 路由
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/ws')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

// ===== REST API =====

// 引擎控制
app.post('/api/engine/start', async (req, res) => {
  try {
    if (engine) await engine.stop();
    engine = new Engine(req.body, logger, (status) => {
      broadcast('status', status);
    }, (monitorState) => {
      broadcast('monitor', monitorState);
    });
    await engine.start();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/engine/stop', async (_req, res) => {
  if (!engine) return res.json({ success: true });
  try { await engine.stop(); engine = null; res.json({ success: true }); }
  catch (err) { res.json({ success: false, error: err.message }); }
});

app.post('/api/engine/pause', (_req, res) => {
  if (!engine) return res.json({ success: false, error: '引擎未启动' });
  engine.pause();
  res.json({ success: true });
});

app.post('/api/engine/resume', (_req, res) => {
  if (!engine) return res.json({ success: false, error: '引擎未启动' });
  engine.resume();
  res.json({ success: true });
});

app.get('/api/engine/status', (_req, res) => {
  res.json(engine ? engine.getStatus() : { status: 'stopped' });
});

// 任务
app.post('/api/task/run', async (req, res) => {
  if (!engine) return res.json({ success: false, error: '引擎未启动' });
  try { await engine.runTaskNow(req.body.taskId); res.json({ success: true }); }
  catch (err) { res.json({ success: false, error: err.message }); }
});

// 监控
app.post('/api/monitor/add', (req, res) => {
  if (!engine) return res.json({ success: false, error: '引擎未启动' });
  engine.addMonitor(req.body);
  res.json({ success: true });
});

app.post('/api/monitor/remove', (req, res) => {
  if (!engine) return res.json({ success: false, error: '引擎未启动' });
  engine.removeMonitor(req.body.id);
  res.json({ success: true });
});

app.post('/api/monitor/toggle', (req, res) => {
  if (!engine) return res.json({ success: false, error: '引擎未启动' });
  engine.toggleMonitor(req.body.id);
  res.json({ success: true });
});

app.post('/api/monitor/buyNow', async (req, res) => {
  if (!engine) return res.json({ success: false, error: '引擎未启动' });
  try { await engine.buyNow(req.body.monitorId); res.json({ success: true }); }
  catch (err) { res.json({ success: false, error: err.message }); }
});

// 日志
app.get('/api/logs', (_req, res) => {
  res.json(logger ? logger.getLogs() : []);
});

app.post('/api/logs/clear', (_req, res) => {
  if (logger) logger.clear();
  res.json({ success: true });
});

// 通知测试
app.post('/api/notify/test', async (req, res) => {
  const Notifier = require('./src/main/notifier');
  const notifier = new Notifier(req.body);
  try {
    const results = await notifier.send('DC AutoBot 测试消息', '这是一条测试推送，如果你收到，说明配置正确 ✅');
    res.json({ success: true, results });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 扫描
app.post('/api/scanner/scan', async (req, res) => {
  const scanner = new Scanner();
  try {
    const result = await scanner.scan(req.body.url, { pageType: req.body.pageType });
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 文件系统（简化版，直接返回错误或空实现）
app.post('/api/fs/exportConfig', (req, res) => {
  const filePath = path.join(require('os').tmpdir(), `autobot-config-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
  res.json({ success: true, filePath });
});

app.post('/api/fs/importConfig', (req, res) => {
  // 前端直接通过文件上传实现，这里简化
  res.json({ success: false, error: '请使用网页文件选择器' });
});

app.post('/api/fs/exportExcel', (req, res) => {
  const XLSX = require('xlsx');
  const ws = XLSX.utils.json_to_sheet(req.body.accounts || []);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
  const filePath = path.join(require('os').tmpdir(), `accounts-${Date.now()}.xlsx`);
  XLSX.writeFile(wb, filePath);
  res.json({ success: true, filePath });
});

app.post('/api/fs/importExcel', (req, res) => {
  // 前端通过文件上传实现
  res.json({ success: false, error: '请使用网页文件选择器' });
});

// 启动
const PORT = 8765;
server.listen(PORT, () => {
  console.log(`✅ DC AutoBot Web Server running at http://localhost:${PORT}`);
  console.log(`📱 打开浏览器访问上述地址即可使用`);

  // 初始化 Logger
  logger = new Logger((logEntry) => {
    broadcast('log', logEntry);
  });
});

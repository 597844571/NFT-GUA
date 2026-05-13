const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(require('os').tmpdir(), 'dc-autobot-debug.log');
function log(msg) {
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
}

log('=== main.js started ===');
log('app.isPackaged: ' + app.isPackaged);
log('__dirname: ' + __dirname);

function createWindow() {
  log('createWindow called');
  try {
    const win = new BrowserWindow({
      width: 1400,
      height: 900,
      title: 'DC AutoBot DEBUG',
      show: true,
    });
    log('BrowserWindow created, id=' + win.id);
    win.loadFile(path.join(__dirname, 'dist/index.html'));
    log('loadFile called');
    win.once('ready-to-show', () => {
      log('ready-to-show triggered');
      win.show();
    });
  } catch (err) {
    log('ERROR in createWindow: ' + err.message);
    log(err.stack);
  }
}

app.whenReady().then(() => {
  log('app.whenReady triggered');
  createWindow();
});

app.on('window-all-closed', () => {
  log('window-all-closed');
  app.quit();
});

log('main.js end');

const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Test Window',
  });
  win.loadURL('data:text/html,<html><body style="background:red"><h1>TEST WINDOW</h1></body></html>');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

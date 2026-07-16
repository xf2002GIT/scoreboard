const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 200,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('close-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

ipcMain.on('resize-window', (event, { width, height }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setContentSize(width, height);
});

ipcMain.handle('read-lineup', async (event) => {
  const fs = require('fs').promises;
  const appPath = app.getAppPath();
  const filePath = path.join(appPath, 'line-up.txt');
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (err) {
    return '';
  }
});

// Watch the line-up file and push updates to renderer
ipcMain.on('watch-lineup', (event) => {
  const fs = require('fs');
  const appPath = app.getAppPath();
  const filePath = path.join(appPath, 'line-up.txt');
  const sender = event.sender;
  // send initial contents
  fs.promises.readFile(filePath, 'utf8').then(data => {
    sender.send('lineup-changed', data);
  }).catch(() => {
    sender.send('lineup-changed', '');
  });
  // watch for changes
  try {
    fs.watchFile(filePath, { interval: 500 }, async (curr, prev) => {
      if (curr.mtimeMs <= prev.mtimeMs) return;
      try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        sender.send('lineup-changed', data);
      } catch (e) {
        sender.send('lineup-changed', '');
      }
    });
  } catch (e) {
    // ignore watch errors
  }
});

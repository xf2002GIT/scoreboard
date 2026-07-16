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

function resolveLineupPath() {
  const candidates = [
    path.resolve(__dirname, 'line-up.txt'),
    path.join(app.getAppPath(), 'line-up.txt'),
    path.join(process.cwd(), 'line-up.txt')
  ];

  return candidates.find(candidate => {
    try {
      return require('fs').existsSync(candidate);
    } catch (e) {
      return false;
    }
  }) || candidates[0];
}

ipcMain.handle('read-lineup', async (event) => {
  const fs = require('fs').promises;
  const filePath = resolveLineupPath();
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
  const filePath = resolveLineupPath();
  const sender = event.sender;

  const sendFileContent = async () => {
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      sender.send('lineup-changed', data);
    } catch (e) {
      sender.send('lineup-changed', '');
    }
  };

  sendFileContent();

  try {
    fs.watch(filePath, (eventType) => {
      if (eventType !== 'change') return;
      sendFileContent();
    });
  } catch (e) {
    // ignore watch errors
  }
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('close-window'),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height })
  ,readLineup: () => ipcRenderer.invoke('read-lineup')
  ,watchLineup: () => ipcRenderer.send('watch-lineup')
  ,onLineupChanged: (cb) => ipcRenderer.on('lineup-changed', (e, data) => cb(data))
});

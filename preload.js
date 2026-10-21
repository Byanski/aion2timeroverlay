const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setClickThrough: (enabled) => ipcRenderer.send('set-click-through', enabled),
  setAlwaysOnTop: (enabled) => ipcRenderer.send('set-always-on-top', enabled),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  setCompact: (isCompact) => ipcRenderer.send('resize-compact', isCompact),
  onGhostModeChanged: (callback) => {
    ipcRenderer.on('ghost-mode-changed', (_event, value) => callback(value));
  }
});

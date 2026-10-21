const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let isGhostMode = false;
let isAlwaysOnTop = true;

const CONFIG_FILE = path.join(app.getPath('userData'), 'aion2-overlay-settings.json');

function loadSavedBounds() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (data && data.bounds) {
        return data.bounds;
      }
    }
  } catch (err) {
    console.error('Failed to load bounds:', err);
  }
  return null;
}

function saveWindowBounds() {
  if (!mainWindow) return;
  try {
    const bounds = mainWindow.getBounds();
    let data = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch (e) {}
    }
    data.bounds = bounds;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save bounds:', err);
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const defaultWidth = 500;
  const defaultHeight = 750;
  const defaultX = Math.max(20, screenWidth - defaultWidth - 30);
  const defaultY = 40;

  let savedBounds = loadSavedBounds() || {
    x: defaultX,
    y: defaultY,
    width: defaultWidth,
    height: defaultHeight
  };

  // Ensure window is at least 480px wide to prevent text clipping
  if (savedBounds.width < 480) {
    savedBounds.width = 500;
  }
  if (savedBounds.height < 600) {
    savedBounds.height = 750;
  }

  mainWindow = new BrowserWindow({
    x: savedBounds.x,
    y: savedBounds.y,
    width: savedBounds.width,
    height: savedBounds.height,
    minWidth: 400,
    minHeight: 250,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // Keep timers accurate in background!
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.loadFile('index.html');

  mainWindow.on('moved', saveWindowBounds);
  mainWindow.on('resized', saveWindowBounds);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  registerShortcuts();
}

function registerShortcuts() {
  // Toggle Ghost Mode (Click-Through) with F10 or Ctrl+Shift+X
  const toggleGhost = () => {
    isGhostMode = !isGhostMode;
    applyGhostMode(isGhostMode);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ghost-mode-changed', isGhostMode);
    }
  };

  try {
    globalShortcut.register('F10', toggleGhost);
    globalShortcut.register('CommandOrControl+Shift+X', toggleGhost);

    // Toggle overlay visibility (Hide / Show) with Ctrl+Shift+H
    globalShortcut.register('CommandOrControl+Shift+H', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    });
  } catch (err) {
    console.warn('Failed to register global shortcut:', err);
  }
}

function applyGhostMode(ghost) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (ghost) {
    // When click-through is enabled, ignore mouse events so clicks pass straight to the game
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    // When unlocked, allow interacting with UI controls, dragging, filtering
    mainWindow.setIgnoreMouseEvents(false);
  }
}

// IPC listeners
ipcMain.on('set-click-through', (event, enable) => {
  isGhostMode = enable;
  applyGhostMode(enable);
  event.reply('ghost-mode-changed', isGhostMode);
});

ipcMain.on('set-always-on-top', (event, top) => {
  isAlwaysOnTop = top;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(top, top ? 'screen-saver' : 'normal');
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    saveWindowBounds();
    mainWindow.close();
  }
});

ipcMain.on('resize-compact', (event, isCompact) => {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  if (isCompact) {
    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: 380,
      height: 180
    });
  } else {
    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: 440,
      height: 720
    });
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  saveWindowBounds();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

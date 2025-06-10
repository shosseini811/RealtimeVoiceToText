const { app, BrowserWindow, Menu, shell, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs').promises;

/**
 * Main Electron Process - JavaScript Version
 * This file controls the app lifecycle and creates the main window
 */

let mainWindow = null;

/**
 * Create the main application window
 * This is where our React app will be displayed
 */
function createMainWindow() {
  // Create the browser window with native macOS appearance
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Native macOS title bar style
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false, // Security: Don't expose Node.js to renderer
      contextIsolation: true, // Security: Isolate context
      enableRemoteModule: false, // Security: Disable remote module
      preload: path.join(__dirname, 'preload.js'), // Secure communication bridge
    },
    vibrancy: 'under-window', // macOS translucent effect
    transparent: false,
    backgroundColor: '#1a1a2e', // Dark theme background
  });

  // Load the React app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      
      // Focus on window
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Create native macOS menu
 */
function createMenu() {
  const template = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { 
          label: 'Preferences...',
          accelerator: 'Command+,',
          click: () => {
            // Open preferences window (we'll implement this later)
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Start Recording',
          accelerator: 'Command+R',
          click: () => {
            // Send message to renderer process
            if (mainWindow) {
              mainWindow.webContents.send('menu-start-recording');
            }
          }
        },
        {
          label: 'Stop Recording',
          accelerator: 'Command+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-stop-recording');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Transcription',
          accelerator: 'Command+E',
          click: async () => {
            if (mainWindow) {
              const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: 'transcription.txt',
                filters: [
                  { name: 'Text Files', extensions: ['txt'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              });
              
              if (!result.canceled && result.filePath) {
                mainWindow.webContents.send('menu-export-transcription', result.filePath);
              }
            }
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Handle IPC messages from renderer process
 */
function setupIPC() {
  // Show notification when transcription starts
  ipcMain.handle('show-notification', async (event, title, body) => {
    if (Notification.isSupported()) {
      new Notification({
        title,
        body,
        silent: false
      }).show();
    }
  });

  // Handle export transcription
  ipcMain.handle('export-transcription', async (event, content, filePath) => {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

/**
 * App Event Handlers
 */

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createMainWindow();
  createMenu();
  setupIPC();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
}); 
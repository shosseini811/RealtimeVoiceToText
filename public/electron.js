// 🖥️ ELECTRON MAIN PROCESS - macOS App Entry Point
// This file creates and manages the macOS application window

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

// Keep a global reference of the window object
let mainWindow;

/**
 * 🪟 CREATE MAIN WINDOW
 * This function creates the main application window
 */
function createWindow() {
  // Create the browser window with macOS-specific settings
  mainWindow = new BrowserWindow({
    width: 1200,              // Window width
    height: 800,              // Window height
    minWidth: 800,            // Minimum width
    minHeight: 600,           // Minimum height
    
    // macOS-specific window settings
    titleBarStyle: 'hiddenInset',  // Modern macOS title bar
    vibrancy: 'under-window',      // macOS blur effect
    transparent: false,             // Solid window
    
    // Web security settings
    webPreferences: {
      nodeIntegration: false,        // Don't expose Node.js to renderer
      contextIsolation: true,        // Isolate context for security
      enableRemoteModule: false,     // Disable remote module for security
      webSecurity: true,             // Enable web security
    },
    
    // Window appearance
    show: false,                     // Don't show until ready
    icon: path.join(__dirname, 'icon.png'), // App icon (you can add this later)
  });

  // Load the React app
  const startUrl = isDev 
    ? 'http://localhost:3000'                    // Development server
    : `file://${path.join(__dirname, '../build/index.html')}`; // Production build
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus window on creation
    if (isDev) {
      mainWindow.webContents.openDevTools(); // Open dev tools in development
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * 📱 CREATE macOS MENU BAR
 * This creates a native macOS menu bar for your app
 */
function createMenu() {
  const template = [
    {
      label: 'Voice to Text',
      submenu: [
        {
          label: 'About Voice to Text',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Voice to Text',
              message: 'Voice to Text',
              detail: 'Real-time voice transcription with AI-powered summaries.\n\nBuilt with React and Electron.',
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => {
            // You can add a preferences window here later
            console.log('Preferences clicked');
          }
        },
        { type: 'separator' },
        {
          label: 'Hide Voice to Text',
          accelerator: 'Cmd+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Cmd+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Cmd+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Cmd+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+Cmd+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Cmd+X', role: 'cut' },
        { label: 'Copy', accelerator: 'Cmd+C', role: 'copy' },
        { label: 'Paste', accelerator: 'Cmd+V', role: 'paste' },
        { label: 'Select All', accelerator: 'Cmd+A', role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Cmd+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'Cmd+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'Cmd+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'Cmd+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'Cmd+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'Ctrl+Cmd+F', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'Cmd+M', role: 'minimize' },
        { label: 'Close', accelerator: 'Cmd+W', role: 'close' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 🚀 APP EVENT HANDLERS
 */

// App is ready - create window and menu
app.whenReady().then(() => {
  createWindow();
  createMenu();
  
  // macOS specific - recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until explicitly quit
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

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});

/**
 * 🔧 ADDITIONAL macOS FEATURES
 */

// Handle protocol for deep linking (optional)
app.setAsDefaultProtocolClient('voice-to-text');

// Handle the protocol on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  // Handle deep links here if needed
  console.log('Deep link:', url);
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
} 
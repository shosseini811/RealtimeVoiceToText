// 🖥️ ELECTRON MAIN PROCESS - macOS App Entry Point
//
// This file is the "main process" of our Electron application.
// Electron has two types of processes:
// 1. MAIN PROCESS (this file): Controls application lifecycle, creates renderer processes
// 2. RENDERER PROCESS: Displays the UI (our React app runs here)
//
// WHAT ELECTRON DOES:
// - Takes our web app (HTML, CSS, JavaScript) and wraps it in a native desktop app
// - Provides access to operating system features (file system, notifications, etc.)
// - Creates native windows, menus, and handles app lifecycle events
//
// FLOW:
// 1. This file starts when the app launches
// 2. Creates a browser window that loads our React app
// 3. Sets up native menus and handles window events
// 4. Manages app lifecycle (startup, shutdown, etc.)

// 📦 IMPORT ELECTRON MODULES
// These are Electron's built-in modules for creating desktop app features
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');

// 📁 IMPORT NODE.JS MODULES
const path = require('path');                    // For working with file paths
const isDev = require('electron-is-dev');       // Detects if we're in development mode

// 🌐 GLOBAL WINDOW REFERENCE
// Keep a global reference of the window object to prevent garbage collection
// If we don't do this, the window would be closed when the JavaScript object is garbage collected
let mainWindow;

/**
 * 🪟 CREATE MAIN WINDOW FUNCTION
 * 
 * This function creates the main application window with all the settings
 * for a modern macOS app. It configures appearance, security, and behavior.
 * 
 * WINDOW FEATURES:
 * - Native macOS title bar with traffic lights (red, yellow, green buttons)
 * - Vibrancy effect (translucent background that adapts to desktop)
 * - Proper security settings to prevent code injection
 * - Responsive sizing with minimum dimensions
 */
function createWindow() {
  // 🏗️ CREATE BROWSER WINDOW
  // BrowserWindow is Electron's way of creating a native window that displays web content
  mainWindow = new BrowserWindow({
    // WINDOW DIMENSIONS
    width: 1200,              // Initial window width in pixels
    height: 800,              // Initial window height in pixels
    minWidth: 800,            // Minimum width (user can't resize smaller)
    minHeight: 600,           // Minimum height (user can't resize smaller)
    
    // 🍎 MACOS-SPECIFIC WINDOW SETTINGS
    // These settings make the app look and feel native on macOS
    titleBarStyle: 'hiddenInset',  // Modern macOS title bar (hides title, shows traffic lights)
    vibrancy: 'under-window',      // Translucent effect that shows desktop behind window
    transparent: false,             // Solid window (not fully transparent)
    
    // 🔒 WEB SECURITY SETTINGS
    // These settings protect against security vulnerabilities
    webPreferences: {
      nodeIntegration: false,        // Don't expose Node.js APIs to renderer (security)
      contextIsolation: true,        // Isolate context between main and renderer (security)
      enableRemoteModule: false,     // Disable remote module (deprecated, security risk)
      webSecurity: true,             // Enable web security (prevents loading local files)
    },
    
    // 🎨 WINDOW APPEARANCE
    show: false,                     // Don't show window immediately (wait until ready)
    icon: path.join(__dirname, 'icon.png'), // App icon (you can add this file later)
  });

  // 📍 DETERMINE APP URL
  // In development, load from React dev server. In production, load from built files.
  const startUrl = isDev 
    ? 'http://localhost:3000'                    // Development: React dev server
    : `file://${path.join(__dirname, '../build/index.html')}`; // Production: built files
  
  // 🌐 LOAD THE REACT APP
  // This tells the window to load our React application
  mainWindow.loadURL(startUrl);

  // 🎭 SHOW WINDOW WHEN READY
  // Wait for the content to load before showing the window to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();              // Make window visible
    
    // 🔧 DEVELOPMENT TOOLS
    // In development mode, automatically open Chrome DevTools for debugging
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 🗑️ HANDLE WINDOW CLOSED
  // When the window is closed, remove the reference to free memory
  mainWindow.on('closed', () => {
    mainWindow = null;              // Dereference the window object
  });

  // 🔗 HANDLE EXTERNAL LINKS
  // When user clicks external links, open them in the default browser instead of in our app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);        // Open URL in default browser
    return { action: 'deny' };      // Don't open in our app
  });
}

/**
 * 📱 CREATE MACOS MENU BAR FUNCTION
 * 
 * This creates a native macOS menu bar for your app with standard menu items.
 * macOS apps are expected to have proper menus for good user experience.
 * 
 * MENU STRUCTURE:
 * - App menu (Voice to Text): About, Preferences, Quit
 * - Edit menu: Undo, Redo, Cut, Copy, Paste, Select All
 * - View menu: Reload, Dev Tools, Zoom controls, Fullscreen
 * - Window menu: Minimize, Close, Bring All to Front
 */
function createMenu() {
  // 📋 MENU TEMPLATE
  // This array defines the structure of our menu bar
  const template = [
    {
      // 🏠 APP MENU (first menu with app name)
      label: 'Voice to Text',        // Menu title (app name)
      submenu: [
        {
          // ℹ️ ABOUT DIALOG
          label: 'About Voice to Text',
          click: () => {
            // Show a native dialog with app information
            dialog.showMessageBox(mainWindow, {
              type: 'info',           // Info icon
              title: 'About Voice to Text',
              message: 'Voice to Text',
              detail: 'Real-time voice transcription with AI-powered summaries.\n\nBuilt with React and Electron.',
              buttons: ['OK']         // Button options
            });
          }
        },
        { type: 'separator' },        // Visual separator line
        {
          // ⚙️ PREFERENCES (placeholder for future settings)
          label: 'Preferences...',
          accelerator: 'Cmd+,',       // Keyboard shortcut
          click: () => {
            // Placeholder - you can add a preferences window here later
            console.log('Preferences clicked');
          }
        },
        { type: 'separator' },
        {
          // 👁️ HIDE APP
          label: 'Hide Voice to Text',
          accelerator: 'Cmd+H',       // Standard macOS shortcut
          role: 'hide'                // Built-in Electron action
        },
        {
          // 👁️‍🗨️ HIDE OTHER APPS
          label: 'Hide Others',
          accelerator: 'Cmd+Alt+H',   // Standard macOS shortcut
          role: 'hideothers'          // Built-in Electron action
        },
        {
          // 👁️ SHOW ALL APPS
          label: 'Show All',
          role: 'unhide'              // Built-in Electron action
        },
        { type: 'separator' },
        {
          // 🚪 QUIT APP
          label: 'Quit',
          accelerator: 'Cmd+Q',       // Standard macOS shortcut
          click: () => {
            app.quit();               // Exit the application
          }
        }
      ]
    },
    {
      // ✏️ EDIT MENU (standard text editing commands)
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Cmd+Z', role: 'undo' },           // Undo last action
        { label: 'Redo', accelerator: 'Shift+Cmd+Z', role: 'redo' },     // Redo last undone action
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Cmd+X', role: 'cut' },             // Cut selected text
        { label: 'Copy', accelerator: 'Cmd+C', role: 'copy' },           // Copy selected text
        { label: 'Paste', accelerator: 'Cmd+V', role: 'paste' },         // Paste from clipboard
        { label: 'Select All', accelerator: 'Cmd+A', role: 'selectall' } // Select all text
      ]
    },
    {
      // 👀 VIEW MENU (app display and developer options)
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Cmd+R', role: 'reload' },                    // Refresh the app
        { label: 'Force Reload', accelerator: 'Cmd+Shift+R', role: 'forceReload' },   // Hard refresh
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' }, // Show/hide DevTools
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'Cmd+0', role: 'resetZoom' },            // Reset zoom level
        { label: 'Zoom In', accelerator: 'Cmd+Plus', role: 'zoomIn' },                // Increase zoom
        { label: 'Zoom Out', accelerator: 'Cmd+-', role: 'zoomOut' },                 // Decrease zoom
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'Ctrl+Cmd+F', role: 'togglefullscreen' } // Enter/exit fullscreen
      ]
    },
    {
      // 🪟 WINDOW MENU (window management)
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'Cmd+M', role: 'minimize' },    // Minimize to dock
        { label: 'Close', accelerator: 'Cmd+W', role: 'close' },          // Close window
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' }                    // Bring all windows to front
      ]
    }
  ];

  // 🏗️ BUILD AND SET MENU
  const menu = Menu.buildFromTemplate(template);  // Create menu from template
  Menu.setApplicationMenu(menu);                   // Set as the app's menu bar
}

/**
 * 🚀 APP EVENT HANDLERS
 * 
 * These event listeners handle the application lifecycle and system events.
 * They ensure the app behaves properly on macOS (startup, window management, etc.)
 */

// 🎉 APP IS READY
// This event fires when Electron has finished initialization and is ready to create windows
app.whenReady().then(() => {
  createWindow();                 // Create the main window
  createMenu();                   // Set up the menu bar
  
  // 🍎 MACOS SPECIFIC BEHAVIOR
  // On macOS, apps typically stay active even when all windows are closed
  // When the dock icon is clicked, recreate the window if it doesn't exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();             // Recreate window if none exist
    }
  });
});

// 🚪 QUIT WHEN ALL WINDOWS CLOSED
// Handle app quitting behavior (different on macOS vs other platforms)
app.on('window-all-closed', () => {
  // On macOS (darwin), apps typically stay active until explicitly quit with Cmd+Q
  // On other platforms, quit when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 🔒 SECURITY: PREVENT NEW WINDOW CREATION
// This prevents malicious websites from opening new windows
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();       // Don't create new window
    shell.openExternal(navigationUrl); // Open URL in default browser instead
  });
});

// 🔐 HANDLE CERTIFICATE ERRORS (DEVELOPMENT ONLY)
// In development, we might encounter SSL certificate issues with localhost
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors (localhost doesn't have valid SSL)
    event.preventDefault();
    callback(true);               // Accept the certificate
  } else {
    // In production, use default behavior (reject invalid certificates)
    callback(false);
  }
});

/**
 * 🔧 ADDITIONAL MACOS FEATURES
 * 
 * These features provide deeper macOS integration and better user experience
 */

// 🔗 HANDLE PROTOCOL FOR DEEP LINKING (OPTIONAL)
// This allows other apps or websites to open your app with custom URLs
app.setAsDefaultProtocolClient('voice-to-text');

// 📱 HANDLE DEEP LINK URLS
// When someone clicks a voice-to-text:// link, this event fires
app.on('open-url', (event, url) => {
  event.preventDefault();
  // Handle deep links here if needed (e.g., voice-to-text://open-file?path=...)
  console.log('Deep link:', url);
});

// 🚫 PREVENT MULTIPLE INSTANCES
// Ensure only one instance of the app can run at a time
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // We got the lock, handle second instance attempts
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore(); // Restore if minimized
      mainWindow.focus();         // Bring window to front
    }
  });
}

// 💡 ELECTRON CONCEPTS FOR BEGINNERS:
//
// 1. MAIN vs RENDERER PROCESS:
//    - Main Process: This file, controls app lifecycle and creates windows
//    - Renderer Process: Your React app, runs in a browser-like environment
//    - They communicate via IPC (Inter-Process Communication)
//
// 2. BROWSER WINDOW:
//    - Each BrowserWindow is like a browser tab that can display web content
//    - Can load local files or remote URLs
//    - Has its own renderer process
//
// 3. SECURITY:
//    - nodeIntegration: false prevents renderer from accessing Node.js APIs
//    - contextIsolation: true isolates contexts for security
//    - webSecurity: true enables standard web security
//
// 4. MENU ROLES:
//    - Electron provides built-in menu roles (copy, paste, quit, etc.)
//    - These automatically work with system shortcuts and behaviors
//    - Custom menu items need click handlers
//
// 5. APP LIFECYCLE:
//    - ready: App is initialized, can create windows
//    - window-all-closed: All windows closed, decide whether to quit
//    - activate: App icon clicked (macOS), recreate window if needed
//
// 6. PLATFORM DIFFERENCES:
//    - macOS: Apps stay active when windows close, have app menu
//    - Windows/Linux: Apps quit when windows close, different menu structure
//    - Use process.platform to detect OS and adapt behavior 
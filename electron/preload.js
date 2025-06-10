const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload Script - Secure Bridge (JavaScript Version)
 * This safely exposes Electron APIs to our React app
 */

// Safely expose the API to the renderer process
const electronAPI = {
  // Notifications
  showNotification: (title, body) => 
    ipcRenderer.invoke('show-notification', title, body),
  
  // File operations
  exportTranscription: (content, filePath) => 
    ipcRenderer.invoke('export-transcription', content, filePath),
  
  // Menu events
  onMenuStartRecording: (callback) => {
    ipcRenderer.on('menu-start-recording', callback);
    // Return cleanup function
    return () => ipcRenderer.removeListener('menu-start-recording', callback);
  },
  
  onMenuStopRecording: (callback) => {
    ipcRenderer.on('menu-stop-recording', callback);
    return () => ipcRenderer.removeListener('menu-stop-recording', callback);
  },
  
  onMenuExportTranscription: (callback) => {
    ipcRenderer.on('menu-export-transcription', (event, filePath) => callback(filePath));
    return () => ipcRenderer.removeListener('menu-export-transcription', callback);
  },
};

// Expose the API to the main world
contextBridge.exposeInMainWorld('electronAPI', electronAPI); 
# AI Note Taker - Desktop App Setup

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
# Start the backend server first
npm run backend

# In another terminal, start the desktop app
npm run electron-dev
```

### 3. Build Desktop App
```bash
# Build the React app and create macOS installer
npm run dist
```

## 📱 Features

- **Native macOS App** - Runs outside the browser with native look and feel
- **Keyboard Shortcuts**:
  - `⌘+R` - Start Recording
  - `⌘+S` - Stop Recording  
  - `⌘+E` - Export Transcription
- **System Notifications** - Get notified when recording starts/stops
- **File Export** - Save transcriptions and summaries as text files
- **Native Menu Bar** - Full macOS menu integration

## 🛠️ Development

### File Structure
```
electron/
├── main.js       # Main Electron process
├── preload.js    # Secure bridge between React and Electron
└── assets/       # App icons and resources
```

### How It Works

1. **main.js** - Controls the app window, menu bar, and system integration
2. **preload.js** - Safely exposes Electron APIs to your React app
3. **App.tsx** - Your React app, enhanced with desktop features

### Adding Features

To add new desktop features:

1. Add IPC handlers in `electron/main.js`
2. Expose APIs in `electron/preload.js`  
3. Use the APIs in your React components via `window.electronAPI`

## 🐛 Troubleshooting

### Common Issues

**App won't start:**
- Make sure all dependencies are installed: `npm install`
- Check that the backend server is running: `npm run backend`

**Menu shortcuts not working:**
- This is normal in development mode, they work in the built app

**Build fails:**
- Make sure you have Xcode Command Line Tools installed
- Try cleaning: `rm -rf node_modules && npm install`

## 📦 Distribution

The built app will be in the `dist/` folder as a `.dmg` file that users can install on their Mac.

### Build Options

- `npm run electron-dev` - Development mode with hot reload
- `npm run electron` - Run the built React app in Electron
- `npm run dist` - Create distributable macOS app (.dmg)

## 🎨 Customization

### App Icon
Replace `electron/assets/icon.icns` with your own icon (1024x1024 PNG converted to ICNS format)

### App Name & Info
Update the `build` section in `package.json` to customize app details. 
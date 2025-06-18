# 🍎 macOS App Development Guide

This guide explains how to build and run your Voice to Text app as a native macOS application using Electron.

## 📋 Prerequisites

Make sure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Python** (for the backend)
- **Xcode Command Line Tools** (for building macOS apps)

```bash
# Install Xcode Command Line Tools (if not already installed)
xcode-select --install
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode (Recommended for testing)
This runs both the React app and Electron together:

```bash
# Start the macOS app in development mode
npm run electron-dev
```

This will:
- Start the React development server on `http://localhost:3000`
- Wait for React to be ready
- Launch the Electron app (macOS window)
- Enable hot-reloading (changes appear instantly)

### 3. Start Backend Separately
In a separate terminal, start the Python backend:

```bash
./start_backend.sh
# OR
cd backend && python main.py
```

## 🔧 Available Scripts

### Development Scripts
- `npm run electron-dev` - Run app in development mode with hot reload
- `npm run electron` - Run Electron app (React must be built first)
- `npm start` - Run only React development server
- `npm run backend` - Run only Python backend

### Building Scripts
- `npm run build` - Build React app for production
- `npm run dist-mac` - Build complete macOS app (.dmg and .zip)
- `npm run electron-pack` - Package Electron app

## 📦 Building for Distribution

### Build macOS App
To create a distributable macOS app:

```bash
# Build the complete macOS app
npm run dist-mac
```

This creates:
- **DMG file** (`dist/Voice to Text-1.0.0.dmg`) - For easy installation
- **ZIP file** (`dist/Voice to Text-1.0.0-mac.zip`) - Compressed app
- **App bundle** (`dist/mac/Voice to Text.app`) - The actual application

### What Gets Built
- **Universal Binary** - Works on both Intel and Apple Silicon Macs
- **DMG Installer** - Drag-and-drop installer
- **Code Signed** - Ready for distribution (with proper certificates)

## 🏗️ Project Structure

```
RealtimeVoiceToText/
├── public/
│   └── electron.js          # Main Electron process
├── src/                     # React app source
├── backend/                 # Python backend
├── assets/
│   └── entitlements.mac.plist  # macOS permissions
├── dist/                    # Built applications (created after build)
└── package.json            # Electron configuration
```

## 🔐 macOS Permissions

The app requests these permissions:
- **🎤 Microphone Access** - For voice recording
- **🌐 Network Access** - For API calls to backend
- **📁 File Access** - For saving/loading files (future feature)

These are configured in `assets/entitlements.mac.plist`.

## 🎨 macOS Features

### Native macOS Integration
- **Menu Bar** - Full macOS menu with keyboard shortcuts
- **Window Management** - Native window controls and behavior
- **Dock Integration** - Proper dock icon and behavior
- **Dark Mode** - Automatic dark/light mode support
- **Vibrancy Effects** - Native macOS blur effects

### Keyboard Shortcuts
- `Cmd+Q` - Quit app
- `Cmd+W` - Close window
- `Cmd+M` - Minimize window
- `Cmd+R` - Reload app
- `F12` - Toggle Developer Tools
- `Cmd+,` - Preferences (placeholder)

## 🐛 Troubleshooting

### Common Issues

1. **"Electron not found" error**
   ```bash
   npm install electron --save-dev
   ```

2. **Backend connection fails**
   - Make sure Python backend is running on `http://localhost:8000`
   - Check if backend dependencies are installed: `pip install -r requirements.txt`

3. **Build fails on macOS**
   - Install Xcode Command Line Tools: `xcode-select --install`
   - Make sure you have enough disk space (builds can be large)

4. **App won't open (macOS security)**
   - Right-click the app → "Open"
   - Or go to System Preferences → Security & Privacy → Allow the app

### Development Tips

1. **Use Development Mode**
   ```bash
   npm run electron-dev
   ```
   This is much faster than building each time.

2. **Check Logs**
   - Open Developer Tools in the app (F12)
   - Check terminal output for backend errors

3. **Reset Everything**
   ```bash
   rm -rf node_modules dist build
   npm install
   ```

## 📱 App Icon

To add a custom app icon:
1. Create `assets/icon.icns` (macOS icon format)
2. Use online converters to convert PNG to ICNS
3. Recommended sizes: 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024

## 🚀 Distribution

### For Personal Use
The built `.dmg` file can be shared and installed on any Mac.

### For App Store
Additional steps needed:
1. Apple Developer Account ($99/year)
2. Code signing certificates
3. App Store review process

### For Public Distribution
Consider code signing for better user experience:
1. Get Apple Developer ID certificate
2. Configure signing in `package.json`
3. Notarize the app with Apple

## 🔄 Updating the App

When you make changes to your React code:
1. The changes appear immediately in development mode (`npm run electron-dev`)
2. For distribution, rebuild: `npm run dist-mac`

## 💡 Next Steps

Consider adding these features:
- **Auto-updater** - Automatic app updates
- **Preferences window** - Settings and configuration
- **Menu bar app** - Run in menu bar instead of dock
- **Global shortcuts** - System-wide hotkeys
- **File export** - Save transcriptions as files
- **Notifications** - Native macOS notifications

## 🆘 Need Help?

1. Check the [Electron Documentation](https://www.electronjs.org/docs)
2. Look at `public/electron.js` for app configuration
3. Check `package.json` build settings
4. Review backend logs for API issues

---

**Happy coding! 🎉** Your Voice to Text app is now ready to run as a native macOS application! 
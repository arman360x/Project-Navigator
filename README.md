# Project Navigator

A cross-platform Electron desktop application for managing development projects with secure credential storage, system tray integration, and file navigation.

## Features

- **System Tray Integration** - App runs minimized to tray, click icon to open
- **Project Management** - Register and organize your development projects
- **File Browser** - Navigate project files with folder tree and file list
- **Quick Actions** - Open projects in Explorer, VS Code, or Terminal
- **Secure Credential Vault** - Store passwords and API keys securely
- **Master Password Protection** - Vault protected with PBKDF2 hashed password
- **OS Keychain Storage** - Secrets stored in Windows Credential Manager (not in database)
- **Auto-clear Clipboard** - Copied secrets auto-clear after 20 seconds
- **Export/Import** - Backup and restore projects (without secrets)
- **Dark Theme** - Modern dark UI with Bootstrap 5

## Credential Categories

- **RDP** - Remote Desktop connections
- **VPS** - Server access credentials
- **Hosting** - Web hosting control panels
- **API Keys** - API credentials and endpoints
- **Database** - Database connection strings
- **External App** - Third-party application logins

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Windows 10/11 (for Windows build)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/arman360x/Project-Navigator.git
cd Project-Navigator

# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild

# Run the app
npm start
```

### Build Installer

```bash
# Build Windows installer
npm run build:win

# Build macOS installer
npm run build:mac

# Build Linux installer
npm run build:linux
```

The installer will be created in the `dist/` folder.

## Project Structure

```
Project-Navigator/
├── main/
│   ├── main.js              # Electron main process
│   ├── tray.js              # System tray handler
│   └── ipc-handlers.js      # IPC communication handlers
├── preload/
│   └── preload.js           # Context bridge API
├── renderer/
│   ├── index.html           # Main app HTML
│   ├── css/
│   │   └── styles.css       # Dark theme styles
│   └── js/
│       ├── app.js           # Main app logic
│       ├── projects.js      # Project management UI
│       ├── files.js         # File browser UI
│       ├── vault.js         # Credentials vault UI
│       └── utils.js         # Helper functions
├── db/
│   ├── schema.sql           # Database schema
│   └── database.js          # Database operations
├── services/
│   ├── fs-service.js        # File system operations
│   ├── keychain-service.js  # OS keychain wrapper
│   ├── watcher-service.js   # File watcher
│   └── crypto-service.js    # Master password encryption
└── assets/
    └── icon.png             # App icon
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron |
| UI | HTML + Bootstrap 5 (dark theme) |
| Database | SQLite (better-sqlite3) |
| Secrets | OS Keychain (keytar) |
| File Watch | chokidar |
| Packaging | electron-builder |

## Security

- Master password hashed with PBKDF2 (100,000 iterations)
- Secrets stored in OS keychain, never in database
- Context isolation enabled
- No node integration in renderer
- Clipboard auto-clears after copying secrets

## Usage

1. **First Launch** - Set your master password
2. **Add Project** - Click "Add Project", browse for folder
3. **Browse Files** - Click project to view files
4. **Quick Actions** - Open in Explorer, VS Code, or Terminal
5. **Vault** - Click "Vault" to manage credentials
6. **System Tray** - Close window to minimize to tray

## License

MIT

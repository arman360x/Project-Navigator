const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const { createTray, destroyTray } = require('./tray');
const { registerIpcHandlers } = require('./ipc-handlers');
const { initDatabase } = require('../db/database');

let mainWindow = null;

// Create app icon programmatically (32x32 blue folder)
function createAppIcon() {
    const size = 32;
    const buffer = Buffer.alloc(size * size * 4);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;

            // Scale coordinates for 32x32
            const isFolder = (
                // Main body
                (y >= 10 && y <= 28 && x >= 2 && x <= 29) ||
                // Tab
                (y >= 6 && y <= 10 && x >= 2 && x <= 14)
            );

            const isFront = (y >= 14 && y <= 28 && x >= 2 && x <= 29);

            if (isFolder) {
                if (isFront) {
                    // Light blue
                    buffer[idx] = 100;     // R
                    buffer[idx + 1] = 149; // G
                    buffer[idx + 2] = 237; // B
                    buffer[idx + 3] = 255; // A
                } else {
                    // Dark blue
                    buffer[idx] = 65;      // R
                    buffer[idx + 1] = 105; // G
                    buffer[idx + 2] = 225; // B
                    buffer[idx + 3] = 255; // A
                }
            } else {
                buffer[idx] = 0;
                buffer[idx + 1] = 0;
                buffer[idx + 2] = 0;
                buffer[idx + 3] = 0;
            }
        }
    }

    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createWindow() {
    const appIcon = createAppIcon();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        show: false,
        frame: true,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        icon: appIcon
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        // Start hidden - tray click will show
    });
}

function showWindow() {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
}

function hideWindow() {
    if (mainWindow) {
        mainWindow.hide();
    }
}

function toggleWindow() {
    if (mainWindow) {
        if (mainWindow.isVisible()) {
            hideWindow();
        } else {
            showWindow();
        }
    }
}

app.whenReady().then(() => {
    // Initialize database
    initDatabase();

    // Register IPC handlers
    registerIpcHandlers();

    // Create window
    createWindow();

    // Create system tray
    createTray(toggleWindow, showWindow, app);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            showWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Don't quit, stay in tray
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    destroyTray();
});

// Export for use in other modules
module.exports = { showWindow, hideWindow, toggleWindow, getMainWindow: () => mainWindow };

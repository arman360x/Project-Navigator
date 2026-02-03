const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray(toggleWindow, showWindow, app) {
    console.log('Creating tray...');

    try {
        // Create a simple 16x16 icon programmatically
        const size = 16;
        const buffer = Buffer.alloc(size * size * 4);

        // Draw a blue folder icon
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;

                // Folder shape
                const isFolder = (
                    // Main body
                    (y >= 5 && y <= 14 && x >= 1 && x <= 14) ||
                    // Tab
                    (y >= 3 && y <= 5 && x >= 1 && x <= 7)
                );

                // Folder front (lighter)
                const isFront = (y >= 7 && y <= 14 && x >= 1 && x <= 14);

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
                    // Transparent
                    buffer[idx] = 0;
                    buffer[idx + 1] = 0;
                    buffer[idx + 2] = 0;
                    buffer[idx + 3] = 0;
                }
            }
        }

        const trayIcon = nativeImage.createFromBuffer(buffer, {
            width: size,
            height: size
        });

        console.log('Tray icon created, isEmpty:', trayIcon.isEmpty());

        tray = new Tray(trayIcon);
        console.log('Tray instance created');

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Open Project Navigator',
                click: showWindow
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit',
                click: () => {
                    app.isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('Project Navigator');
        tray.setContextMenu(contextMenu);

        tray.on('click', () => {
            console.log('Tray clicked');
            toggleWindow();
        });

        tray.on('double-click', () => {
            showWindow();
        });

        console.log('Tray setup complete');
        return tray;
    } catch (error) {
        console.error('Error creating tray:', error);
        return null;
    }
}

function destroyTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}

module.exports = { createTray, destroyTray };

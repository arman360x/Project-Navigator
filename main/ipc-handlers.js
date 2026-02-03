const { ipcMain, shell, clipboard, dialog, BrowserWindow } = require('electron');
const path = require('path');
const db = require('../db/database');
const fsService = require('../services/fs-service');
const keychainService = require('../services/keychain-service');
const cryptoService = require('../services/crypto-service');
const watcherService = require('../services/watcher-service');

let vaultUnlocked = false;
let clipboardClearTimeout = null;

function registerIpcHandlers() {
    // ==================== Projects ====================

    ipcMain.handle('projects:list', async () => {
        console.log('IPC: projects:list called');
        const projects = db.getAllProjects();
        console.log('IPC: returning', projects.length, 'projects');
        return projects;
    });

    ipcMain.handle('projects:get', async (event, id) => {
        console.log('IPC: projects:get called with id:', id);
        const project = db.getProject(id);
        if (project) {
            project.links = db.getProjectLinks(id);
        }
        return project;
    });

    ipcMain.handle('projects:create', async (event, data) => {
        console.log('IPC: projects:create called with data:', data);
        try {
            const result = db.createProject(data);
            console.log('IPC: project created:', result);
            return result;
        } catch (error) {
            console.error('IPC: Error creating project:', error);
            throw error;
        }
    });

    ipcMain.handle('projects:update', async (event, id, data) => {
        return db.updateProject(id, data);
    });

    ipcMain.handle('projects:delete', async (event, id) => {
        // Delete associated credentials from keychain
        const credentials = db.getCredentialsByProject(id);
        for (const cred of credentials) {
            await keychainService.deleteSecret(cred.keychain_service, cred.keychain_account);
        }
        return db.deleteProject(id);
    });

    ipcMain.handle('projects:open', async (event, id) => {
        return db.updateProjectOpenedAt(id);
    });

    // Project Links
    ipcMain.handle('projects:addLink', async (event, projectId, label, url) => {
        return db.addProjectLink(projectId, label, url);
    });

    ipcMain.handle('projects:removeLink', async (event, linkId) => {
        return db.removeProjectLink(linkId);
    });

    // ==================== File System ====================

    ipcMain.handle('fs:listDir', async (event, dirPath) => {
        return fsService.listDirectory(dirPath);
    });

    ipcMain.handle('fs:getTree', async (event, rootPath, depth = 3) => {
        return fsService.getDirectoryTree(rootPath, depth);
    });

    ipcMain.handle('fs:search', async (event, rootPath, query) => {
        return fsService.searchFiles(rootPath, query);
    });

    ipcMain.handle('fs:openInExplorer', async (event, filePath) => {
        shell.showItemInFolder(filePath);
        return true;
    });

    ipcMain.handle('fs:openInVSCode', async (event, filePath) => {
        return fsService.openInVSCode(filePath);
    });

    ipcMain.handle('fs:openTerminal', async (event, dirPath) => {
        return fsService.openTerminal(dirPath);
    });

    ipcMain.handle('fs:openFile', async (event, filePath) => {
        shell.openPath(filePath);
        return true;
    });

    // Folder picker dialog
    ipcMain.handle('fs:selectFolder', async (event) => {
        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Project Folder'
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    });

    // Create new folder
    ipcMain.handle('fs:createFolder', async (event, parentPath, folderName) => {
        const fs = require('fs');
        const newPath = path.join(parentPath, folderName);
        try {
            if (!fs.existsSync(newPath)) {
                fs.mkdirSync(newPath, { recursive: true });
            }
            return newPath;
        } catch (error) {
            console.error('Error creating folder:', error);
            throw error;
        }
    });

    // ==================== Vault ====================

    ipcMain.handle('vault:hasPassword', async () => {
        return db.hasMasterPassword();
    });

    ipcMain.handle('vault:setMasterPassword', async (event, password) => {
        const hash = cryptoService.hashPassword(password);
        db.setMasterPassword(hash);
        vaultUnlocked = true;
        return true;
    });

    ipcMain.handle('vault:unlock', async (event, password) => {
        const storedHash = db.getMasterPasswordHash();
        if (!storedHash) {
            return false;
        }
        const isValid = cryptoService.verifyPassword(password, storedHash);
        if (isValid) {
            vaultUnlocked = true;
        }
        return isValid;
    });

    ipcMain.handle('vault:lock', async () => {
        vaultUnlocked = false;
        return true;
    });

    ipcMain.handle('vault:isLocked', async () => {
        return !vaultUnlocked;
    });

    ipcMain.handle('vault:list', async (event, projectId = null) => {
        if (!vaultUnlocked) {
            throw new Error('Vault is locked');
        }
        if (projectId) {
            return db.getCredentialsByProject(projectId);
        }
        return db.getAllCredentials();
    });

    ipcMain.handle('vault:create', async (event, data) => {
        if (!vaultUnlocked) {
            throw new Error('Vault is locked');
        }

        // Generate unique keychain identifiers
        const keychainService_name = `project-navigator-${Date.now()}`;
        const keychainAccount = data.label.replace(/[^a-zA-Z0-9]/g, '_');

        // Store secret in keychain
        await keychainService.setSecret(keychainService_name, keychainAccount, data.secret);

        // Store metadata in database (no secret!)
        const credData = {
            project_id: data.project_id || null,
            category: data.category,
            label: data.label,
            username: data.username || null,
            host: data.host || null,
            port: data.port || null,
            keychain_service: keychainService_name,
            keychain_account: keychainAccount,
            notes: data.notes || null
        };

        return db.createCredential(credData);
    });

    ipcMain.handle('vault:getSecret', async (event, id) => {
        if (!vaultUnlocked) {
            throw new Error('Vault is locked');
        }
        const cred = db.getCredential(id);
        if (!cred) {
            throw new Error('Credential not found');
        }
        return keychainService.getSecret(cred.keychain_service, cred.keychain_account);
    });

    ipcMain.handle('vault:delete', async (event, id) => {
        if (!vaultUnlocked) {
            throw new Error('Vault is locked');
        }
        const cred = db.getCredential(id);
        if (cred) {
            await keychainService.deleteSecret(cred.keychain_service, cred.keychain_account);
        }
        return db.deleteCredential(id);
    });

    ipcMain.handle('vault:copyToClipboard', async (event, id) => {
        if (!vaultUnlocked) {
            throw new Error('Vault is locked');
        }
        const cred = db.getCredential(id);
        if (!cred) {
            throw new Error('Credential not found');
        }
        const secret = await keychainService.getSecret(cred.keychain_service, cred.keychain_account);

        if (secret) {
            clipboard.writeText(secret);

            // Clear clipboard after 20 seconds
            if (clipboardClearTimeout) {
                clearTimeout(clipboardClearTimeout);
            }
            clipboardClearTimeout = setTimeout(() => {
                // Only clear if clipboard still contains our secret
                if (clipboard.readText() === secret) {
                    clipboard.clear();
                }
            }, 20000);

            return true;
        }
        return false;
    });

    // ==================== Categories ====================

    ipcMain.handle('categories:list', async () => {
        return db.getCategories();
    });

    // ==================== Export/Import ====================

    ipcMain.handle('export:toJson', async () => {
        const projects = db.getAllProjects();
        const exportData = [];

        for (const project of projects) {
            const links = db.getProjectLinks(project.id);
            const credentials = db.getCredentialsByProject(project.id);

            exportData.push({
                ...project,
                links,
                credentials: credentials.map(c => ({
                    category: c.category,
                    label: c.label,
                    username: c.username,
                    host: c.host,
                    port: c.port,
                    notes: c.notes
                    // NO SECRETS!
                }))
            });
        }

        return JSON.stringify(exportData, null, 2);
    });

    ipcMain.handle('import:fromJson', async (event, jsonData) => {
        const projects = JSON.parse(jsonData);
        let imported = 0;

        for (const project of projects) {
            const { links, credentials, id, ...projectData } = project;
            const newProject = db.createProject(projectData);

            if (links) {
                for (const link of links) {
                    db.addProjectLink(newProject.id, link.label, link.url);
                }
            }

            imported++;
        }

        return imported;
    });

    // ==================== Settings ====================

    ipcMain.handle('app:getSettings', async () => {
        return db.getSettings();
    });

    ipcMain.handle('app:setSettings', async (event, key, value) => {
        return db.setSetting(key, value);
    });

    // ==================== File Watcher ====================

    ipcMain.handle('watcher:start', async (event, rootPath) => {
        return watcherService.startWatching(rootPath, (eventType, filePath) => {
            event.sender.send('watcher:change', { eventType, filePath });
        });
    });

    ipcMain.handle('watcher:stop', async () => {
        return watcherService.stopWatching();
    });
}

module.exports = { registerIpcHandlers };

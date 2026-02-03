const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
    // Projects
    projects: {
        list: () => ipcRenderer.invoke('projects:list'),
        get: (id) => ipcRenderer.invoke('projects:get', id),
        create: (data) => ipcRenderer.invoke('projects:create', data),
        update: (id, data) => ipcRenderer.invoke('projects:update', id, data),
        delete: (id) => ipcRenderer.invoke('projects:delete', id),
        open: (id) => ipcRenderer.invoke('projects:open', id),
        addLink: (projectId, label, url) => ipcRenderer.invoke('projects:addLink', projectId, label, url),
        removeLink: (linkId) => ipcRenderer.invoke('projects:removeLink', linkId)
    },

    // File System
    fs: {
        listDir: (path) => ipcRenderer.invoke('fs:listDir', path),
        getTree: (rootPath, depth) => ipcRenderer.invoke('fs:getTree', rootPath, depth),
        search: (rootPath, query) => ipcRenderer.invoke('fs:search', rootPath, query),
        openInExplorer: (path) => ipcRenderer.invoke('fs:openInExplorer', path),
        openInVSCode: (path) => ipcRenderer.invoke('fs:openInVSCode', path),
        openTerminal: (path) => ipcRenderer.invoke('fs:openTerminal', path),
        openFile: (path) => ipcRenderer.invoke('fs:openFile', path),
        selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
        createFolder: (parentPath, folderName) => ipcRenderer.invoke('fs:createFolder', parentPath, folderName)
    },

    // Vault
    vault: {
        hasPassword: () => ipcRenderer.invoke('vault:hasPassword'),
        setMasterPassword: (password) => ipcRenderer.invoke('vault:setMasterPassword', password),
        unlock: (password) => ipcRenderer.invoke('vault:unlock', password),
        lock: () => ipcRenderer.invoke('vault:lock'),
        isLocked: () => ipcRenderer.invoke('vault:isLocked'),
        list: (projectId) => ipcRenderer.invoke('vault:list', projectId),
        create: (data) => ipcRenderer.invoke('vault:create', data),
        getSecret: (id) => ipcRenderer.invoke('vault:getSecret', id),
        delete: (id) => ipcRenderer.invoke('vault:delete', id),
        copyToClipboard: (id) => ipcRenderer.invoke('vault:copyToClipboard', id)
    },

    // Categories
    categories: {
        list: () => ipcRenderer.invoke('categories:list')
    },

    // Export/Import
    export: {
        toJson: () => ipcRenderer.invoke('export:toJson')
    },
    import: {
        fromJson: (data) => ipcRenderer.invoke('import:fromJson', data)
    },

    // Settings
    app: {
        getSettings: () => ipcRenderer.invoke('app:getSettings'),
        setSettings: (key, value) => ipcRenderer.invoke('app:setSettings', key, value)
    },

    // File Watcher
    watcher: {
        start: (rootPath) => ipcRenderer.invoke('watcher:start', rootPath),
        stop: () => ipcRenderer.invoke('watcher:stop'),
        onChange: (callback) => {
            ipcRenderer.on('watcher:change', (event, data) => callback(data));
        }
    }
});

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// File/folder ignore patterns
const IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    '__pycache__',
    '.vscode',
    '.idea',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.cache',
    'tmp',
    'temp'
];

function shouldIgnore(name) {
    return IGNORE_PATTERNS.includes(name) || name.startsWith('.');
}

async function listDirectory(dirPath) {
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const items = [];

        for (const entry of entries) {
            if (shouldIgnore(entry.name)) continue;

            const fullPath = path.join(dirPath, entry.name);
            const stats = await fs.promises.stat(fullPath).catch(() => null);

            if (!stats) continue;

            items.push({
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory(),
                size: stats.size,
                modified: stats.mtime.toISOString(),
                extension: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase()
            });
        }

        // Sort: directories first, then files, both alphabetically
        items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return items;
    } catch (error) {
        console.error('Error listing directory:', error);
        return [];
    }
}

async function getDirectoryTree(rootPath, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return null;

    try {
        const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
        const children = [];

        for (const entry of entries) {
            if (shouldIgnore(entry.name)) continue;
            if (!entry.isDirectory()) continue;

            const fullPath = path.join(rootPath, entry.name);
            const subTree = await getDirectoryTree(fullPath, maxDepth, currentDepth + 1);

            children.push({
                name: entry.name,
                path: fullPath,
                children: subTree
            });
        }

        children.sort((a, b) => a.name.localeCompare(b.name));
        return children;
    } catch (error) {
        console.error('Error getting directory tree:', error);
        return [];
    }
}

async function searchFiles(rootPath, query, maxResults = 100) {
    const results = [];
    const queryLower = query.toLowerCase();

    async function search(dirPath, depth = 0) {
        if (depth > 10 || results.length >= maxResults) return;

        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                if (results.length >= maxResults) return;
                if (shouldIgnore(entry.name)) continue;

                const fullPath = path.join(dirPath, entry.name);

                if (entry.name.toLowerCase().includes(queryLower)) {
                    const stats = await fs.promises.stat(fullPath).catch(() => null);
                    if (stats) {
                        results.push({
                            name: entry.name,
                            path: fullPath,
                            isDirectory: entry.isDirectory(),
                            size: stats.size,
                            modified: stats.mtime.toISOString()
                        });
                    }
                }

                if (entry.isDirectory()) {
                    await search(fullPath, depth + 1);
                }
            }
        } catch (error) {
            // Ignore permission errors
        }
    }

    await search(rootPath);
    return results;
}

function openInVSCode(filePath) {
    return new Promise((resolve, reject) => {
        const command = process.platform === 'win32'
            ? `code "${filePath}"`
            : `code "${filePath}"`;

        exec(command, (error) => {
            if (error) {
                // Try with full path on Windows
                if (process.platform === 'win32') {
                    exec(`cmd /c code "${filePath}"`, (err) => {
                        if (err) reject(err);
                        else resolve(true);
                    });
                } else {
                    reject(error);
                }
            } else {
                resolve(true);
            }
        });
    });
}

function openTerminal(dirPath) {
    return new Promise((resolve, reject) => {
        let command;

        if (process.platform === 'win32') {
            command = `start cmd /k "cd /d ${dirPath}"`;
        } else if (process.platform === 'darwin') {
            command = `open -a Terminal "${dirPath}"`;
        } else {
            // Linux - try common terminals
            command = `x-terminal-emulator --working-directory="${dirPath}" || gnome-terminal --working-directory="${dirPath}" || xterm -e "cd ${dirPath} && bash"`;
        }

        exec(command, (error) => {
            if (error) reject(error);
            else resolve(true);
        });
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = {
    listDirectory,
    getDirectoryTree,
    searchFiles,
    openInVSCode,
    openTerminal,
    formatFileSize
};

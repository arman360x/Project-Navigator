const chokidar = require('chokidar');

let watcher = null;

function startWatching(rootPath, callback) {
    // Stop any existing watcher
    stopWatching();

    const ignored = [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/__pycache__/**',
        '**/coverage/**'
    ];

    watcher = chokidar.watch(rootPath, {
        ignored,
        persistent: true,
        ignoreInitial: true,
        depth: 5,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
        }
    });

    watcher
        .on('add', (path) => callback('add', path))
        .on('change', (path) => callback('change', path))
        .on('unlink', (path) => callback('unlink', path))
        .on('addDir', (path) => callback('addDir', path))
        .on('unlinkDir', (path) => callback('unlinkDir', path))
        .on('error', (error) => console.error('Watcher error:', error));

    return true;
}

function stopWatching() {
    if (watcher) {
        watcher.close();
        watcher = null;
    }
    return true;
}

function isWatching() {
    return watcher !== null;
}

module.exports = {
    startWatching,
    stopWatching,
    isWatching
};

// Files Module

let currentPath = '';
let folderTree = [];

async function loadDirectory(dirPath) {
    try {
        currentPath = dirPath;
        const items = await window.api.fs.listDir(dirPath);
        renderFileList(items);
        updateBreadcrumb(dirPath);
        utils.setStatus(`Loaded: ${dirPath}`);
    } catch (error) {
        console.error('Error loading directory:', error);
        utils.showToast('Error', 'Failed to load directory', 'error');
    }
}

async function loadFolderTree(rootPath) {
    try {
        const tree = await window.api.fs.getTree(rootPath, 4);
        folderTree = tree || [];
        renderFolderTree(rootPath, tree);
    } catch (error) {
        console.error('Error loading folder tree:', error);
    }
}

function renderFolderTree(rootPath, tree) {
    const container = document.getElementById('folderTree');

    function renderNode(nodes, parentPath) {
        if (!nodes || nodes.length === 0) return '';

        return nodes.map(node => `
            <div class="tree-node">
                <div class="tree-item ${currentPath === node.path ? 'active' : ''}" data-path="${utils.escapeHtml(node.path)}">
                    <i class="bi bi-folder-fill"></i>
                    <span>${utils.escapeHtml(node.name)}</span>
                </div>
                ${node.children && node.children.length > 0 ? `
                    <div class="tree-children">
                        ${renderNode(node.children, node.path)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Get project root name
    const project = window.projectsModule.getCurrentProject();
    const rootName = project ? project.name : rootPath.split(/[/\\]/).pop();

    container.innerHTML = `
        <div class="tree-node">
            <div class="tree-item ${currentPath === rootPath ? 'active' : ''}" data-path="${utils.escapeHtml(rootPath)}">
                <i class="bi bi-folder-fill"></i>
                <span>${utils.escapeHtml(rootName)}</span>
            </div>
            <div class="tree-children">
                ${renderNode(tree, rootPath)}
            </div>
        </div>
    `;

    // Add click handlers
    container.querySelectorAll('.tree-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.stopPropagation();
            const path = item.dataset.path;
            await loadDirectory(path);

            // Update active state
            container.querySelectorAll('.tree-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function renderFileList(items) {
    const container = document.getElementById('fileList');

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-folder2-open display-4"></i>
                <p class="mt-2">This folder is empty</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const icon = utils.getFileIcon(item.extension, item.isDirectory);
        const iconClass = item.isDirectory ? 'folder' : 'file';

        return `
            <div class="file-item" data-path="${utils.escapeHtml(item.path)}" data-is-dir="${item.isDirectory}">
                <i class="bi ${icon} file-icon ${iconClass}"></i>
                <div class="file-info">
                    <div class="file-name">${utils.escapeHtml(item.name)}</div>
                    <div class="file-meta">
                        ${item.isDirectory ? 'Folder' : utils.formatFileSize(item.size)}
                        <span class="ms-2">${utils.formatDate(item.modified)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button type="button" class="btn btn-sm btn-outline-secondary me-1" onclick="window.files.openInExplorer('${utils.escapeHtml(item.path).replace(/'/g, "\\'")}')">
                        <i class="bi bi-folder2"></i>
                    </button>
                    ${!item.isDirectory ? `
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.files.openInVSCode('${utils.escapeHtml(item.path).replace(/'/g, "\\'")}')">
                            <i class="bi bi-code-square"></i>
                        </button>
                    ` : `
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.files.openTerminal('${utils.escapeHtml(item.path).replace(/'/g, "\\'")}')">
                            <i class="bi bi-terminal"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers for navigation
    container.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('dblclick', async () => {
            const path = item.dataset.path;
            const isDir = item.dataset.isDir === 'true';

            if (isDir) {
                await loadDirectory(path);
            } else {
                // Open file
                await window.api.fs.openFile(path);
            }
        });
    });
}

function updateBreadcrumb(dirPath) {
    const container = document.getElementById('pathBreadcrumb');
    const project = window.projectsModule.getCurrentProject();

    if (!project) {
        container.innerHTML = '';
        return;
    }

    const rootPath = project.root_path;
    const relativePath = dirPath.replace(rootPath, '').replace(/^[/\\]/, '');
    const parts = relativePath ? relativePath.split(/[/\\]/) : [];

    let html = `
        <li class="breadcrumb-item">
            <a href="#" data-path="${utils.escapeHtml(rootPath)}">${utils.escapeHtml(project.name)}</a>
        </li>
    `;

    let currentBreadcrumbPath = rootPath;
    parts.forEach((part, index) => {
        currentBreadcrumbPath += (currentBreadcrumbPath.endsWith('/') || currentBreadcrumbPath.endsWith('\\') ? '' : '\\') + part;

        if (index === parts.length - 1) {
            html += `<li class="breadcrumb-item active">${utils.escapeHtml(part)}</li>`;
        } else {
            html += `
                <li class="breadcrumb-item">
                    <a href="#" data-path="${utils.escapeHtml(currentBreadcrumbPath)}">${utils.escapeHtml(part)}</a>
                </li>
            `;
        }
    });

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const path = link.dataset.path;
            await loadDirectory(path);
        });
    });
}

async function searchFiles(query) {
    const project = window.projectsModule.getCurrentProject();
    if (!project || !query.trim()) {
        await loadDirectory(currentPath || project.root_path);
        return;
    }

    try {
        utils.setStatus('Searching...');
        const results = await window.api.fs.search(project.root_path, query.trim());
        renderFileList(results);
        utils.setStatus(`Found ${results.length} results`);
    } catch (error) {
        console.error('Error searching files:', error);
        utils.showToast('Error', 'Search failed', 'error');
    }
}

async function openInExplorer(path) {
    try {
        await window.api.fs.openInExplorer(path);
    } catch (error) {
        console.error('Error opening in explorer:', error);
    }
}

async function openInVSCode(path) {
    try {
        await window.api.fs.openInVSCode(path);
    } catch (error) {
        console.error('Error opening in VS Code:', error);
        utils.showToast('Error', 'Failed to open in VS Code', 'error');
    }
}

async function openTerminal(path) {
    try {
        await window.api.fs.openTerminal(path);
    } catch (error) {
        console.error('Error opening terminal:', error);
        utils.showToast('Error', 'Failed to open terminal', 'error');
    }
}

// Initialize
function initFilesModule() {
    document.getElementById('fileSearch').addEventListener('input', utils.debounce((e) => {
        searchFiles(e.target.value);
    }, 500));
}

// Export for global access
window.files = {
    loadDirectory,
    loadFolderTree,
    searchFiles,
    openInExplorer,
    openInVSCode,
    openTerminal,
    initFilesModule,
    getCurrentPath: () => currentPath
};

// Projects Module

let projects = [];
let currentProject = null;
let editingProjectId = null;

async function loadProjects() {
    try {
        projects = await window.api.projects.list();
        renderProjectsList();
    } catch (error) {
        console.error('Error loading projects:', error);
        utils.showToast('Error', 'Failed to load projects', 'error');
    }
}

function renderProjectsList(filter = '') {
    const container = document.getElementById('projectsList');
    const filterLower = filter.toLowerCase();

    const filtered = filter
        ? projects.filter(p =>
            p.name.toLowerCase().includes(filterLower) ||
            (p.client && p.client.toLowerCase().includes(filterLower)) ||
            (p.platform && p.platform.toLowerCase().includes(filterLower))
        )
        : projects;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-folder-x display-4"></i>
                <p class="mt-2">${filter ? 'No matching projects' : 'No projects yet'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(project => `
        <div class="project-item ${currentProject?.id === project.id ? 'active' : ''}"
             data-project-id="${project.id}">
            <div class="project-name">${utils.escapeHtml(project.name)}</div>
            ${project.client ? `<div class="project-client">${utils.escapeHtml(project.client)}</div>` : ''}
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.project-item').forEach(item => {
        item.addEventListener('click', () => {
            const projectId = parseInt(item.dataset.projectId);
            selectProject(projectId);
        });
    });
}

async function selectProject(projectId) {
    try {
        const project = await window.api.projects.get(projectId);
        if (!project) return;

        // Mark as opened
        await window.api.projects.open(projectId);

        currentProject = project;

        // Update UI
        document.getElementById('welcomeScreen').classList.add('d-none');
        document.getElementById('projectView').classList.remove('d-none');

        document.getElementById('currentProjectName').textContent = project.name;
        document.getElementById('currentProjectPath').textContent = project.root_path;

        // Render tags
        const tagsContainer = document.getElementById('projectTags');
        const tags = JSON.parse(project.tags_json || '[]');
        tagsContainer.innerHTML = tags.map(tag => `<span class="tag">${utils.escapeHtml(tag)}</span>`).join('');

        // Render notes
        document.getElementById('projectNotesDisplay').textContent = project.notes || 'No notes.';

        // Render links
        renderProjectLinks(project.links || []);

        // Load file browser
        await window.files.loadDirectory(project.root_path);
        await window.files.loadFolderTree(project.root_path);

        // Load project credentials
        await loadProjectCredentials(project.id);

        // Update sidebar
        renderProjectsList(document.getElementById('projectSearch').value);

        utils.setStatus(`Loaded: ${project.name}`);
    } catch (error) {
        console.error('Error selecting project:', error);
        utils.showToast('Error', 'Failed to load project', 'error');
    }
}

function renderProjectLinks(links) {
    const container = document.getElementById('projectLinksList');

    if (links.length === 0) {
        container.innerHTML = '<p class="text-muted small">No links added.</p>';
        return;
    }

    container.innerHTML = links.map(link => `
        <div class="link-item">
            <a href="#" onclick="window.api.fs.openFile('${utils.escapeHtml(link.url)}'); return false;">
                <i class="bi bi-link-45deg me-2"></i>${utils.escapeHtml(link.label)}
            </a>
            <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeProjectLink(${link.id})">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `).join('');
}

async function loadProjectCredentials(projectId) {
    const container = document.getElementById('projectCredentialsList');

    try {
        const isLocked = await window.api.vault.isLocked();

        if (isLocked) {
            container.innerHTML = `
                <p class="text-muted small">
                    <i class="bi bi-lock me-1"></i>Vault is locked.
                    <a href="#" onclick="window.vault.openVault(); return false;">Unlock</a>
                </p>
            `;
            return;
        }

        const credentials = await window.api.vault.list(projectId);

        if (credentials.length === 0) {
            container.innerHTML = '<p class="text-muted small">No credentials for this project.</p>';
            return;
        }

        container.innerHTML = credentials.map(cred => `
            <div class="credential-card">
                <div class="cred-header">
                    <span class="cred-label">${utils.escapeHtml(cred.label)}</span>
                    <span class="cred-category">${utils.escapeHtml(cred.category)}</span>
                </div>
                <div class="cred-details">
                    ${cred.host ? `<div><i class="bi bi-hdd-network me-1"></i>${utils.escapeHtml(cred.host)}${cred.port ? ':' + cred.port : ''}</div>` : ''}
                    ${cred.username ? `<div><i class="bi bi-person me-1"></i>${utils.escapeHtml(cred.username)}</div>` : ''}
                </div>
                <div class="cred-actions">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.vault.copyCredentialSecret(${cred.id})">
                        <i class="bi bi-clipboard"></i> Copy
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading project credentials:', error);
        container.innerHTML = '<p class="text-danger small">Error loading credentials.</p>';
    }
}

function showProjectForm(projectId = null) {
    editingProjectId = projectId;
    const modal = new bootstrap.Modal(document.getElementById('projectFormModal'));

    document.getElementById('projectFormTitle').textContent = projectId ? 'Edit Project' : 'Add Project';
    document.getElementById('projectForm').reset();

    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectPath').value = project.root_path;
            document.getElementById('projectClient').value = project.client || '';
            document.getElementById('projectPlatform').value = project.platform || '';
            document.getElementById('projectTags').value = JSON.parse(project.tags_json || '[]').join(', ');
            document.getElementById('projectNotes').value = project.notes || '';
        }
    }

    modal.show();
}

async function saveProject() {
    console.log('saveProject called');

    const data = {
        name: document.getElementById('projectName').value.trim(),
        root_path: document.getElementById('projectPath').value.trim(),
        client: document.getElementById('projectClient').value.trim() || null,
        platform: document.getElementById('projectPlatform').value.trim() || null,
        tags: document.getElementById('projectTags').value.split(',').map(t => t.trim()).filter(t => t),
        notes: document.getElementById('projectNotes').value.trim() || null
    };

    console.log('Project data:', data);

    if (!data.name || !data.root_path) {
        utils.showToast('Error', 'Name and path are required', 'error');
        return;
    }

    try {
        console.log('Calling API to create project...');
        if (editingProjectId) {
            await window.api.projects.update(editingProjectId, data);
            utils.showToast('Success', 'Project updated', 'success');
        } else {
            const result = await window.api.projects.create(data);
            console.log('Project created:', result);
            utils.showToast('Success', 'Project created', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('projectFormModal')).hide();
        await loadProjects();

        if (editingProjectId && currentProject?.id === editingProjectId) {
            await selectProject(editingProjectId);
        }
    } catch (error) {
        console.error('Error saving project:', error);
        utils.showToast('Error', 'Failed to save project: ' + error.message, 'error');
    }
}

async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This will also delete associated credentials.')) {
        return;
    }

    try {
        await window.api.projects.delete(projectId);
        utils.showToast('Success', 'Project deleted', 'success');

        if (currentProject?.id === projectId) {
            currentProject = null;
            document.getElementById('projectView').classList.add('d-none');
            document.getElementById('welcomeScreen').classList.remove('d-none');
        }

        await loadProjects();
    } catch (error) {
        console.error('Error deleting project:', error);
        utils.showToast('Error', 'Failed to delete project', 'error');
    }
}

async function addProjectLink() {
    if (!currentProject) return;

    const label = document.getElementById('newLinkLabel').value.trim();
    const url = document.getElementById('newLinkUrl').value.trim();

    if (!label || !url) {
        utils.showToast('Error', 'Label and URL are required', 'error');
        return;
    }

    try {
        await window.api.projects.addLink(currentProject.id, label, url);
        document.getElementById('newLinkLabel').value = '';
        document.getElementById('newLinkUrl').value = '';

        // Reload project to get updated links
        await selectProject(currentProject.id);
        utils.showToast('Success', 'Link added', 'success');
    } catch (error) {
        console.error('Error adding link:', error);
        utils.showToast('Error', 'Failed to add link', 'error');
    }
}

async function removeProjectLink(linkId) {
    try {
        await window.api.projects.removeLink(linkId);
        await selectProject(currentProject.id);
        utils.showToast('Success', 'Link removed', 'success');
    } catch (error) {
        console.error('Error removing link:', error);
        utils.showToast('Error', 'Failed to remove link', 'error');
    }
}

// Initialize event listeners
function initProjectsModule() {
    console.log('initProjectsModule called');

    // Search
    const searchEl = document.getElementById('projectSearch');
    console.log('projectSearch element:', searchEl);
    if (searchEl) {
        searchEl.addEventListener('input', utils.debounce((e) => {
            renderProjectsList(e.target.value);
        }, 300));
    }

    // Add project button
    const addBtn = document.getElementById('addProjectBtn');
    console.log('addProjectBtn element:', addBtn);
    if (addBtn) {
        addBtn.addEventListener('click', () => showProjectForm());
    }

    // Save project button
    const saveBtn = document.getElementById('saveProjectBtn');
    console.log('saveProjectBtn element:', saveBtn);
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            console.log('Save button clicked!');
            saveProject();
        });
    } else {
        console.error('saveProjectBtn not found!');
    }

    // Browse folder button
    const browseBtn = document.getElementById('browsePathBtn');
    if (browseBtn) {
        browseBtn.addEventListener('click', async () => {
            console.log('Browse button clicked');
            const folderPath = await window.api.fs.selectFolder();
            if (folderPath) {
                document.getElementById('projectPath').value = folderPath;
            }
        });
    }

    // Create folder button
    const createFolderBtn = document.getElementById('createFolderBtn');
    if (createFolderBtn) {
        createFolderBtn.addEventListener('click', async () => {
            console.log('Create folder button clicked');
            // First select parent folder
            const parentPath = await window.api.fs.selectFolder();
            if (parentPath) {
                const folderName = prompt('Enter new folder name:');
                if (folderName && folderName.trim()) {
                    try {
                        const newPath = await window.api.fs.createFolder(parentPath, folderName.trim());
                        document.getElementById('projectPath').value = newPath;
                        utils.showToast('Success', 'Folder created', 'success');
                    } catch (error) {
                        utils.showToast('Error', 'Failed to create folder', 'error');
                    }
                }
            }
        });
    }

    // Edit project button
    document.getElementById('editProjectBtn').addEventListener('click', () => {
        if (currentProject) showProjectForm(currentProject.id);
    });

    // Delete project button
    document.getElementById('deleteProjectBtn').addEventListener('click', () => {
        if (currentProject) deleteProject(currentProject.id);
    });

    // Quick actions
    document.getElementById('openInExplorerBtn').addEventListener('click', () => {
        if (currentProject) window.api.fs.openInExplorer(currentProject.root_path);
    });

    document.getElementById('openInVSCodeBtn').addEventListener('click', () => {
        if (currentProject) window.api.fs.openInVSCode(currentProject.root_path);
    });

    document.getElementById('openTerminalBtn').addEventListener('click', () => {
        if (currentProject) window.api.fs.openTerminal(currentProject.root_path);
    });

    // Add link
    document.getElementById('addLinkBtn').addEventListener('click', addProjectLink);

    // Add credential button (in project details)
    document.getElementById('addProjectCredentialBtn').addEventListener('click', () => {
        if (currentProject) {
            window.vault.showCredentialForm(null, currentProject.id);
        }
    });
}

// Export for global access
window.projectsModule = {
    loadProjects,
    selectProject,
    showProjectForm,
    saveProject,
    deleteProject,
    addProjectLink,
    removeProjectLink,
    initProjectsModule,
    getCurrentProject: () => currentProject,
    getProjects: () => projects
};

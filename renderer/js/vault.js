// Vault Module

let credentials = [];
let currentCategory = 'all';
let editingCredentialProjectId = null;

async function checkVaultStatus() {
    const hasPassword = await window.api.vault.hasPassword();

    if (!hasPassword) {
        // First time - set up master password
        showPasswordModal(true);
    } else {
        // Check if locked
        const isLocked = await window.api.vault.isLocked();
        if (isLocked) {
            showPasswordModal(false);
        }
    }
}

function showPasswordModal(isSetup) {
    const modal = new bootstrap.Modal(document.getElementById('passwordModal'), {
        backdrop: 'static',
        keyboard: false
    });

    const titleEl = document.getElementById('passwordModalTitle');
    const descEl = document.getElementById('passwordModalDesc');
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const submitBtn = document.getElementById('passwordSubmit');
    const errorEl = document.getElementById('passwordError');

    errorEl.classList.add('d-none');
    document.getElementById('masterPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    if (isSetup) {
        titleEl.textContent = 'Set Master Password';
        descEl.textContent = 'Create a master password to secure your credentials. This password will be required to access the vault.';
        confirmGroup.classList.remove('d-none');
        submitBtn.textContent = 'Set Password';
    } else {
        titleEl.textContent = 'Unlock Vault';
        descEl.textContent = 'Enter your master password to unlock the credential vault.';
        confirmGroup.classList.add('d-none');
        submitBtn.textContent = 'Unlock';
    }

    modal.show();

    // Focus password input
    setTimeout(() => {
        document.getElementById('masterPassword').focus();
    }, 500);
}

async function handlePasswordSubmit() {
    const password = document.getElementById('masterPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorEl = document.getElementById('passwordError');
    const hasPassword = await window.api.vault.hasPassword();

    errorEl.classList.add('d-none');

    if (!password) {
        errorEl.textContent = 'Password is required';
        errorEl.classList.remove('d-none');
        return;
    }

    if (!hasPassword) {
        // Setting up new password
        if (password !== confirmPassword) {
            errorEl.textContent = 'Passwords do not match';
            errorEl.classList.remove('d-none');
            return;
        }

        if (password.length < 8) {
            errorEl.textContent = 'Password must be at least 8 characters';
            errorEl.classList.remove('d-none');
            return;
        }

        try {
            await window.api.vault.setMasterPassword(password);
            bootstrap.Modal.getInstance(document.getElementById('passwordModal')).hide();
            utils.showToast('Success', 'Master password set successfully', 'success');
        } catch (error) {
            errorEl.textContent = 'Failed to set password';
            errorEl.classList.remove('d-none');
        }
    } else {
        // Unlocking vault
        try {
            const success = await window.api.vault.unlock(password);
            if (success) {
                bootstrap.Modal.getInstance(document.getElementById('passwordModal')).hide();
                utils.showToast('Success', 'Vault unlocked', 'success');
            } else {
                errorEl.textContent = 'Incorrect password';
                errorEl.classList.remove('d-none');
            }
        } catch (error) {
            errorEl.textContent = 'Failed to unlock vault';
            errorEl.classList.remove('d-none');
        }
    }
}

async function openVault() {
    const isLocked = await window.api.vault.isLocked();

    if (isLocked) {
        showPasswordModal(false);
        return;
    }

    // Load credentials and show modal
    await loadCredentials();
    const modal = new bootstrap.Modal(document.getElementById('vaultModal'));
    modal.show();
}

async function lockVault() {
    await window.api.vault.lock();
    bootstrap.Modal.getInstance(document.getElementById('vaultModal')).hide();
    utils.showToast('Info', 'Vault locked', 'info');

    // Refresh project credentials display if a project is open
    const project = window.projectsModule.getCurrentProject();
    if (project) {
        await window.projectsModule.selectProject(project.id);
    }
}

async function loadCredentials(category = 'all') {
    currentCategory = category;

    try {
        credentials = await window.api.vault.list();
        renderCredentialsList();
    } catch (error) {
        console.error('Error loading credentials:', error);
        utils.showToast('Error', 'Failed to load credentials', 'error');
    }
}

function renderCredentialsList() {
    const container = document.getElementById('credentialsList');

    const filtered = currentCategory === 'all'
        ? credentials
        : credentials.filter(c => c.category === currentCategory);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-key display-4"></i>
                <p class="mt-2">No credentials ${currentCategory !== 'all' ? 'in this category' : 'yet'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(cred => `
        <div class="credential-card">
            <div class="cred-header">
                <span class="cred-label">${utils.escapeHtml(cred.label)}</span>
                <span class="cred-category">${utils.escapeHtml(cred.category)}</span>
            </div>
            <div class="cred-details">
                ${cred.project_name ? `<div><i class="bi bi-folder me-1"></i>${utils.escapeHtml(cred.project_name)}</div>` : ''}
                ${cred.host ? `<div><i class="bi bi-hdd-network me-1"></i>${utils.escapeHtml(cred.host)}${cred.port ? ':' + cred.port : ''}</div>` : ''}
                ${cred.username ? `<div><i class="bi bi-person me-1"></i>${utils.escapeHtml(cred.username)}</div>` : ''}
                ${cred.notes ? `<div class="mt-1"><small class="text-muted">${utils.escapeHtml(cred.notes)}</small></div>` : ''}
            </div>
            <div class="cred-actions">
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.vault.showSecret(${cred.id}, this)">
                    <i class="bi bi-eye"></i> Show
                </button>
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.vault.copyCredentialSecret(${cred.id})">
                    <i class="bi bi-clipboard"></i> Copy
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.vault.deleteCredential(${cred.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function showSecret(credId, button) {
    try {
        const secret = await window.api.vault.getSecret(credId);
        const originalHtml = button.innerHTML;

        // Show secret temporarily
        button.innerHTML = `<code>${utils.escapeHtml(secret)}</code>`;
        button.disabled = true;

        setTimeout(() => {
            button.innerHTML = originalHtml;
            button.disabled = false;
        }, 5000);
    } catch (error) {
        console.error('Error showing secret:', error);
        utils.showToast('Error', 'Failed to retrieve secret', 'error');
    }
}

async function copyCredentialSecret(credId) {
    try {
        const success = await window.api.vault.copyToClipboard(credId);
        if (success) {
            utils.showToast('Copied', 'Secret copied to clipboard (auto-clears in 20s)', 'success');
        }
    } catch (error) {
        console.error('Error copying secret:', error);
        utils.showToast('Error', 'Failed to copy secret', 'error');
    }
}

async function deleteCredential(credId) {
    if (!confirm('Are you sure you want to delete this credential?')) {
        return;
    }

    try {
        await window.api.vault.delete(credId);
        utils.showToast('Success', 'Credential deleted', 'success');
        await loadCredentials(currentCategory);

        // Refresh project credentials if project is open
        const project = window.projectsModule.getCurrentProject();
        if (project) {
            const container = document.getElementById('projectCredentialsList');
            if (container) {
                await window.projectsModule.selectProject(project.id);
            }
        }
    } catch (error) {
        console.error('Error deleting credential:', error);
        utils.showToast('Error', 'Failed to delete credential', 'error');
    }
}

function showCredentialForm(credId = null, projectId = null) {
    editingCredentialProjectId = projectId;

    const modal = new bootstrap.Modal(document.getElementById('credentialFormModal'));
    document.getElementById('credentialFormTitle').textContent = credId ? 'Edit Credential' : 'Add Credential';
    document.getElementById('credentialForm').reset();

    // Populate project dropdown
    const projectSelect = document.getElementById('credProject');
    const projects = window.projectsModule.getProjects();
    projectSelect.innerHTML = '<option value="">-- None --</option>' +
        projects.map(p => `<option value="${p.id}" ${p.id === projectId ? 'selected' : ''}>${utils.escapeHtml(p.name)}</option>`).join('');

    // Set up category change handler
    updateDynamicFields();

    modal.show();
}

function updateDynamicFields() {
    const category = document.getElementById('credCategory').value;
    const container = document.getElementById('dynamicFields');

    let html = '';

    switch (category) {
        case 'RDP':
        case 'VPS':
            html = `
                <div class="mb-3">
                    <label for="credHost" class="form-label">Host / IP</label>
                    <input type="text" class="form-control" id="credHost" placeholder="192.168.1.100">
                </div>
                <div class="mb-3">
                    <label for="credPort" class="form-label">Port</label>
                    <input type="number" class="form-control" id="credPort" value="${category === 'RDP' ? '3389' : '22'}">
                </div>
                <div class="mb-3">
                    <label for="credUsername" class="form-label">Username</label>
                    <input type="text" class="form-control" id="credUsername">
                </div>
            `;
            break;

        case 'Hosting':
            html = `
                <div class="mb-3">
                    <label for="credHost" class="form-label">Control Panel URL</label>
                    <input type="url" class="form-control" id="credHost" placeholder="https://cpanel.example.com">
                </div>
                <div class="mb-3">
                    <label for="credUsername" class="form-label">Username</label>
                    <input type="text" class="form-control" id="credUsername">
                </div>
            `;
            break;

        case 'API Keys':
            html = `
                <div class="mb-3">
                    <label for="credHost" class="form-label">API Endpoint (Optional)</label>
                    <input type="url" class="form-control" id="credHost" placeholder="https://api.example.com">
                </div>
                <div class="mb-3">
                    <label for="credUsername" class="form-label">API Key Name (Optional)</label>
                    <input type="text" class="form-control" id="credUsername">
                </div>
            `;
            break;

        case 'Database':
            html = `
                <div class="mb-3">
                    <label for="credHost" class="form-label">Host</label>
                    <input type="text" class="form-control" id="credHost" placeholder="localhost">
                </div>
                <div class="mb-3">
                    <label for="credPort" class="form-label">Port</label>
                    <input type="number" class="form-control" id="credPort" value="5432">
                </div>
                <div class="mb-3">
                    <label for="credUsername" class="form-label">Username</label>
                    <input type="text" class="form-control" id="credUsername">
                </div>
            `;
            break;

        case 'External App':
            html = `
                <div class="mb-3">
                    <label for="credUsername" class="form-label">Username / Email</label>
                    <input type="text" class="form-control" id="credUsername">
                </div>
            `;
            break;
    }

    container.innerHTML = html;
}

async function saveCredential() {
    const data = {
        category: document.getElementById('credCategory').value,
        label: document.getElementById('credLabel').value.trim(),
        project_id: document.getElementById('credProject').value || null,
        username: document.getElementById('credUsername')?.value?.trim() || null,
        host: document.getElementById('credHost')?.value?.trim() || null,
        port: document.getElementById('credPort')?.value ? parseInt(document.getElementById('credPort').value) : null,
        secret: document.getElementById('credSecret').value,
        notes: document.getElementById('credNotes').value.trim() || null
    };

    if (!data.label || !data.secret) {
        utils.showToast('Error', 'Label and secret are required', 'error');
        return;
    }

    try {
        await window.api.vault.create(data);
        utils.showToast('Success', 'Credential saved', 'success');

        bootstrap.Modal.getInstance(document.getElementById('credentialFormModal')).hide();
        await loadCredentials(currentCategory);

        // Refresh project credentials if project is open
        const project = window.projectsModule.getCurrentProject();
        if (project) {
            await window.projectsModule.selectProject(project.id);
        }
    } catch (error) {
        console.error('Error saving credential:', error);
        utils.showToast('Error', 'Failed to save credential', 'error');
    }
}

// Initialize
function initVaultModule() {
    // Password form submit
    document.getElementById('passwordSubmit').addEventListener('click', handlePasswordSubmit);
    document.getElementById('passwordForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handlePasswordSubmit();
    });

    // Vault button
    document.getElementById('vaultBtn').addEventListener('click', openVault);

    // Lock button
    document.getElementById('lockVaultBtn').addEventListener('click', lockVault);

    // Category tabs
    document.querySelectorAll('#vaultTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#vaultTabs .nav-link').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadCredentials(tab.dataset.category);
        });
    });

    // Add credential button
    document.getElementById('addCredentialBtn').addEventListener('click', () => showCredentialForm());

    // Category change
    document.getElementById('credCategory').addEventListener('change', updateDynamicFields);

    // Save credential button
    document.getElementById('saveCredentialBtn').addEventListener('click', saveCredential);

    // Toggle secret visibility
    document.getElementById('toggleSecretVisibility').addEventListener('click', () => {
        const input = document.getElementById('credSecret');
        const icon = document.querySelector('#toggleSecretVisibility i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    });
}

// Export for global access
window.vault = {
    checkVaultStatus,
    openVault,
    lockVault,
    loadCredentials,
    showSecret,
    copyCredentialSecret,
    deleteCredential,
    showCredentialForm,
    saveCredential,
    initVaultModule
};

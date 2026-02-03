// Main App Module

document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initializing...');
    console.log('window.api:', window.api);

    try {
        // Initialize modules
        console.log('Initializing projects module...');
        window.projectsModule.initProjectsModule();

        console.log('Initializing files module...');
        window.files.initFilesModule();

        console.log('Initializing vault module...');
        window.vault.initVaultModule();

        console.log('Initializing export/import...');
        initExportImport();

        // Check vault status (prompt for password if needed)
        console.log('Checking vault status...');
        await window.vault.checkVaultStatus();

        // Load projects
        console.log('Loading projects...');
        await window.projectsModule.loadProjects();

        utils.setStatus('Ready');
        console.log('App initialized successfully');
    } catch (error) {
        console.error('App initialization error:', error);
    }
});

function initExportImport() {
    // Export/Import button
    document.getElementById('exportBtn').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('exportModal'));
        modal.show();
    });

    // Tab switching
    document.querySelectorAll('#exportImportTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#exportImportTabs .nav-link').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            document.getElementById('exportContent').classList.toggle('d-none', tabName !== 'export');
            document.getElementById('importContent').classList.toggle('d-none', tabName !== 'import');
        });
    });

    // Export button
    document.getElementById('doExportBtn').addEventListener('click', async () => {
        try {
            const data = await window.api.export.toJson();
            document.getElementById('exportData').value = data;
            document.getElementById('exportData').classList.remove('d-none');

            // Copy to clipboard
            navigator.clipboard.writeText(data);
            utils.showToast('Success', 'Exported and copied to clipboard', 'success');
        } catch (error) {
            console.error('Error exporting:', error);
            utils.showToast('Error', 'Failed to export', 'error');
        }
    });

    // Import button
    document.getElementById('doImportBtn').addEventListener('click', async () => {
        const data = document.getElementById('importData').value.trim();

        if (!data) {
            utils.showToast('Error', 'Please paste JSON data', 'error');
            return;
        }

        try {
            const count = await window.api.import.fromJson(data);
            utils.showToast('Success', `Imported ${count} projects`, 'success');

            // Reload projects
            await window.projectsModule.loadProjects();

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
        } catch (error) {
            console.error('Error importing:', error);
            utils.showToast('Error', 'Failed to import. Check JSON format.', 'error');
        }
    });
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+N: New project
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        window.projectsModule.showProjectForm();
    }

    // Ctrl+F: Focus search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const projectSearch = document.getElementById('projectSearch');
        const fileSearch = document.getElementById('fileSearch');

        if (document.activeElement === projectSearch) {
            fileSearch.focus();
        } else {
            projectSearch.focus();
        }
    }

    // Escape: Clear search
    if (e.key === 'Escape') {
        document.getElementById('projectSearch').value = '';
        document.getElementById('fileSearch').value = '';
        window.projectsModule.loadProjects();
    }
});

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    utils.showToast('Error', 'An unexpected error occurred', 'error');
});

// Utility Functions

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('appToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');

    toastTitle.textContent = title;
    toastBody.textContent = message;

    // Set toast color based on type
    toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
    if (type === 'success') toast.classList.add('bg-success');
    else if (type === 'error') toast.classList.add('bg-danger');
    else if (type === 'warning') toast.classList.add('bg-warning');

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFileIcon(extension, isDirectory) {
    if (isDirectory) return 'bi-folder-fill';

    const icons = {
        '.js': 'bi-filetype-js',
        '.ts': 'bi-filetype-tsx',
        '.jsx': 'bi-filetype-jsx',
        '.tsx': 'bi-filetype-tsx',
        '.py': 'bi-filetype-py',
        '.html': 'bi-filetype-html',
        '.css': 'bi-filetype-css',
        '.scss': 'bi-filetype-scss',
        '.json': 'bi-filetype-json',
        '.xml': 'bi-filetype-xml',
        '.md': 'bi-filetype-md',
        '.txt': 'bi-file-text',
        '.pdf': 'bi-filetype-pdf',
        '.doc': 'bi-filetype-doc',
        '.docx': 'bi-filetype-docx',
        '.xls': 'bi-filetype-xls',
        '.xlsx': 'bi-filetype-xlsx',
        '.png': 'bi-filetype-png',
        '.jpg': 'bi-filetype-jpg',
        '.jpeg': 'bi-filetype-jpg',
        '.gif': 'bi-filetype-gif',
        '.svg': 'bi-filetype-svg',
        '.sql': 'bi-filetype-sql',
        '.sh': 'bi-terminal',
        '.bat': 'bi-terminal',
        '.exe': 'bi-file-earmark-binary',
        '.zip': 'bi-file-zip',
        '.rar': 'bi-file-zip',
        '.7z': 'bi-file-zip',
        '.tar': 'bi-file-zip',
        '.gz': 'bi-file-zip'
    };

    return icons[extension] || 'bi-file-earmark';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function setStatus(message) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = message;
    }
}

// Export for use in other modules
window.utils = {
    showToast,
    formatFileSize,
    formatDate,
    getFileIcon,
    escapeHtml,
    debounce,
    setStatus
};

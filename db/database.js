const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

function getDbPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'project-navigator.db');
}

function initDatabase() {
    const dbPath = getDbPath();
    console.log('Initializing database at:', dbPath);

    db = new Database(dbPath);
    console.log('Database opened successfully');

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log('Reading schema from:', schemaPath);
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = schema.split(';').filter(s => s.trim());
    console.log('Executing', statements.length, 'schema statements');

    for (const statement of statements) {
        try {
            db.exec(statement);
        } catch (err) {
            // Ignore errors for "INSERT OR IGNORE" type statements
            if (!err.message.includes('UNIQUE constraint')) {
                console.error('Schema error:', err.message);
            }
        }
    }

    console.log('Database initialized successfully');
    return db;
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

// ==================== Settings ====================

function getSettings() {
    const rows = getDb().prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }
    return settings;
}

function getSetting(key) {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
}

function setSetting(key, value) {
    getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    return true;
}

function hasMasterPassword() {
    return getSetting('master_password_hash') !== null;
}

function getMasterPasswordHash() {
    return getSetting('master_password_hash');
}

function setMasterPassword(hash) {
    return setSetting('master_password_hash', hash);
}

// ==================== Projects ====================

function getAllProjects() {
    return getDb().prepare(`
        SELECT * FROM projects
        ORDER BY
            CASE WHEN last_opened_at IS NULL THEN 1 ELSE 0 END,
            last_opened_at DESC,
            created_at DESC
    `).all();
}

function getProject(id) {
    return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

function createProject(data) {
    const stmt = getDb().prepare(`
        INSERT INTO projects (name, root_path, client, platform, tags_json, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        data.name,
        data.root_path,
        data.client || null,
        data.platform || null,
        JSON.stringify(data.tags || []),
        data.notes || null
    );
    return getProject(result.lastInsertRowid);
}

function updateProject(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
        fields.push('name = ?');
        values.push(data.name);
    }
    if (data.root_path !== undefined) {
        fields.push('root_path = ?');
        values.push(data.root_path);
    }
    if (data.client !== undefined) {
        fields.push('client = ?');
        values.push(data.client);
    }
    if (data.platform !== undefined) {
        fields.push('platform = ?');
        values.push(data.platform);
    }
    if (data.tags !== undefined) {
        fields.push('tags_json = ?');
        values.push(JSON.stringify(data.tags));
    }
    if (data.notes !== undefined) {
        fields.push('notes = ?');
        values.push(data.notes);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    getDb().prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return getProject(id);
}

function deleteProject(id) {
    getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
    return true;
}

function updateProjectOpenedAt(id) {
    getDb().prepare('UPDATE projects SET last_opened_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    return getProject(id);
}

// ==================== Project Links ====================

function getProjectLinks(projectId) {
    return getDb().prepare('SELECT * FROM project_links WHERE project_id = ?').all(projectId);
}

function addProjectLink(projectId, label, url) {
    const stmt = getDb().prepare('INSERT INTO project_links (project_id, label, url) VALUES (?, ?, ?)');
    const result = stmt.run(projectId, label, url);
    return { id: result.lastInsertRowid, project_id: projectId, label, url };
}

function removeProjectLink(linkId) {
    getDb().prepare('DELETE FROM project_links WHERE id = ?').run(linkId);
    return true;
}

// ==================== Credentials ====================

function getAllCredentials() {
    return getDb().prepare(`
        SELECT c.*, p.name as project_name
        FROM credentials c
        LEFT JOIN projects p ON c.project_id = p.id
        ORDER BY c.category, c.label
    `).all();
}

function getCredentialsByProject(projectId) {
    return getDb().prepare(`
        SELECT * FROM credentials WHERE project_id = ?
        ORDER BY category, label
    `).all(projectId);
}

function getCredential(id) {
    return getDb().prepare('SELECT * FROM credentials WHERE id = ?').get(id);
}

function createCredential(data) {
    const stmt = getDb().prepare(`
        INSERT INTO credentials (project_id, category, label, username, host, port, keychain_service, keychain_account, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        data.project_id,
        data.category,
        data.label,
        data.username,
        data.host,
        data.port,
        data.keychain_service,
        data.keychain_account,
        data.notes
    );
    return getCredential(result.lastInsertRowid);
}

function deleteCredential(id) {
    getDb().prepare('DELETE FROM credentials WHERE id = ?').run(id);
    return true;
}

// ==================== Categories ====================

function getCategories() {
    return getDb().prepare('SELECT * FROM credential_categories ORDER BY name').all();
}

module.exports = {
    initDatabase,
    getDb,
    getSettings,
    getSetting,
    setSetting,
    hasMasterPassword,
    getMasterPasswordHash,
    setMasterPassword,
    getAllProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    updateProjectOpenedAt,
    getProjectLinks,
    addProjectLink,
    removeProjectLink,
    getAllCredentials,
    getCredentialsByProject,
    getCredential,
    createCredential,
    deleteCredential,
    getCategories
};

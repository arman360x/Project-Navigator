-- Settings table (includes master password hash)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    client TEXT,
    platform TEXT,
    tags_json TEXT DEFAULT '[]',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_opened_at DATETIME
);

-- Project links table
CREATE TABLE IF NOT EXISTS project_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Credentials table (secrets stored in OS keychain, NOT here)
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    username TEXT,
    host TEXT,
    port INTEGER,
    keychain_service TEXT NOT NULL,
    keychain_account TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Credential categories table
CREATE TABLE IF NOT EXISTS credential_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    is_default INTEGER DEFAULT 0
);

-- Insert default categories
INSERT OR IGNORE INTO credential_categories (name, icon, is_default) VALUES
    ('RDP', 'bi-display', 1),
    ('VPS', 'bi-server', 1),
    ('Hosting', 'bi-cloud', 1),
    ('API Keys', 'bi-key', 1),
    ('Database', 'bi-database', 1),
    ('External App', 'bi-app-indicator', 1);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_last_opened ON projects(last_opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_credentials_project ON credentials(project_id);
CREATE INDEX IF NOT EXISTS idx_credentials_category ON credentials(category);
CREATE INDEX IF NOT EXISTS idx_project_links_project ON project_links(project_id);

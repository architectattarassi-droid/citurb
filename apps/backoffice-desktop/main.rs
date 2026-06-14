// CITURBAREA V150 — Backoffice Tauri (Rust + SQLite)
// Doctrine: Append-only, backup atomique, multi-PC

use tauri::State;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;
use sha2::{Sha256, Digest};

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

pub struct AppState {
    db: Mutex<Connection>,
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Serialize, Deserialize)]
pub struct Dossier {
    pub id: String,
    pub user_id: String,
    pub state: String,
    pub project_type: Option<String>,
    pub region: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct DossierEvent {
    pub id: String,
    pub dossier_id: String,
    pub event_type: String,
    pub from_state: Option<String>,
    pub to_state: String,
    pub payload: Option<String>,
    pub hash: String,
    pub prev_hash: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct BackupManifest {
    pub version: String,
    pub timestamp: String,
    pub instance_uuid: String,
    pub schema_version: i32,
    pub files: Vec<String>,
    pub checksums: std::collections::HashMap<String, String>,
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn init_db(state: State<'_, AppState>) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS dossiers (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            state TEXT NOT NULL,
            project_type TEXT,
            region TEXT,
            province TEXT,
            commune TEXT,
            surface REAL,
            budget TEXT,
            pack_id TEXT,
            frozen_at TEXT,
            frozen_reason TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS dossier_events (
            id TEXT PRIMARY KEY,
            dossier_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            from_state TEXT,
            to_state TEXT NOT NULL,
            payload TEXT,
            hash TEXT NOT NULL,
            prev_hash TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (dossier_id) REFERENCES dossiers(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            dossier_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            storage_path TEXT NOT NULL,
            uploaded_at TEXT NOT NULL,
            FOREIGN KEY (dossier_id) REFERENCES dossiers(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Insert metadata
    let instance_uuid = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR IGNORE INTO meta (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        params!["instance_uuid", instance_uuid],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO meta (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        params!["schema_version", "1"],
    ).map_err(|e| e.to_string())?;

    Ok("Database initialized".to_string())
}

#[tauri::command]
pub async fn list_dossiers(state: State<'_, AppState>) -> Result<Vec<Dossier>, String> {
    let conn = state.db.lock().unwrap();
    
    let mut stmt = conn.prepare(
        "SELECT id, user_id, state, project_type, region, created_at, updated_at 
         FROM dossiers ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let dossiers = stmt.query_map([], |row| {
        Ok(Dossier {
            id: row.get(0)?,
            user_id: row.get(1)?,
            state: row.get(2)?,
            project_type: row.get(3)?,
            region: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(dossiers)
}

#[tauri::command]
pub async fn get_dossier_events(
    state: State<'_, AppState>,
    dossier_id: String,
) -> Result<Vec<DossierEvent>, String> {
    let conn = state.db.lock().unwrap();
    
    let mut stmt = conn.prepare(
        "SELECT id, dossier_id, event_type, from_state, to_state, payload, hash, prev_hash, created_at 
         FROM dossier_events WHERE dossier_id = ? ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;

    let events = stmt.query_map([dossier_id], |row| {
        Ok(DossierEvent {
            id: row.get(0)?,
            dossier_id: row.get(1)?,
            event_type: row.get(2)?,
            from_state: row.get(3)?,
            to_state: row.get(4)?,
            payload: row.get(5)?,
            hash: row.get(6)?,
            prev_hash: row.get(7)?,
            created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(events)
}

#[tauri::command]
pub async fn backup_instance(
    state: State<'_, AppState>,
    backup_dir: String,
) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    
    // Get instance metadata
    let instance_uuid: String = conn.query_row(
        "SELECT value FROM meta WHERE key = 'instance_uuid'",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let schema_version: i32 = conn.query_row(
        "SELECT value FROM meta WHERE key = 'schema_version'",
        [],
        |row| row.get::<_, String>(0).map(|v| v.parse().unwrap_or(1))
    ).map_err(|e| e.to_string())?;

    // Create backup directory
    let backup_path = PathBuf::from(&backup_dir);
    fs::create_dir_all(&backup_path).map_err(|e| e.to_string())?;

    // Copy SQLite database
    let db_path = "citurbarea.db"; // TODO: get from config
    let backup_db_path = backup_path.join("citurbarea.db");
    fs::copy(db_path, &backup_db_path).map_err(|e| e.to_string())?;

    // Calculate checksum
    let db_data = fs::read(&backup_db_path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&db_data);
    let db_checksum = format!("{:x}", hasher.finalize());

    // Copy attachments directory
    let attachments_src = PathBuf::from("attachments");
    let attachments_dst = backup_path.join("attachments");
    if attachments_src.exists() {
        copy_dir_recursive(&attachments_src, &attachments_dst)
            .map_err(|e| e.to_string())?;
    }

    // Create manifest
    let mut checksums = std::collections::HashMap::new();
    checksums.insert("citurbarea.db".to_string(), db_checksum);

    let manifest = BackupManifest {
        version: "1.0.0".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        instance_uuid,
        schema_version,
        files: vec!["citurbarea.db".to_string(), "attachments/".to_string()],
        checksums,
    };

    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| e.to_string())?;
    fs::write(backup_path.join("manifest.json"), manifest_json)
        .map_err(|e| e.to_string())?;

    Ok(format!("Backup created: {}", backup_path.display()))
}

#[tauri::command]
pub async fn restore_instance(
    state: State<'_, AppState>,
    backup_dir: String,
) -> Result<String, String> {
    let backup_path = PathBuf::from(&backup_dir);
    
    // Read and verify manifest
    let manifest_data = fs::read_to_string(backup_path.join("manifest.json"))
        .map_err(|e| e.to_string())?;
    let manifest: BackupManifest = serde_json::from_str(&manifest_data)
        .map_err(|e| e.to_string())?;

    // Verify checksums
    let backup_db_path = backup_path.join("citurbarea.db");
    let db_data = fs::read(&backup_db_path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&db_data);
    let db_checksum = format!("{:x}", hasher.finalize());

    if let Some(expected_checksum) = manifest.checksums.get("citurbarea.db") {
        if &db_checksum != expected_checksum {
            return Err("Checksum mismatch! Backup corrupted.".to_string());
        }
    }

    // Restore database
    let db_path = "citurbarea.db";
    fs::copy(&backup_db_path, db_path).map_err(|e| e.to_string())?;

    // Restore attachments
    let attachments_src = backup_path.join("attachments");
    let attachments_dst = PathBuf::from("attachments");
    if attachments_src.exists() {
        copy_dir_recursive(&attachments_src, &attachments_dst)
            .map_err(|e| e.to_string())?;
    }

    Ok(format!("Instance restored from backup: {}", manifest.timestamp))
}

// Helper: recursive directory copy
fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

pub fn init_app_state(db_path: &str) -> AppState {
    let conn = Connection::open(db_path).expect("Failed to open database");
    AppState {
        db: Mutex::new(conn),
    }
}

# db.py: SQLite operations for insurance claims.

import sqlite3
import json
from ..shared.config import INSURANCE_DB_PATH

def init_db():
    """Initialize DB and create claims table."""
    conn = sqlite3.connect(INSURANCE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS insurance_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            api_url TEXT NOT NULL,
            synced BOOLEAN DEFAULT FALSE
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def save_claim_to_db(claim_data: dict, api_url: str):
    """Save claim to DB for queuing."""
    conn = sqlite3.connect(INSURANCE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO insurance_claims (data, api_url) VALUES (?, ?)", (json.dumps(claim_data), api_url))
    conn.commit()
    conn.close()

def get_unsynced_claims():
    """Get unsynced claims."""
    conn = sqlite3.connect(INSURANCE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, data, api_url FROM insurance_claims WHERE synced = FALSE")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "data": json.loads(row[1]), "api_url": row[2]} for row in rows]

def mark_as_synced(claim_id: int):
    """Mark claim as synced."""
    conn = sqlite3.connect(INSURANCE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE insurance_claims SET synced = TRUE WHERE id = ?", (claim_id,))
    conn.commit()
    conn.close()
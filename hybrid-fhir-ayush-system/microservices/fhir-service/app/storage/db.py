import sqlite3
import json
DATABASE_PATH = "local_fhir.db" 
def init_db():  #CREATE DB AGR EXIST NHI KRTA
    connect = sqlite3.connect(DATABASE_PATH)
    cursor = connect.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fhir_bundles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,  
            synced BOOLEAN DEFAULT 0
        )
    ''')
    connect.commit()
    connect.close()

# Call init on import (for MVP; better in app startup later)
init_db()

def save_bundle_to_db(bundle_data: dict): #Saves as JSON STRING
    connect = sqlite3.connect(DATABASE_PATH)
    cursor = connect.cursor()
    cursor.execute(
        "INSERT INTO fhir_bundles (data) VALUES (?)",
        (json.dumps(bundle_data),)   
    )
    connect.commit()
    connect.close()
#BELOW IS NOT INCLUDED IN PROTOTYPE
'''
def get_unsynced_bundles(): #As the name suggests
    connect = sqlite3.connect(DATABASE_PATH)
    cursor = connect.cursor()
    cursor.execute("SELECT id, data FROM fhir_bundles WHERE synced = FALSE")
    rows = cursor.fetchall()
    connect.close()
    return [{"id": row[0], "data": json.loads(row[1])} for row in rows]

def mark_as_synced(bundle_id: int): #As the name suggests
    connect = sqlite3.connect(DATABASE_PATH)
    cursor = connect.cursor()
    cursor.execute("UPDATE fhir_bundles SET synced = TRUE WHERE id = ?", (bundle_id,))
    connect.commit()
    connect.close()
    '''
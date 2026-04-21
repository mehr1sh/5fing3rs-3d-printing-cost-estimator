"""Migration script to add processing_label column to jobs table."""
import os
import sys
from sqlalchemy import text
from app.database.database import engine, get_db

def migrate():
    """Add processing_label column to jobs table."""
    print("Adding processing_label column to jobs table...")
    
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'jobs' 
            AND column_name = 'processing_label'
        """))
        
        if result.fetchone():
            print("Column processing_label already exists. Skipping migration.")
            return
        
        # Add the column
        conn.execute(text("""
            ALTER TABLE jobs 
            ADD COLUMN processing_label VARCHAR(100)
        """))
        conn.commit()
        print("Column processing_label added successfully!")

if __name__ == "__main__":
    migrate()

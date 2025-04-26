import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from pathlib import Path

# Define database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'db', 'inboxiq.db')

# Create engine and session factory
engine = create_engine(f'sqlite:///{DB_PATH}')
SessionFactory = sessionmaker(bind=engine)
Session = scoped_session(SessionFactory)

def get_db_session():
    """Create and return a new database session"""
    return Session()

def init_db(Base):
    """Initialize the database with all defined models"""
    # Make sure the directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Create tables
    Base.metadata.create_all(engine)

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base

# PostgreSQL connection string
DATABASE_URL = "postgresql://postgres:Bazinga#1702@localhost:5432/inboxiq"

# Create engine and session factory with PostgreSQL settings
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300
)
SessionLocal = sessionmaker(bind=engine)
Session = scoped_session(SessionLocal)

def get_db():
    """Generator function to get database session"""
    db = Session()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize the database with all defined models"""
    from .database import Base
    
    # Create tables
    Base.metadata.create_all(engine)

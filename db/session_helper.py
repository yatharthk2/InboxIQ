from .database_helper import SessionLocal

def get_db():
    """Yield a new database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

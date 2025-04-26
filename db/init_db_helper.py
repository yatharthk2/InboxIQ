try:
    # Try relative import (when used as a module)
    from .database import Base
    from .database_helper import engine
except ImportError:
    # Fallback to absolute import (when run as script)
    from database import Base
    from database_helper import engine

def init_db():
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Database initialized successfully.")

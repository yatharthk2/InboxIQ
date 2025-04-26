# Database Management for InboxIQ

This directory contains the database models and helper utilities for managing the SQLite database.

## Files

- `database.py`: SQLAlchemy ORM models for all tables.
- `database_helper.py`: Helper functions for initializing the database and managing sessions.

## Usage

### Initialize the Database

To create all tables, run:

```python
from db.database_helper import init_db
init_db()
```

### Working with Sessions

To interact with the database:

```python
from db.database_helper import get_db

db = next(get_db())
# Use `db` as a SQLAlchemy session
```

## Configuration

- The database uses SQLite and stores data in `inboxiq.db` in the project root.
- To change the database location, modify `DATABASE_URL` in `database_helper.py`.

## Notes

- All UUIDs are stored as strings for SQLite compatibility.
- Use the provided helper functions to avoid session management issues.

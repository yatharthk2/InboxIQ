try:
    from .database_helper import SessionLocal
    from .database import User, EmailAccount
except ImportError:
    from database_helper import SessionLocal
    from database import User, EmailAccount

import datetime
import json
import os

def populate_db():
    """Manually populate the database with sample data."""
    session = SessionLocal()
    try:
        # User info
        user_email = "yatharthk2.nn@gmail.com"
        # Use a dummy hashed password for now (replace with real hash in production)
        hashed_password = "dummyhashedpassword"
        preferences = {}
        created_at = datetime.datetime.utcnow()

        # Check if user already exists
        user = session.query(User).filter_by(email=user_email).first()
        if not user:
            user = User(
                email=user_email,
                hashed_password=hashed_password,
                preferences=preferences,
                created_at=created_at
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        # Email account info
        email_address = "yatharth.casual@gmail.com"
        provider_type = "gmail"
        # Load oauth_tokens from backend/token.json
        token_path = "../backend/token.json"
        if not os.path.exists(token_path):
            raise FileNotFoundError(
                f"OAuth token file not found at '{token_path}'.\n"
                "Please generate it using the Gmail token creator script before populating the database."
            )
        with open(token_path, "r") as f:
            oauth_tokens = f.read()
        last_sync = None

        # Check if email account already exists
        email_account = session.query(EmailAccount).filter_by(email_address=email_address, user_id=user.id).first()
        if not email_account:
            email_account = EmailAccount(
                user_id=user.id,
                email_address=email_address,
                provider_type=provider_type,
                oauth_tokens=oauth_tokens,
                last_sync=last_sync
            )
            session.add(email_account)
            session.commit()

        print("Database populated successfully.")
    finally:
        session.close()

if __name__ == "__main__":
    print("Populating database with sample data...")
    populate_db()
    print("Database populated successfully.")
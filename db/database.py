import os
import datetime
import uuid
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, JSON, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy_utils import EncryptedType, UUIDType
from sqlalchemy_utils.types.encrypted.encrypted_type import AesEngine
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get secret key for encryption (should be in .env file)
SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key-for-dev-only')

# Create SQLAlchemy base
Base = declarative_base()

# Define User model
class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(UUIDType(binary=False), unique=True, default=uuid.uuid4, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    preferences = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    email_accounts = relationship("EmailAccount", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("EmailTag", back_populates="user", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="user", cascade="all, delete-orphan")
    calendar_integrations = relationship("CalendarIntegration", back_populates="user", cascade="all, delete-orphan")

# Define EmailAccount model
class EmailAccount(Base):
    __tablename__ = 'email_accounts'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    email_address = Column(String(255), nullable=False)
    provider_type = Column(String(50), nullable=False)  # e.g., "gmail", "outlook"
    oauth_tokens = Column(EncryptedType(JSON, SECRET_KEY, AesEngine, 'pkcs5'))
    last_sync = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="email_accounts")

# Define EmailTag model
class EmailTag(Base):
    __tablename__ = 'email_tags'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(20), nullable=True)  # e.g., "#FF5733"
    priority = Column(Integer, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="tags")

# Define Workflow model
class Workflow(Base):
    __tablename__ = 'workflows'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    trigger_conditions = Column(JSON, nullable=False)  # JSON structure for conditions
    actions = Column(JSON, nullable=False)  # JSON structure for actions
    status = Column(String(20), nullable=False, default='active')  # active, paused, archived
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="workflows")
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")

# Define WorkflowExecution model
class WorkflowExecution(Base):
    __tablename__ = 'workflow_executions'
    
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey('workflows.id'), nullable=False)
    status = Column(String(20), nullable=False)  # pending, running, completed, failed
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    result_summary = Column(Text, nullable=True)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="executions")

# Define CalendarIntegration model
class CalendarIntegration(Base):
    __tablename__ = 'calendar_integrations'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    provider_type = Column(String(50), nullable=False)  # e.g., "google", "outlook"
    oauth_tokens = Column(EncryptedType(JSON, SECRET_KEY, AesEngine, 'pkcs5'))
    last_sync = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="calendar_integrations")

# Database setup function
def init_db(db_url=None):
    """Initialize the database connection and create tables if they don't exist."""
    if db_url is None:
        # Default to SQLite database for development
        db_url = os.getenv('DATABASE_URL', 'sqlite:///inboxiq.db')
    
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    
    # Create session maker
    Session = sessionmaker(bind=engine)
    return engine, Session

# Utility function to get a database session
def get_session():
    """Return a new database session."""
    _, Session = init_db()
    return Session()

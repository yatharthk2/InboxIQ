from sqlalchemy import (
    create_engine, Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid
from sqlalchemy.types import JSON

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    preferences = Column(JSON)
    created_at = Column(DateTime, nullable=False)

    email_accounts = relationship("EmailAccount", back_populates="user")
    email_tags = relationship("EmailTag", back_populates="user")
    workflows = relationship("Workflow", back_populates="user")
    calendar_integrations = relationship("CalendarIntegration", back_populates="user")

class EmailAccount(Base):
    __tablename__ = 'email_accounts'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    email_address = Column(String, nullable=False)
    provider_type = Column(String, nullable=False)
    oauth_tokens = Column(Text, nullable=False)
    last_sync = Column(DateTime)

    user = relationship("User", back_populates="email_accounts")

class EmailTag(Base):
    __tablename__ = 'email_tags'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String)
    priority = Column(Integer)

    user = relationship("User", back_populates="email_tags")

class Workflow(Base):
    __tablename__ = 'workflows'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String, nullable=False)
    trigger_conditions = Column(JSON)
    actions = Column(JSON)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="workflows")
    executions = relationship("WorkflowExecution", back_populates="workflow")

class WorkflowExecution(Base):
    __tablename__ = 'workflow_executions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(Integer, ForeignKey('workflows.id'), nullable=False)
    status = Column(String, nullable=False)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    result_summary = Column(Text)

    workflow = relationship("Workflow", back_populates="executions")

class CalendarIntegration(Base):
    __tablename__ = 'calendar_integrations'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    provider_type = Column(String, nullable=False)
    oauth_tokens = Column(Text, nullable=False)
    last_sync = Column(DateTime)

    user = relationship("User", back_populates="calendar_integrations")
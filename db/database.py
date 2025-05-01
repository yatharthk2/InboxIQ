from sqlalchemy import (
    create_engine, Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, Boolean, Numeric, func
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid
from sqlalchemy.dialects.postgresql import UUID, JSONB

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)  # SERIAL in PostgreSQL
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    preferences = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=func.now())

    email_accounts = relationship("EmailAccount", back_populates="user", cascade="all, delete-orphan")
    email_tags = relationship("EmailTag", back_populates="user", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="user", cascade="all, delete-orphan")
    calendar_integrations = relationship("CalendarIntegration", back_populates="user", cascade="all, delete-orphan")
    llm_keys = relationship("UserLlmKey", back_populates="user", cascade="all, delete-orphan")
    llm_usage = relationship("LlmApiUsage", back_populates="user", cascade="all, delete-orphan")

class EmailAccount(Base):
    __tablename__ = 'email_accounts'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    email_address = Column(String(255), nullable=False)
    provider_type = Column(String(50), nullable=False)
    oauth_tokens = Column(Text, nullable=False)
    last_sync = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="email_accounts")
    __table_args__ = (UniqueConstraint('user_id', 'email_address', name='uq_email_account_user_email'),)

class EmailTag(Base):
    __tablename__ = 'email_tags'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(20), default='#000000', nullable=False)
    priority = Column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="email_tags")
    __table_args__ = (UniqueConstraint('user_id', 'name', name='uq_email_tag_user_name'),)

class Workflow(Base):
    __tablename__ = 'workflows'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    trigger_conditions = Column(JSONB, nullable=False)
    actions = Column(JSONB, nullable=False)
    status = Column(String(20), default='active', nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

    user = relationship("User", back_populates="workflows")
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint('user_id', 'name', name='uq_workflow_user_name'),)

class WorkflowExecution(Base):
    __tablename__ = 'workflow_executions'
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), nullable=False)
    started_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True))
    result_summary = Column(Text)

    workflow = relationship("Workflow", back_populates="executions")

class CalendarIntegration(Base):
    __tablename__ = 'calendar_integrations'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    provider_type = Column(String(50), nullable=False)
    oauth_tokens = Column(Text, nullable=False)
    last_sync = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="calendar_integrations")
    __table_args__ = (UniqueConstraint('user_id', 'provider_type', name='uq_calendar_user_provider'),)

# New tables for LLM integration

class LlmProvider(Base):
    __tablename__ = 'llmproviders'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    api_url = Column(String(255))
    documentation_url = Column(String(255))
    logo_url = Column(String(255))
    auth_type = Column(String(20), default='api_key', nullable=False)
    required_parameters = Column(JSONB, default={})
    supported_models = Column(JSONB, default=[])
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    user_keys = relationship("UserLlmKey", back_populates="provider", cascade="all, delete-orphan")
    usage = relationship("LlmApiUsage", back_populates="provider", cascade="all, delete-orphan")

class UserLlmKey(Base):
    __tablename__ = 'userllmkeys'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    provider_id = Column(Integer, ForeignKey('llmproviders.id', ondelete='CASCADE'), nullable=False)
    api_key = Column(Text, nullable=False)
    api_key_encrypted = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    default_model = Column(String(100))
    model_preferences = Column(JSONB, default={})
    rate_limit_tokens = Column(Integer)
    monthly_budget = Column(Numeric(10, 2))
    created_at = Column(DateTime(timezone=True), default=func.now())
    last_used = Column(DateTime(timezone=True))
    expiration_date = Column(DateTime(timezone=True))
    usage_count = Column(Integer, default=0)

    user = relationship("User", back_populates="llm_keys")
    provider = relationship("LlmProvider", back_populates="user_keys")
    usage = relationship("LlmApiUsage", back_populates="user_key", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint('user_id', 'provider_id', name='uq_userllmkey_user_provider'),)

class LlmApiUsage(Base):
    __tablename__ = 'llmapiusage'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    provider_id = Column(Integer, ForeignKey('llmproviders.id', ondelete='CASCADE'), nullable=False)
    user_llm_key_id = Column(Integer, ForeignKey('userllmkeys.id', ondelete=None))
    request_id = Column(UUID(as_uuid=True), nullable=False, default=uuid.uuid4)
    tokens_input = Column(Integer, default=0, nullable=False)
    tokens_output = Column(Integer, default=0, nullable=False)
    cost_estimate = Column(Numeric(10, 6))
    model_name = Column(String(100), nullable=False)
    request_type = Column(String(50), nullable=False)
    feature_context = Column(String(50))
    prompt_tokens = Column(JSONB)
    request_timestamp = Column(DateTime(timezone=True), default=func.now())
    response_timestamp = Column(DateTime(timezone=True))
    response_time_ms = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)

    user = relationship("User", back_populates="llm_usage")
    provider = relationship("LlmProvider", back_populates="usage")
    user_key = relationship("UserLlmKey", back_populates="usage")
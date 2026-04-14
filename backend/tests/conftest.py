"""
Shared pytest fixtures for unit and integration tests.
Uses an in-memory SQLite database so no real PostgreSQL is needed to run tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db
from app.models.user import User
from app.models.material import Material
from app.models.admin_config import AdminConfig
from app.models.slicing_result import SlicingResult
from app.models.job import Job
from app.api.auth import get_password_hash, create_access_token
from datetime import timedelta

# ---------------------------------------------------------------------------
# In-memory SQLite engine — no external DB required
# ---------------------------------------------------------------------------
SQLALCHEMY_TEST_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # single connection shared across threads
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """
    Per-test database session.
    Creates all tables before the test, drops them after.
    Each test gets a completely clean database.
    """
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """
    FastAPI TestClient with the real DB dependency overridden
    to use the in-memory test database.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass  # session lifecycle managed by the db fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seed helpers — reusable across test files
# ---------------------------------------------------------------------------

@pytest.fixture
def verified_user(db):
    """A regular verified customer user."""
    user = User(
        username="testuser",
        password_hash=get_password_hash("testpass123"),
        email="test@example.com",
        role="customer",
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def unverified_user(db):
    """A user who registered but has not verified their OTP yet."""
    user = User(
        username="unverified",
        password_hash=get_password_hash("pass123"),
        email="unverified@example.com",
        role="customer",
        is_verified=False,
        verification_code="123456",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db):
    """An admin user."""
    user = User(
        username="adminuser",
        password_hash=get_password_hash("adminpass123"),
        email="admin@example.com",
        role="admin",
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_token(verified_user):
    """JWT token for the verified customer user."""
    return create_access_token(
        data={"sub": verified_user.username},
        expires_delta=timedelta(minutes=60),
    )


@pytest.fixture
def admin_token(admin_user):
    """JWT token for the admin user."""
    return create_access_token(
        data={"sub": admin_user.username},
        expires_delta=timedelta(minutes=60),
    )


@pytest.fixture
def pla_material(db):
    """A seeded PLA material row."""
    material = Material(
        name="PLA",
        density_g_cm3=1.24,
        cost_per_gram=2.5,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@pytest.fixture
def admin_config(db):
    """Seeded admin config rows for cost calculation."""
    configs = [
        AdminConfig(key="machine_hourly_rate", value="500", description="Machine cost per hour in INR"),
        AdminConfig(key="waste_factor", value="1.25", description="Waste overhead multiplier"),
        AdminConfig(key="failure_factor", value="1.25", description="Failure overhead multiplier"),
    ]
    for c in configs:
        db.add(c)
    db.commit()
    return configs
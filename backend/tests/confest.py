"""
Test configuration: patches PostgreSQL-specific JSONB type to plain JSON
so all tests can run against an in-memory SQLite database without Docker.
"""
import pytest
from sqlalchemy import create_engine, JSON
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# --- Patch JSONB → JSON before any app module is imported ---
from sqlalchemy.dialects.postgresql import JSONB
import sqlalchemy.dialects.postgresql as pg_dialect
pg_dialect.JSONB = JSON          # module-level alias
import app.models.slicing_result as sr_mod
sr_mod.JSONB = JSON              # patch the already-imported name in the model
# Re-point the column type on the mapped class
from app.models.slicing_result import SlicingResult
SlicingResult.slicing_parameters = SlicingResult.__table__.c.slicing_parameters
SlicingResult.__table__.c.slicing_parameters.type = JSON()
# --- End patch ---

from app.database.database import Base, get_db
from app.main import app

SQLALCHEMY_TEST_URL = "sqlite:///./test_run.db"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    """Provide a transactional DB session; rolls back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    """FastAPI TestClient wired to the test DB session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    """Register a user and return credentials."""
    payload = {
        "username": "fixture_user",
        "password": "Fixture_Pass99",
        "email": "fixture@example.com",
    }
    client.post("/api/auth/register", json=payload)
    return payload


@pytest.fixture()
def auth_token(client, registered_user):
    """Return a valid JWT token for the fixture user."""
    resp = client.post(
        "/api/auth/login",
        data={
            "username": registered_user["username"],
            "password": registered_user["password"],
        },
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture()
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

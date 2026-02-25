"""Create database tables."""
from app.database.database import engine, Base
from app.models import Job, SlicingResult, Material, User, FailureLog, AdminConfig

if __name__ == "__main__":
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

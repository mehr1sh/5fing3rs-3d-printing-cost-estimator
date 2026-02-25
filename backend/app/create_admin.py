"""Create admin user."""
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user(db: Session, username: str = "admin", password: str = "admin123", email: str = "admin@fivefingers.com"):
    """Create admin user."""
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        print(f"User {username} already exists")
        return existing
    
    hashed_password = pwd_context.hash(password)
    admin_user = User(
        username=username,
        password_hash=hashed_password,
        email=email,
        role="admin"
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    print(f"Admin user created: {username}")
    return admin_user

if __name__ == "__main__":
    import sys
    username = sys.argv[1] if len(sys.argv) > 1 else "admin"
    password = sys.argv[2] if len(sys.argv) > 2 else "admin123"
    email = sys.argv[3] if len(sys.argv) > 3 else "admin@fivefingers.com"
    
    db = SessionLocal()
    try:
        create_admin_user(db, username, password, email)
    finally:
        db.close()

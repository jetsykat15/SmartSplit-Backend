from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# This creates a local SQLite file named 'expenses.db' in your folder
DATABASE_URL = "sqlite:///./expenses.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Helper function to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
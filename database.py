import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://fastapi_user:fastapi123@localhost:5432/fastapi_db")

# Use pool_pre_ping to automatically reconnect on stale connections
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


class Base(DeclarativeBase):
    pass


def check_db_connection() -> bool:
    """Safe check for database connectivity without crashing import."""
    try:
        with engine.connect() as connection:
            return True
    except Exception as e:
        print(f"Database connection check failed: {e}")
        return False


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
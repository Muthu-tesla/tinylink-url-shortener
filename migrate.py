from sqlalchemy import text, inspect
from database import engine, Base
from models import User, URL


def run_migrations():
    print("Running database migrations...")
    # 1. Create tables if they do not exist
    Base.metadata.create_all(bind=engine)

    # 2. Add any missing columns in a non-destructive manner
    with engine.begin() as conn:
        inspector = inspect(conn)
        columns = [c["name"] for c in inspector.get_columns("urls")]

        if "clicks" not in columns:
            print("Adding 'clicks' column to 'urls' table...")
            conn.execute(
                text("ALTER TABLE urls ADD COLUMN clicks INTEGER DEFAULT 0 NOT NULL;")
            )
            print("Column 'clicks' added successfully.")
        else:
            print("Column 'clicks' already exists.")

        # Ensure indexes exist
        try:
            conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_urls_user_id ON urls(user_id);")
            )
            conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_urls_short_code ON urls(short_code);")
            )
            print("Indexes verified.")
        except Exception as idx_err:
            print(f"Index check/creation notice: {idx_err}")

    print("Database migrations completed successfully!")


if __name__ == "__main__":
    run_migrations()

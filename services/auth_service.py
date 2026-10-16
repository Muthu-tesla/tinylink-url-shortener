from sqlalchemy.orm import Session
from models import User
from schemas import UserCreate
from auth import hash_password, verify_password


def register_user(
    db: Session,
    data: UserCreate
) -> User | None:
    # Check if email is already registered (case-insensitive)
    existing_user = db.query(User).filter(
        User.email.ilike(data.email.strip())
    ).first()

    if existing_user:
        return None

    user = User(
        name=data.name.strip(),
        email=data.email.strip().lower(),
        password_hash=hash_password(data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def authenticate_user(
    db: Session,
    email: str,
    password: str
) -> User | None:
    user = db.query(User).filter(
        User.email.ilike(email.strip())
    ).first()

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user
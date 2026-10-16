from database import SessionLocal
from models import User

db = SessionLocal()

user = User(
    name="Muthu",
    email="muthu@example.com"
)

db.add(user)
db.commit()
db.refresh(user)

print(f"User created with ID: {user.id}")


db.close()
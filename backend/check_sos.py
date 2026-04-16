from app.db.database import SessionLocal
from app.db.models import SOS, Message, MessageType

db = SessionLocal()

print("=== Checking SOS Records ===")
sos_records = db.query(SOS).order_by(SOS.created_at.desc()).limit(10).all()
print(f"Total SOS records: {db.query(SOS).count()}")
print(f"\nLast 10 SOS records:")
for sos in sos_records:
    print(f"  ID: {sos.id}, User: {sos.user_id}, Status: {sos.status}, Ability: {sos.ability}, Created: {sos.created_at}")

print("\n=== Checking Message Records (SOS type) ===")
sos_messages = db.query(Message).filter(Message.message_type == MessageType.SOS).order_by(Message.created_at.desc()).limit(10).all()
print(f"Total SOS messages: {db.query(Message).filter(Message.message_type == MessageType.SOS).count()}")
print(f"\nLast 10 SOS messages:")
for msg in sos_messages:
    print(f"  ID: {msg.id}, User: {msg.user_id}, Title: {msg.title}, Read: {msg.is_read}, Created: {msg.created_at}")

db.close()

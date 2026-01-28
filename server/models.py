from app import db
from datetime import datetime
import uuid

class Application(db.Model):
    __tablename__ = 'applications'
    
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    applicant_email = db.Column(db.String(255), nullable=False)
    applicant_name = db.Column(db.String(255), nullable=False)
    application_status = db.Column(db.String(50), default='awaiting_payment', nullable=False)
    payment_status = db.Column(db.String(50), default='pending', nullable=False)
    form_data = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Application {self.application_id}>'
    
    @staticmethod
    def generate_application_id():
        return f'CP-{uuid.uuid4().hex[:8].upper()}'

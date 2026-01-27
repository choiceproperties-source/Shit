import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

app = Flask(__name__, static_folder='../public')
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    app_id = db.Column(db.String(20), unique=True, nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    property_address = db.Column(db.String(255), nullable=False)
    application_status = db.Column(db.String(50), default="awaiting_payment")
    payment_status = db.Column(db.String(50), default="pending")
    payment_marked_by = db.Column(db.String(100))
    payment_marked_at = db.Column(db.DateTime)
    payment_note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    data = db.Column(db.JSON)

with app.app_context():
    db.create_all()

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/applications', methods=['POST'])
def submit_application():
    data = request.json
    app_id = 'APP-' + str(uuid.uuid4())[:8].upper()
    
    new_app = Application(
        app_id=app_id,
        first_name=data.get('firstName'),
        last_name=data.get('lastName'),
        email=data.get('email'),
        property_address=data.get('propertyAddress'),
        data=data
    )
    
    db.session.add(new_app)
    db.session.commit()
    
    # Send email trigger
    send_initial_email(new_app.email, app_id)
    
    return jsonify({"status": "success", "app_id": app_id}), 201

def send_initial_email(to_email, app_id):
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL')
    
    if not api_key or not from_email:
        return
        
    subject = "Application Received – Payment Required to Proceed"
    content = f"""
    <h3>Application Received Successfully</h3>
    <p>Your unique Application ID is: <b>{app_id}</b></p>
    <p>An application fee is required before our team can begin the review process.</p>
    <p>Please note that payment is made outside of this system. Once your payment is confirmed by our staff, your application status will be updated.</p>
    <p>You can track your status on the applicant dashboard.</p>
    """
    
    message = Mail(
        from_email=from_email,
        to_emails=to_email,
        subject=subject,
        html_content=content
    )
    
    try:
        sg = SendGridAPIClient(api_key)
        sg.send(message)
    except Exception as e:
        print(f"Error sending email: {e}")

@app.route('/api/send-email', methods=['POST'])
def send_email():
    data = request.json
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL')
    
    if not api_key or not from_email:
        lang = request.headers.get('Accept-Language', 'en')
        error_msg = "SendGrid not configured on server" if lang.startswith('en') else "SendGrid no está configurado en el servidor"
        return jsonify({"error": error_msg}), 500

    message = Mail(
        from_email=from_email,
        to_emails=data.get('to'),
        subject=data.get('subject'),
        html_content=data.get('content')
    )
    
    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        lang = request.headers.get('Accept-Language', 'en')
        success_msg = "Email sent" if lang.startswith('en') else "Correo electrónico enviado"
        return jsonify({"status": "success", "message": success_msg}), 200
    except Exception as e:
        lang = request.headers.get('Accept-Language', 'en')
        error_prefix = "Error: " if lang.startswith('en') else "Error: "
        return jsonify({"error": f"{error_prefix}{str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

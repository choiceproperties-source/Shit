import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

app = Flask(__name__, static_folder='../public')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/send-email', methods=['POST'])
def send_email():
    data = request.json
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL')
    
    if not api_key or not from_email:
        return jsonify({"error": "SendGrid not configured on server"}), 500

    message = Mail(
        from_email=from_email,
        to_emails=data.get('to'),
        subject=data.get('subject'),
        html_content=data.get('content')
    )
    
    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return jsonify({"status": "success", "message": "Email sent"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app import app, db
from models import Application

CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('../public', 'index.html')

@app.route('/dashboard')
@app.route('/dashboard/')
def serve_dashboard():
    return send_from_directory('../public/dashboard', 'index.html')

@app.route('/admin')
@app.route('/admin/')
def serve_admin():
    return send_from_directory('../public/admin', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../public', path)

@app.route('/api/submit-application', methods=['POST'])
def submit_application():
    try:
        data = request.json
        applicant_email = data.get('email')
        # ... logic ...
        applicant_name = f"{data.get('firstName', '')} {data.get('lastName', '')}".strip()
        lang = request.headers.get('Accept-Language', 'en').startswith('es') and 'es' or 'en'
        
        if not applicant_email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Generate unique application_id
        application_id = Application.generate_application_id()
        
        # Create application record with statuses set as required
        app_record = Application()
        app_record.application_id = application_id
        app_record.applicant_email = applicant_email
        app_record.applicant_name = applicant_name
        app_record.application_status = 'awaiting_payment'
        app_record.payment_status = 'pending'
        app_record.form_data = data
        
        db.session.add(app_record)
        db.session.commit()
        
        # Send confirmation email to applicant
        _send_confirmation_email(applicant_email, applicant_name, application_id, lang)
        
        # Notify Admin
        _send_admin_notification(data, application_id)
        
        return jsonify({
            'status': 'success',
            'application_id': application_id,
            'message': 'Application received successfully' if lang == 'en' else 'Solicitud recibida exitosamente'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def _get_email_template(title, content, lang='en'):
    primary_color = "#1a5276"
    secondary_color = "#3498db"
    accent_color = "#e67e22"
    
    footer_en = "Choice Properties Management. Professional Property Management Solutions."
    footer_es = "Gestión de Choice Properties. Soluciones Profesionales de Gestión de Propiedades."
    footer = footer_es if lang == 'es' else footer_en
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .wrapper {{ background-color: #f5f7fa; padding: 40px 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, {primary_color}, {secondary_color}); color: #ffffff; padding: 30px; text-align: center; }}
            .logo {{ font-size: 24px; font-weight: bold; margin-bottom: 5px; }}
            .content {{ padding: 30px; }}
            .footer {{ background: #f8f9fa; color: #7f8c8d; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #eee; }}
            .button {{ display: inline-block; padding: 12px 25px; background: {accent_color}; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }}
            .id-box {{ background: #e8f4fc; border-left: 4px solid {secondary_color}; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 18px; }}
            h2 {{ color: {primary_color}; margin-top: 0; }}
            .highlight {{ color: {accent_color}; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <div class="logo">CHOICE PROPERTIES</div>
                    <div style="font-size: 14px; opacity: 0.9;">{title}</div>
                </div>
                <div class="content">
                    {content}
                </div>
                <div class="footer">
                    <p>{footer}</p>
                    <p>&copy; 2026 Choice Properties. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def _send_confirmation_email(to_email, applicant_name, application_id, lang='en'):
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL')
    if not api_key or not from_email: return

    if lang == 'es':
        subject = 'Solicitud Recibida – Pago Requerido'
        title = "Confirmación de Solicitud"
        body = f"""
            <h2>¡Hola {applicant_name}!</h2>
            <p>Agradecemos haber recibido su solicitud de arrendamiento para Choice Properties.</p>
            <div class="id-box">ID de Solicitud: <strong>{application_id}</strong></div>
            <h3>Próximo Paso: Pago de la Tarifa</h3>
            <p>Para proceder, se requiere una tarifa de <span class="highlight">$50</span> (no reembolsable).</p>
            <p><strong>Nota:</strong> El pago se maneja fuera de este sistema. Por favor, comuníquese con nuestro equipo para obtener instrucciones.</p>
            <a href="{request.host_url}dashboard/?id={application_id}" class="button">Ver Mi Dashboard</a>
        """
    else:
        subject = 'Application Received – Payment Required'
        title = "Application Confirmation"
        body = f"""
            <h2>Hello {applicant_name}!</h2>
            <p>Thank you for submitting your rental application to Choice Properties.</p>
            <div class="id-box">Application ID: <strong>{application_id}</strong></div>
            <h3>Next Step: Application Fee Payment</h3>
            <p>To proceed, an application fee of <span class="highlight">$50</span> (non-refundable) is required.</p>
            <p><strong>Please Note:</strong> Payment is handled outside this system. Contact our team for instructions.</p>
            <a href="{request.host_url}dashboard/?id={application_id}" class="button">View My Dashboard</a>
        """
    
    content = _get_email_template(title, body, lang)
    message = Mail(from_email=from_email, to_emails=to_email, subject=subject, html_content=content)
    try:
        SendGridAPIClient(api_key).send(message)
    except Exception as e:
        print(f"Email fail: {e}")

def sendStatusChangeEmail(to_email, name, status, app_id, is_payment_confirmation=False):
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL')
    if not api_key or not from_email: return

    dashboard_url = f"{request.host_url}dashboard/?id={app_id}"
    
    if is_payment_confirmation:
        subject = "Payment Confirmed – Choice Properties"
        title = "Payment Confirmation"
        body = f"<h2>Hello {name},</h2><p>We have confirmed your payment. Your application is now <span class='highlight'>Under Review</span>.</p>"
    else:
        status_text = status.replace('_', ' ').title()
        subject = f"Application Status Update: {status_text}"
        title = "Status Update"
        body = f"<h2>Hello {name},</h2><p>Your application status has been updated to: <span class='highlight'>{status_text}</span>.</p>"
        if status == 'denied':
            body += "<p style='margin-top:20px; font-size:11px; color:#7f8c8d;'>Choice Properties complies with Fair Housing laws. We do not discriminate based on race, color, religion, national origin, sex, familial status, or disability.</p>"

    body += f"<a href='{dashboard_url}' class='button'>Go to Dashboard</a>"
    
    content = _get_email_template(title, body)
    message = Mail(from_email=from_email, to_emails=to_email, subject=subject, html_content=content)
    try:
        SendGridAPIClient(api_key).send(message)
    except Exception as e:
        print(f"Email fail: {e}")

@app.route('/api/admin/application/<app_id>/payment', methods=['POST'])
def admin_update_payment(app_id):
    try:
        app_record = Application.query.filter_by(application_id=app_id).first()
        if not app_record: return jsonify({'error': 'Not found'}), 404
        
        status = request.json.get('status')
        if status == 'paid':
            app_record.payment_status = 'paid'
            app_record.application_status = 'under_review'
            db.session.commit()
            
            # Trigger Email helper
            sendStatusChangeEmail(
                app_record.applicant_email, 
                app_record.applicant_name, 
                'under_review', 
                app_id,
                is_payment_confirmation=True
            )
            
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/application/<app_id>/status', methods=['POST'])
def admin_update_status(app_id):
    try:
        app_record = Application.query.filter_by(application_id=app_id).first()
        if not app_record: return jsonify({'error': 'Not found'}), 404
        
        status = request.json.get('status')
        app_record.application_status = status
        db.session.commit()
        
        # Trigger Email helper
        sendStatusChangeEmail(
            app_record.applicant_email, 
            app_record.applicant_name, 
            status, 
            app_id
        )
        
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recover-id', methods=['POST'])
def recover_application_id():
    try:
        email = request.json.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        apps = Application.query.filter_by(applicant_email=email).all()
        if not apps:
            # We return success anyway for security to prevent email enumeration
            return jsonify({'status': 'success', 'message': 'If an application exists for this email, we have sent the details.'}), 200
            
        api_key = os.environ.get('SENDGRID_API_KEY')
        from_email = os.environ.get('SENDGRID_FROM_EMAIL')
        if not api_key or not from_email:
            return jsonify({'error': 'Email service not configured'}), 500
            
        id_list = "".join([f"<li style='margin-bottom:10px;'>ID: <strong class='highlight'>{a.application_id}</strong> - Status: {a.application_status.replace('_', ' ').title()}</li>" for a in apps])
        
        subject = "Choice Properties - Application ID Recovery"
        title = "Application Recovery"
        body = f"""
            <h2>Application ID Recovery</h2>
            <p>We found the following applications associated with your email:</p>
            <ul style="list-style: none; padding: 0;">{id_list}</ul>
            <p>You can use these IDs to access your dashboard below.</p>
            <a href="{request.host_url}dashboard/" class="button">Access Dashboard</a>
        """
        
        content = _get_email_template(title, body)
        message = Mail(from_email=from_email, to_emails=email, subject=subject, html_content=content)
        SendGridAPIClient(api_key).send(message)
        
        return jsonify({'status': 'success', 'message': 'Email sent with your application details.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _send_admin_notification(form_data, application_id):
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL')
    
    # Support multiple admin emails via comma-separated secret or list
    admin_emails_raw = os.environ.get('ADMIN_NOTIFICATION_EMAIL')
    if admin_emails_raw is None:
        admin_emails_raw = from_email
    
    admin_emails = [e.strip() for e in admin_emails_raw.split(',') if e.strip()]
    
    if not api_key or not from_email or not admin_emails: return

    applicant_name = f"{form_data.get('firstName', '')} {form_data.get('lastName', '')}"
    property_address = form_data.get('propertyAddress', 'N/A')
    
    subject = f"NEW APPLICATION: {applicant_name} - {application_id}"
    title = "New Application Alert"
    
    body = f"""
        <h2 style="color: #1a5276;">New Rental Application Received</h2>
        <p>A new application has been submitted through the portal.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
            <p><strong>Applicant:</strong> {applicant_name}</p>
            <p><strong>Property:</strong> {property_address}</p>
            <p><strong>Application ID:</strong> <span class="highlight">{application_id}</span></p>
        </div>
        <p>Log in to the Admin Dashboard to review the full details and manage the approval workflow.</p>
        <a href="{request.host_url}admin/" class="button">View Admin Dashboard</a>
    """
    
    content = _get_email_template(title, body)
    
    # Send to all configured admin emails
    message = Mail(
        from_email=from_email,
        to_emails=admin_emails,
        subject=subject,
        html_content=content,
        is_multiple=True
    )
    
    try:
        SendGridAPIClient(api_key).send(message)
    except Exception as e:
        print(f"Admin Notification fail: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

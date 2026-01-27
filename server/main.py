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

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../public', path)

@app.route('/api/submit-application', methods=['POST'])
def submit_application():
    try:
        data = request.json
        applicant_email = data.get('email')
        applicant_name = data.get('firstName', '') + ' ' + data.get('lastName', '')
        lang = request.headers.get('Accept-Language', 'en').startswith('es') and 'es' or 'en'
        
        if not applicant_email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Generate unique application_id
        application_id = Application.generate_application_id()
        
        # Create application record
        app_record = Application(
            application_id=application_id,
            applicant_email=applicant_email,
            applicant_name=applicant_name.strip(),
            application_status='awaiting_payment',
            payment_status='pending',
            form_data=data
        )
        
        db.session.add(app_record)
        db.session.commit()
        
        # Send confirmation email
        _send_confirmation_email(applicant_email, applicant_name, application_id, lang)
        
        return jsonify({
            'status': 'success',
            'application_id': application_id,
            'message': 'Application received successfully' if lang == 'en' else 'Solicitud recibida exitosamente'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def _send_confirmation_email(to_email, applicant_name, application_id, lang='en'):
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL')
    
    if not api_key or not from_email:
        return
    
    if lang == 'es':
        subject = 'Solicitud Recibida – Pago Requerido para Continuar'
        content = f'''
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h2>¡Hola {applicant_name}!</h2>
                <p>Agradecemos haber recibido su solicitud de arrendamiento para Choice Properties.</p>
                
                <h3>ID de Solicitud: <strong>{application_id}</strong></h3>
                
                <h3>Próximo Paso: Pago de la Tarifa de Solicitud</h3>
                <p>Para proceder con la revisión de su solicitud, se requiere una tarifa de solicitud de <strong>$50</strong> (no reembolsable).</p>
                
                <p><strong>Tenga en cuenta:</strong> El pago de la tarifa se maneja fuera de este sistema. Por favor, comuníquese con nuestro equipo de gestión de propiedades para obtener instrucciones de pago.</p>
                
                <h3>¿Qué Sucede Después?</h3>
                <ol>
                    <li>Una vez confirmado el pago, iniciaremos la revisión de su solicitud</li>
                    <li>Podemos solicitar verificación de empleo, crédito o referencias adicionales</li>
                    <li>Recibirá una notificación sobre el estado de su solicitud dentro de 2-3 días hábiles</li>
                </ol>
                
                <p>Para ver el estado de su solicitud, visite nuestro panel de aplicantes y use su ID de solicitud: <strong>{application_id}</strong></p>
                
                <p>Si tiene preguntas, no dude en comunicarse con nosotros.</p>
                <p>Saludos cordiales,<br>Equipo de Choice Properties</p>
            </body>
        </html>
        '''
    else:
        subject = 'Application Received – Payment Required to Proceed'
        content = f'''
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h2>Hello {applicant_name}!</h2>
                <p>Thank you for submitting your rental application to Choice Properties.</p>
                
                <h3>Application ID: <strong>{application_id}</strong></h3>
                
                <h3>Next Step: Application Fee Payment</h3>
                <p>To proceed with the review of your application, an application fee of <strong>$50</strong> (non-refundable) is required.</p>
                
                <p><strong>Please Note:</strong> Payment is handled outside this system. Please contact our property management team for payment instructions.</p>
                
                <h3>What Happens Next?</h3>
                <ol>
                    <li>Once payment is confirmed, we will begin reviewing your application</li>
                    <li>We may request employment verification, credit check, or additional references</li>
                    <li>You will receive notification of your application status within 2-3 business days</li>
                </ol>
                
                <p>To check your application status, visit our applicant dashboard and use your Application ID: <strong>{application_id}</strong></p>
                
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Best regards,<br>Choice Properties Team</p>
            </body>
        </html>
        '''
    
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
        print(f"Failed to send email: {str(e)}")

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

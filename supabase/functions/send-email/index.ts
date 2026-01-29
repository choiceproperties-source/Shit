import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

serve(async (req) => {
  try {
    const { 
      application_id, 
      applicant_email, 
      applicant_name, 
      status, 
      optional_message 
    } = await req.json()

    let subject = ""
    let htmlContent = ""

    const footer = `
      <hr>
      <p><em>Choice Properties Management</em></p>
    `

    if (status === 'awaiting_payment') {
      subject = "Application Received – Payment Required to Proceed / Solicitud Recibida – Pago Requerido"
      htmlContent = `
        <h3>Hello ${applicant_name},</h3>
        <p>We have received your application <strong>${application_id}</strong>. To begin the review process, a non-refundable $50 application fee is required.</p>
        <p><strong>Zelle:</strong> choiceproperties@email.com<br><strong>Venmo:</strong> @ChoiceProperties</p>
        <p>Please include your Application ID in the payment memo.</p>
        <br>
        <h3>Hola ${applicant_name},</h3>
        <p>Hemos recibido su solicitud <strong>${application_id}</strong>. Para comenzar el proceso de revisión, se requiere una tarifa de solicitud no reembolsable de $50.</p>
        <p><strong>Zelle:</strong> choiceproperties@email.com<br><strong>Venmo:</strong> @ChoiceProperties</p>
        <p>Por favor, incluya su ID de Solicitud en la nota de pago.</p>
        ${footer}
      `
    } else if (status === 'under_review') {
      subject = "Payment Confirmed – Application Now Under Review / Pago Confirmado – Solicitud en Revisión"
      htmlContent = `
        <h3>Hello ${applicant_name},</h3>
        <p>We have confirmed your payment for application <strong>${application_id}</strong>. Our team is now reviewing your information.</p>
        <br>
        <h3>Hola ${applicant_name},</h3>
        <p>Hemos confirmado su pago para la solicitud <strong>${application_id}</strong>. Nuestro equipo está revisando su información.</p>
        ${footer}
      `
    } else if (status === 'approved') {
      subject = "Application Approved! / ¡Solicitud Aprobada!"
      htmlContent = `
        <h3>Congratulations ${applicant_name}!</h3>
        <p>Your application <strong>${application_id}</strong> has been approved. A representative will contact you shortly with next steps.</p>
        <br>
        <h3>¡Felicidades ${applicant_name}!</h3>
        <p>Su solicitud <strong>${application_id}</strong> ha sido aprobada. Un representante se pondrá en contacto con usted pronto.</p>
        ${footer}
      `
    } else if (status === 'denied') {
      subject = "Update regarding your application / Actualización sobre su solicitud"
      htmlContent = `
        <h3>Hello ${applicant_name},</h3>
        <p>Thank you for your interest in Choice Properties. Regarding application <strong>${application_id}</strong>, we are unable to move forward at this time.</p>
        <br>
        <h3>Hola ${applicant_name},</h3>
        <p>Gracias por su interés en Choice Properties. Con respecto a la solicitud <strong>${application_id}</strong>, no podemos proceder en este momento.</p>
        ${footer}
      `
    } else {
      subject = "Update on your Application / Actualización de su Solicitud"
      htmlContent = `
        <h3>Hello ${applicant_name},</h3>
        <p>There has been an update to your application <strong>${application_id}</strong>.</p>
        ${optional_message ? `<p><strong>Message:</strong> ${optional_message}</p>` : ''}
        <br>
        <h3>Hola ${applicant_name},</h3>
        <p>Ha habido una actualización en su solicitud <strong>${application_id}</strong>.</p>
        ${optional_message ? `<p><strong>Mensaje:</strong> ${optional_message}</p>` : ''}
        ${footer}
      `
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: applicant_email }] }],
        from: { email: 'noreply@choiceproperties.com', name: 'Choice Properties' },
        subject: subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`SendGrid error: ${err}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

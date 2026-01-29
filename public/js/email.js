/**
 * sendPaymentConfirmedEmail
 * Sends a confirmation email to the applicant once their payment is verified.
 * 
 * Note: This function is intended for use in a secure environment (Supabase Edge Functions, 
 * Netlify Functions, or a Node.js backend) to protect your SendGrid API key.
 * 
 * @param {string} applicant_email - Recipient email address
 * @param {string} applicant_name - Full name of the applicant
 * @param {string} application_id - Unique application reference ID
 */
export async function sendPaymentConfirmedEmail(applicant_email, applicant_name, application_id) {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
    const DASHBOARD_URL = `${process.env.PUBLIC_URL || ''}/dashboard/?id=${application_id}`;

    const subject = "Payment Confirmed – Application Now Under Review";
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1a5276, #3498db); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Choice Properties</h1>
                <p style="margin: 5px 0 0; opacity: 0.9;">Payment Confirmation</p>
            </div>
            <div style="padding: 30px; line-height: 1.6;">
                <h2>Hello ${applicant_name},</h2>
                <p>We have successfully confirmed receipt of your application fee for <strong>${application_id}</strong>.</p>
                
                <div style="background: #e8f4fc; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Status Update:</strong> Your application is now <span style="color: #e67e22; font-weight: bold;">Under Review</span>.</p>
                </div>
                
                <h3>What's Next?</h3>
                <p>Our management team has begun the verification process. This typically includes:</p>
                <ul>
                    <li>Employment and income verification</li>
                    <li>Rental history check</li>
                    <li>Background and credit screening</li>
                </ul>
                
                <p><strong>Timeline:</strong> Please allow <strong>2-3 business days</strong> for a final decision.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${DASHBOARD_URL}" style="background: #e67e22; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Your Dashboard</a>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                
                <p style="font-size: 14px;"><strong>Need assistance?</strong><br>
                Reply to this email or contact our support team at <a href="mailto:support@choiceproperties.com">support@choiceproperties.com</a>.</p>
            </div>
            <div style="background: #f8f9fa; color: #7f8c8d; padding: 20px; text-align: center; font-size: 12px;">
                <p>&copy; 2026 Choice Properties. All rights reserved.<br>
                Choice Properties complies with Fair Housing laws.</p>
            </div>
        </div>
    `;

    // Example using standard fetch (compatible with Supabase Edge Functions)
    try {
        const response = await fetch('https://api.sendgrid.com/v2/mail.send.json', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                to: applicant_email,
                from: FROM_EMAIL,
                subject: subject,
                html: htmlContent,
                fromname: 'Choice Properties Management'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(JSON.stringify(error));
        }

        return { success: true };
    } catch (err) {
        console.error('Email Error:', err);
        return { success: false, error: err.message };
    }
}

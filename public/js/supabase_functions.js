/**
 * submitApplication
 * Handles the rental application submission to Supabase
 * @param {Object} supabase - Initialized Supabase client
 * @param {Object} formData - Key-value pairs from the form
 * @returns {Promise<Object>} Result of the submission
 */
export async function submitApplication(supabase, formData) {
    try {
        if (!supabase) throw new Error("Supabase client not provided");

        // 1. Generate unique application_id (CP-YYYYMMDD-RANDOM)
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const applicationId = `CP-${date}-${randomStr}`;

        // 2. Extract specific fields for indexing/searching
        const applicantEmail = formData.email || formData.Email;
        const applicantName = `${formData.firstName || formData['First Name'] || ''} ${formData.lastName || formData['Last Name'] || ''}`.trim();

        // 3. Prepare payload for 'rental_applications' table
        const payload = {
            application_id: applicationId,
            applicant_email: applicantEmail,
            applicant_name: applicantName,
            application_status: "awaiting_payment",
            payment_status: "pending",
            form_data: formData, // JSONB column
            created_at: new Date().toISOString()
        };

        // 4. Save to Supabase
        const { data, error } = await supabase
            .from('rental_applications')
            .insert([payload])
            .select();

        if (error) throw error;

        // 5. Trigger email notification (via Supabase Edge Function or Webhook if configured)
        // Note: Direct SendGrid calls from frontend are not recommended for security.
        // It's better to have a Supabase Database Webhook or Edge Function listen to inserts.
        
        return {
            success: true,
            applicationId: applicationId,
            data: data[0]
        };

    } catch (error) {
        console.error("Error submitting application:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

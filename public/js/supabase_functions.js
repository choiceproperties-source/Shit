/**
 * supabase_functions.js
 * Core logic for interacting with Supabase.
 */

/**
 * submitApplication
 * Handles the rental application submission to Supabase
 */
export async function submitApplication(supabase, formData) {
    try {
        if (!supabase) throw new Error("Supabase client not provided");

        // 1. Generate unique application_id (CP-YYYYMMDD-RANDOM)
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const applicationId = `CP-${date}-${randomStr}`;

        // 2. Prepare payload for 'rental_applications' table
        const payload = {
            application_id: applicationId,
            applicant_email: formData.email || formData.Email,
            applicant_name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
            property_address: formData.propertyAddress,
            application_status: "awaiting_payment",
            payment_status: "pending",
            form_data: formData,
            created_at: new Date().toISOString()
        };

        // 3. Save to Supabase
        const { data, error } = await supabase
            .from('rental_applications')
            .insert([payload])
            .select();

        if (error) throw error;

        // 4. Trigger email notification via Edge Function
        try {
            await supabase.functions.invoke('send-email', {
                body: { 
                    type: 'submission',
                    applicationId: applicationId,
                    recipientEmail: payload.applicant_email,
                    applicantName: payload.applicant_name
                }
            });
        } catch (emailErr) {
            console.warn("Email trigger failed, but application was saved:", emailErr);
        }
        
        return { success: true, applicationId: applicationId, data: data[0] };

    } catch (error) {
        console.error("Error submitting application:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * uploadDocument
 * Securely uploads a file to the 'application-documents' bucket.
 * 
 * @param {Object} supabase - Initialized Supabase client
 * @param {File} file - The file object from input
 * @param {string} applicationId - The ID of the application
 * @param {string} category - 'photo-id' or 'income-verification'
 * @returns {Promise<Object>} Upload result with path
 */
export async function uploadDocument(supabase, file, applicationId, category) {
    try {
        if (!supabase) throw new Error("Supabase client not provided");
        
        const uuid = Math.random().toString(36).substring(2, 15);
        const fileExt = file.name.split('.').pop();
        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        
        // Structured path: /applications/{application_id}/{category}/{uuid}-{original_filename}
        const filePath = `applications/${applicationId}/${category}/${uuid}-${safeFileName}`;

        const { data, error: uploadError } = await supabase.storage
            .from('application-documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        return { 
            success: true, 
            path: filePath,
            fullUrl: data.path 
        };
    } catch (error) {
        console.error("Storage upload error:", error);
        return { success: false, error: error.message };
    }
}

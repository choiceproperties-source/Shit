# Choice Properties Project Audit Report
**Date:** January 29, 2026
**Status:** In Progress / Migration Phase

---

### 1️⃣ FRONTEND ANALYSIS
**Pages & Components:**
- **Home (`/`):** Multi-step rental application form.
  - **Step 1: Property & Applicant:** Property Address*, Move-in Date*, Lease Term*, First/Last Name*, Email*, Phone*, DOB*, SSN (Optional/Sensitive).
  - **Step 2: Residency & Occupancy:** Current Address*, Duration*, Rent*, Reason for Leaving*, Landlord Name/Phone*, Occupants, Pets.
  - **Step 3: Employment & Income:** Status*, Employer*, Job Title*, Duration*, Supervisor Name/Phone*, Monthly Income* (Sensitive).
  - **Step 4: Financial & References:** References (2), Emergency Contact.
  - **Step 5: Review & Submit:** Summary, Document Upload (Optional), Legal Declaration.
- **Dashboard (`/dashboard`):** Applicant status tracking.
  - Login via Application ID.
  - Sections: Status Banner, Application Details, Review Timeline, Payment Info.
- **Admin (`/admin`):** Management portal.
  - Views: Application List, Application Detail/Review.

**Logic & UX:**
- **Validations:** Real-time field validation (email format, phone, required fields).
- **Auto-save:** LocalStorage persistence (30s interval).
- **Dynamic Behavior:** Bilingual support (EN/ES), conditional pet details, SSN visibility toggle.
- **Missing Features:** 
  - True multi-file upload progress.
  - Form validation for all sub-sections before "Next" (currently mostly HTML5).
  - Interactive maps for address autocomplete.

---

### 2️⃣ BACKEND / DATABASE ANALYSIS
**Schema:**
- **Table `applications`:**
  - `id` (PK), `application_id` (Unique ID), `applicant_email`, `applicant_name`, `application_status` (awaiting_payment, under_review, approved, denied), `payment_status` (pending, paid), `form_data` (JSON blob of all form fields), `created_at`, `updated_at`.
- **Supabase Integration:** Code references a `rental_applications` table in Supabase, suggesting a dual-database or migration state.

**Logic:**
- **Application ID Generation:** `CP-` prefix + 8-char random hex.
- **Notifications:** SendGrid integration for confirmation, status updates, and admin alerts.
- **Recovery:** Endpoint to email application IDs based on email address.

---

### 3️⃣ AUTHENTICATION & ROLES
- **Applicants:** No password. Access via `Application ID` (Token-based approach).
- **Admin:** Hardcoded allowlist in JS (`admin@choiceproperties.com`). No secure server-side session management for admin routes yet (currently relies on `localStorage` check).
- **Missing:** 
  - Admin login page with password/MFA.
  - Email verification for applicants.

---

### 4️⃣ EMAIL & NOTIFICATIONS (SendGrid)
- **Triggers:**
  - **Submission:** Confirmation to applicant + notification to admin.
  - **Payment Update:** Confirmation of payment received.
  - **Status Change:** Notification of "Under Review", "Approved", or "Denied".
  - **Recovery:** Email sent with list of IDs.
- **Missing:** Reminder emails for unpaid applications or incomplete forms.

---

### 5️⃣ FILE STORAGE & UPLOADS
- **Current State:** Frontend has a "Document Upload" section, but backend logic for permanent storage (S3/Cloudinary/Object Storage) is not fully implemented in the Flask routes.
- **Security:** No current server-side file scanning or private signed URL logic implemented.

---

### 6️⃣ DASHBOARDS & UI WORKFLOW
- **Applicant:** High-level status banner. Timeline visualizes progress.
- **Admin:** List view with badges. Detail view allows updating payment (Pending -> Paid) and Application Status.
- **Missing:** 
  - Comment/Notes section for admins on applications.
  - Document viewer for uploaded IDs/Paystubs.

---

### 7️⃣ SECURITY & BEST PRACTICES
- **Sensitive Data:** SSN is marked as "Encrypted" in UI, but stored in a JSON column.
- **Issues:** 
  - Admin routes (`/admin`) lack server-side Auth middleware.
  - API keys (Supabase) are exposed in frontend JS.

---

### 8️⃣ REMAINING WORK
1. **Server-Side Admin Auth:** Implement Flask-Login or similar for `/admin`.
2. **Secure File Storage:** Integrate Replit Object Storage for document uploads.
3. **Encryption:** Move sensitive fields (SSN) to encrypted columns or separate vault.
4. **Payment Integration:** Implement Stripe/PayPal for the $50 fee instead of "manual" confirmation.
5. **Form Refinement:** Add server-side validation for the JSON `form_data`.
6. **Unified Database:** Resolve the split between PostgreSQL and Supabase references.

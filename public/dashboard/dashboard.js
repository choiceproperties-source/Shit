document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new ApplicantDashboard();
    dashboard.init();
});

class ApplicantDashboard {
    constructor() {
        this.appId = new URLSearchParams(window.location.search).get('id');
        this.elements = {
            login: document.getElementById('loginState'),
            loginAppId: document.getElementById('loginAppId'),
            viewStatusBtn: document.getElementById('viewStatusBtn'),
            loginError: document.getElementById('loginError'),
            loading: document.getElementById('loadingState'),
            error: document.getElementById('errorState'),
            view: document.getElementById('dashboardView'),
            banner: document.getElementById('statusBanner'),
            displayAppId: document.getElementById('displayAppId'),
            displayProperty: document.getElementById('displayProperty'),
            displayDate: document.getElementById('displayDate'),
            timeline: document.getElementById('timelineSection'),
            paymentCard: document.getElementById('paymentInfoCard'),
            logoutBtn: document.getElementById('logoutBtn'),
            docCard: document.getElementById('documentCard'),
            docListContainer: document.getElementById('docListContainer'),
            uploadBtn: document.getElementById('uploadBtn'),
            docInput: document.getElementById('additionalDocInput'),
            uploadStatus: document.getElementById('uploadStatus')
        };
        
        this.supabaseClient = null;
        this.setupLogin();
        this.setupRecovery();
        this.setupUpload();
    }

    setupUpload() {
        if (this.elements.uploadBtn) {
            this.elements.uploadBtn.addEventListener('click', () => this.elements.docInput.click());
        }

        if (this.elements.docInput) {
            this.elements.docInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    this.elements.uploadStatus.textContent = 'Uploading...';
                    this.elements.uploadStatus.classList.remove('hidden');
                    this.elements.uploadBtn.disabled = true;

                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                    const filePath = `applications/${this.appId}/additional/${fileName}`;

                    const { error: uploadError } = await this.supabaseClient.storage
                        .from('application-documents')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    // Update form_data.documents in rental_applications
                    const { data: currentApp } = await this.supabaseClient
                        .from('rental_applications')
                        .select('form_data')
                        .eq('application_id', this.appId)
                        .single();

                    const formData = currentApp.form_data || {};
                    const documents = formData.documents || [];
                    documents.push({
                        name: file.name,
                        path: filePath,
                        uploaded_at: new Date().toISOString()
                    });
                    formData.documents = documents;

                    const { error: updateError } = await this.supabaseClient
                        .from('rental_applications')
                        .update({ form_data: formData })
                        .eq('application_id', this.appId);

                    if (updateError) throw updateError;

                    this.elements.uploadStatus.textContent = 'Uploaded successfully!';
                    this.elements.uploadStatus.style.color = 'var(--success)';
                } catch (err) {
                    console.error('Upload error:', err);
                    this.elements.uploadStatus.textContent = 'Upload failed.';
                    this.elements.uploadStatus.style.color = 'var(--danger)';
                } finally {
                    this.elements.uploadBtn.disabled = false;
                    setTimeout(() => {
                        this.elements.uploadStatus.classList.add('hidden');
                    }, 3000);
                }
            });
        }
    }

    setupLogin() {
        if (this.elements.viewStatusBtn) {
            this.elements.viewStatusBtn.addEventListener('click', () => {
                const id = this.elements.loginAppId.value.trim().toUpperCase();
                if (id) {
                    if (!id.startsWith('CP-')) {
                        this.elements.loginError.textContent = 'IDs must start with CP-';
                        this.elements.loginError.classList.remove('hidden');
                        return;
                    }
                    window.location.search = `?id=${id}`;
                }
            });
        }
        
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
    }

    setupRecovery() {
        const forgotBtn = document.getElementById('forgotIdBtn');
        const modal = document.getElementById('recoveryModal');
        const closeBtn = document.getElementById('closeRecoveryBtn');
        const sendBtn = document.getElementById('sendRecoveryBtn');
        const emailInput = document.getElementById('recoveryEmail');
        const message = document.getElementById('recoveryMessage');

        if (forgotBtn) forgotBtn.onclick = () => modal.classList.remove('hidden');
        if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
        
        if (sendBtn) {
            sendBtn.onclick = async () => {
                const email = emailInput.value.trim();
                if (!email) return;
                
                sendBtn.disabled = true;
                sendBtn.textContent = 'Sending...';
                
                // Trigger recovery via Edge Function
                try {
                    const config = {
                        URL: "https://pwqjungiwusflcflukeg.supabase.co/",
                        KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cWp1bmdpd3VzZmxjZmx1a2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDIwODAsImV4cCI6MjA4NTA3ODA4MH0.yq_0LfPc81cq_ptDZGnxbs3RDfhW8PlQaTfYUs_bsLE"
                    };
                    const client = supabase.createClient(config.URL, config.KEY);
                    
                    const { error } = await client.functions.invoke('recover-id', {
                        body: { email }
                    });

                    if (error) throw error;

                    message.textContent = 'If an application exists, you will receive an email with your ID(s).';
                    message.classList.remove('hidden');
                    message.style.color = 'var(--success)';
                } catch (err) {
                    console.error('Recovery error:', err);
                    message.textContent = 'Failed to request recovery. Please try again later.';
                    message.classList.remove('hidden');
                    message.style.color = 'var(--danger)';
                } finally {
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Send IDs';
                }
            };
        }
    }

    async init() {
        if (!this.appId) {
            this.showLogin();
            return;
        }

        try {
            this.elements.login.classList.add('hidden');
            this.elements.loading.classList.remove('hidden');
            const data = await this.fetchApplicationStatus();
            if (data) {
                this.renderDashboard(data);
            } else {
                this.showError('Application not found.');
            }
        } catch (err) {
            console.error(err);
            this.showError('An error occurred while fetching your application.');
        }
    }

    showLogin() {
        this.elements.loading.classList.add('hidden');
        this.elements.login.classList.remove('hidden');
    }

    async fetchApplicationStatus() {
        if (typeof supabase === 'undefined') {
            console.error('Supabase not loaded');
            return null;
        }
        
        const config = {
            URL: "https://pwqjungiwusflcflukeg.supabase.co/",
            KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cWp1bmdpd3VzZmxjZmx1a2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDIwODAsImV4cCI6MjA4NTA3ODA4MH0.yq_0LfPc81cq_ptDZGnxbs3RDfhW8PlQaTfYUs_bsLE"
        };
        
        this.supabaseClient = supabase.createClient(config.URL, config.KEY);

        // 1. Setup Realtime Subscription
        this.supabaseClient
            .channel('db-changes')
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'rental_applications',
                filter: `application_id=eq.${this.appId}`
            }, payload => {
                console.log('Realtime update:', payload.new);
                this.renderDashboard(payload.new);
            })
            .subscribe();

        // 2. Initial Fetch
        const { data, error } = await this.supabaseClient
            .from('rental_applications')
            .select('*')
            .eq('application_id', this.appId)
            .single();
            
        if (error) {
            console.error('Supabase fetch error:', error);
            return null;
        }
        return data;
    }

    async getSignedUrl(filePath) {
        const { data, error } = await this.supabaseClient.storage.from('application-documents').createSignedUrl(filePath, 3600);
        return error ? null : data.signedUrl;
    }

    renderDashboard(app) {
        this.elements.loading.classList.add('hidden');
        this.elements.view.classList.remove('hidden');

        // Basic Info
        this.elements.displayAppId.textContent = app.application_id;
        this.elements.displayProperty.textContent = app.property_address || 'Property Application';
        this.elements.displayDate.textContent = new Date(app.created_at).toLocaleDateString();

        const status = app.application_status;
        const payment = app.payment_status;

        // Render Documents
        this.renderDocuments(app);

        // Logic based on requirements
        if (payment === 'pending') {
            this.renderAwaitingPayment();
        } else if (payment === 'paid' && status === 'under_review') {
            this.renderUnderReview();
        } else if (status === 'approved') {
            this.renderApproved();
        } else if (status === 'denied') {
            this.renderDenied();
        } else {
            this.renderUnderReview();
        }
    }

    async renderDocuments(app) {
        if (this.elements.docCard) this.elements.docCard.classList.remove('hidden');
        const docs = app.form_data?.documents || [];
        
        if (docs.length === 0) {
            this.elements.docListContainer.innerHTML = '<p style="font-size:0.9rem; color:var(--text-muted);">No documents uploaded.</p>';
            return;
        }

        this.elements.docListContainer.innerHTML = '<ul id="docList" style="list-style:none; padding:0;"></ul>';
        const docList = document.getElementById('docList');

        for (const doc of docs) {
            const li = document.createElement('li');
            li.style.cssText = 'margin-bottom:10px; font-size:0.9rem; display:flex; align-items:center; gap:8px;';
            const url = await this.getSignedUrl(doc.path);
            li.innerHTML = `
                <i class="fas fa-file-alt"></i>
                <span style="flex:1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${doc.name}</span>
                ${url ? `<a href="${url}" target="_blank" style="color:var(--primary); text-decoration:none;"><i class="fas fa-download"></i></a>` : '<i class="fas fa-lock" title="URL expired"></i>'}
            `;
            docList.appendChild(li);
        }
    }

    renderAwaitingPayment() {
        this.elements.banner.className = 'status-banner banner-pending';
        this.elements.banner.innerHTML = `
            <i class="fas fa-clock" style="color: #f1c40f;"></i>
            <div>
                <div style="font-weight: bold;">🟡 Awaiting Payment Confirmation</div>
                <div style="font-size: 0.85rem; margin-top: 5px; opacity: 0.9;">
                    Please complete the $50 application fee to begin the review process.
                </div>
            </div>
        `;
        
        this.updateBadges('awaiting_payment', 'pending');
        
        if (this.elements.paymentCard) {
            this.elements.paymentCard.innerHTML = `
                <h3><i class="fas fa-info-circle"></i> Payment Required</h3>
                <p>A non-refundable <strong>$50 application fee</strong> is required before we can begin reviewing your application.</p>
                <div class="payment-note" style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p><strong>Accepted Methods:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px; font-size: 0.9rem;">
                        <li>Zelle (choiceproperties@email.com)</li>
                        <li>Venmo (@ChoiceProperties)</li>
                    </ul>
                    <p style="font-size: 0.85rem; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; margin-top: 10px;">
                        <em>Include App ID: <strong>${this.appId}</strong> in memo.</em>
                    </p>
                </div>
            `;
            this.elements.paymentCard.classList.remove('hidden');
        }
        this.elements.timeline.classList.add('hidden');
    }

    renderUnderReview() {
        this.elements.banner.className = 'status-banner banner-review';
        this.elements.banner.innerHTML = `
            <i class="fas fa-search"></i>
            <div>Application Under Review</div>
        `;
        this.updateBadges('under_review', 'paid');
        this.elements.timeline.classList.remove('hidden');
        this.elements.paymentCard.classList.add('hidden');
        
        document.getElementById('paymentStep').classList.add('completed');
        document.getElementById('paymentStep').querySelector('.step-icon').innerHTML = '<i class="fas fa-check"></i>';
        document.getElementById('reviewStep').classList.add('active');
    }

    renderApproved() {
        this.elements.banner.className = 'status-banner banner-approved';
        this.elements.banner.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <div>Congratulations! Your Application is Approved</div>
        `;
        this.updateBadges('approved', 'paid');
        this.elements.timeline.classList.remove('hidden');
        this.elements.paymentCard.classList.add('hidden');
        
        ['paymentStep', 'reviewStep', 'finalStep'].forEach(id => {
            const step = document.getElementById(id);
            step.classList.add('completed');
            step.querySelector('.step-icon').innerHTML = '<i class="fas fa-check"></i>';
        });
    }

    renderDenied() {
        this.elements.banner.className = 'status-banner banner-denied';
        this.elements.banner.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <div>Application Decision Reached</div>
        `;
        this.updateBadges('denied', 'paid');
        this.elements.timeline.classList.add('hidden');
        this.elements.paymentCard.classList.add('hidden');
    }

    updateBadges(status, payment) {
        const detailsList = document.querySelector('.details-list');
        if (!detailsList) return;

        let statusBadge = document.getElementById('appStatusBadge');
        if (!statusBadge) {
            statusBadge = document.createElement('div');
            statusBadge.className = 'detail-item';
            statusBadge.id = 'appStatusBadge';
            detailsList.appendChild(statusBadge);
        }

        const statusColors = {
            'awaiting_payment': '#f1c40f',
            'under_review': '#3498db',
            'approved': '#2ecc71',
            'denied': '#e74c3c'
        };

        statusBadge.innerHTML = `
            <span class="label">Status:</span>
            <span class="value"><span class="badge" style="background: ${statusColors[status] || '#7f8c8d'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">${status.replace('_', ' ')}</span></span>
        `;

        let paymentBadge = document.getElementById('paymentBadge');
        if (!paymentBadge) {
            paymentBadge = document.createElement('div');
            paymentBadge.className = 'detail-item';
            paymentBadge.id = 'paymentBadge';
            detailsList.appendChild(paymentBadge);
        }
        paymentBadge.innerHTML = `
            <span class="label">Payment:</span>
            <span class="value"><span class="badge" style="background: ${payment === 'paid' ? '#2ecc71' : '#f1c40f'}; color: ${payment === 'paid' ? 'white' : 'black'}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">${payment}</span></span>
        `;
    }

    showError(msg) {
        this.elements.loading.classList.add('hidden');
        this.elements.error.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = msg;
    }
}

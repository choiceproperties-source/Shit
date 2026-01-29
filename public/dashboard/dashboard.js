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
            logoutBtn: document.getElementById('logoutBtn')
        };
        
        this.setupLogin();
        this.setupRecovery();
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
        
        const client = supabase.createClient(config.URL, config.KEY);

        // 1. Setup Realtime Subscription
        client
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
        const { data, error } = await client
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
        const config = {
            URL: "https://pwqjungiwusflcflukeg.supabase.co/",
            KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cWp1bmdpd3VzZmxjZmx1a2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDIwODAsImV4cCI6MjA4NTA3ODA4MH0.yq_0LfPc81cq_ptDZGnxbs3RDfhW8PlQaTfYUs_bsLE"
        };
        const client = supabase.createClient(config.URL, config.KEY);
        const { data, error } = await client.storage.from('application-documents').createSignedUrl(filePath, 3600);
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
        const sideCol = document.querySelector('.side-column');
        let docCard = document.getElementById('documentCard');
        if (!docCard) {
            docCard = document.createElement('div');
            docCard.id = 'documentCard';
            docCard.className = 'card';
            sideCol.insertBefore(docCard, sideCol.lastElementChild);
        }

        const docs = app.form_data?.documents || [];
        if (docs.length === 0) {
            docCard.innerHTML = '<h3><i class="fas fa-file-pdf"></i> Documents</h3><p style="font-size:0.9rem; color:var(--text-muted);">No documents uploaded.</p>';
            return;
        }

        docCard.innerHTML = '<h3><i class="fas fa-file-pdf"></i> Documents</h3><ul id="docList" style="list-style:none; padding:0;"></ul>';
        const docList = document.getElementById('docList');

        for (const doc of docs) {
            const li = document.createElement('li');
            li.style.cssText = 'margin-bottom:10px; font-size:0.9rem; display:flex; align-items:center; gap:8px;';
            const url = await this.getSignedUrl(doc.path);
            li.innerHTML = `
                <i class="fas fa-file-alt"></i>
                <span style="flex:1;">${doc.name}</span>
                ${url ? `<a href="${url}" target="_blank" style="color:var(--primary); text-decoration:none;"><i class="fas fa-download"></i></a>` : ''}
            `;
            docList.appendChild(li);
        }
    }

    renderAwaitingPayment() {
        this.elements.banner.className = 'status-banner banner-pending';
        this.elements.banner.innerHTML = `
            <i class="fas fa-clock" style="color: #f1c40f;"></i>
            <div>
                <div style="font-weight: bold;">🟡 Application Submitted – Awaiting Payment Confirmation</div>
                <div style="font-size: 0.85rem; margin-top: 5px; opacity: 0.9;">
                    Your application has been received. Please complete the $50 application fee to begin the review process.
                </div>
            </div>
        `;
        
        // Add Payment Pending badge if not exists
        const detailsList = document.querySelector('.details-list');
        if (detailsList && !document.getElementById('paymentBadge')) {
            const badgeItem = document.createElement('div');
            badgeItem.className = 'detail-item';
            badgeItem.id = 'paymentBadge';
            badgeItem.innerHTML = `
                <span class="label">Payment Status:</span>
                <span class="value"><span class="badge pay-pending" style="background: #f1c40f; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">PENDING</span></span>
            `;
            detailsList.appendChild(badgeItem);
        }

        // Update Payment Info Card with accepted methods
        if (this.elements.paymentCard) {
            this.elements.paymentCard.innerHTML = `
                <h3><i class="fas fa-info-circle"></i> Payment Required</h3>
                <p>A non-refundable <strong>$50 application fee</strong> is required before we can begin reviewing your application.</p>
                <div class="payment-note" style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p><strong>Accepted Payment Methods:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px; font-size: 0.9rem;">
                        <li>Zelle (choiceproperties@email.com)</li>
                        <li>Venmo (@ChoiceProperties)</li>
                        <li>Cashier's Check / Money Order</li>
                    </ul>
                    <p style="font-size: 0.85rem; border-top: 1px solid rgba(255,255,255,0.2); pt-10; margin-top: 10px;">
                        <em>Note: Please include your Application ID in the payment memo.</em>
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
        this.elements.timeline.classList.remove('hidden');
        
        // Update timeline steps
        document.getElementById('paymentStep').classList.add('completed');
        document.getElementById('paymentStep').querySelector('.step-icon').innerHTML = '<i class="fas fa-check"></i>';
        document.getElementById('paymentStep').querySelector('p').textContent = 'Fee confirmed.';
        
        document.getElementById('reviewStep').classList.add('active');
    }

    renderApproved() {
        this.elements.banner.className = 'status-banner banner-approved';
        this.elements.banner.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <div>Congratulations! Your Application is Approved</div>
        `;
        this.elements.timeline.classList.remove('hidden');
        
        // Complete all steps
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
        
        const mainCol = document.querySelector('.main-column');
        const card = document.createElement('section');
        card.className = 'card';
        card.innerHTML = `
            <h3>Application Status</h3>
            <p>Thank you for your interest in Choice Properties. At this time, we are unable to approve your application.</p>
            <p style="margin-top: 15px; font-size: 0.85rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 15px;">
                <strong>Decision Notice:</strong> Decisions are based on a combination of factors including income requirements, credit history, and rental references. We appreciate the opportunity to review your application.
            </p>
            <p style="margin-top: 15px; font-size: 0.85rem; color: var(--text-muted);">
                <strong>Fair Housing Notice:</strong> We are committed to compliance with all federal, state, and local fair housing laws. We do not discriminate against any person because of race, color, religion, national origin, sex, familial status, disability, or any other protected characteristic.
            </p>
        `;
        mainCol.appendChild(card);
        this.elements.timeline.classList.add('hidden');
    }

    showError(msg) {
        this.elements.loading.classList.add('hidden');
        this.elements.error.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = msg;
    }
}

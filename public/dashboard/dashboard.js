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
                
                try {
                    const res = await fetch('/api/recover-id', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const data = await res.json();
                    
                    message.textContent = data.message || data.error;
                    message.classList.remove('hidden');
                    message.style.color = data.error ? 'var(--danger)' : 'var(--success)';
                } catch (err) {
                    message.textContent = 'Connection error. Please try again.';
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
        const response = await fetch(`/api/application-status/${this.appId}`);
        if (!response.ok) return null;
        return await response.json();
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
            // Default/Fallback
            this.renderUnderReview();
        }
    }

    renderAwaitingPayment() {
        this.elements.banner.className = 'status-banner banner-pending';
        this.elements.banner.innerHTML = `
            <i class="fas fa-clock"></i>
            <div>Application Submitted – Awaiting Payment Confirmation</div>
        `;
        this.elements.paymentCard.classList.remove('hidden');
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
            <i class="fas fa-info-circle"></i>
            <div>Application Decision Reached</div>
        `;
        
        const mainCol = document.querySelector('.main-column');
        const card = document.createElement('section');
        card.className = 'card';
        card.innerHTML = `
            <h3>Application Status</h3>
            <p>Thank you for your interest in Choice Properties. At this time, we are unable to approve your application.</p>
            <p style="margin-top: 15px; font-size: 0.85rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 15px;">
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

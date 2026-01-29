/**
 * Applicant Dashboard Controller
 * Handles real-time updates and data fetching from Supabase
 */
class ApplicantDashboard {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.appId = new URLSearchParams(window.location.search).get('id');
        this.subscription = null;
    }

    async init() {
        if (!this.appId) return this.showLogin();
        
        await this.fetchData();
        this.setupRealtimeSubscription();
    }

    async fetchData() {
        const { data, error } = await this.supabase
            .from('rental_applications')
            .select('*')
            .eq('application_id', this.appId)
            .single();

        if (error || !data) return this.showError();
        this.render(data);
    }

    /**
     * Listen for real-time changes in the database
     */
    setupRealtimeSubscription() {
        this.subscription = this.supabase
            .channel('public:rental_applications')
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'rental_applications',
                filter: `application_id=eq.${this.appId}`
            }, (payload) => {
                console.log('Real-time update received:', payload.new);
                this.render(payload.new);
            })
            .subscribe();
    }

    render(app) {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');

        // 1. Core Info
        document.getElementById('displayAppId').textContent = app.application_id;
        document.getElementById('displayProperty').textContent = app.property_address || 'TBD';
        document.getElementById('displayDate').textContent = new Date(app.created_at).toLocaleDateString();
        
        // 2. Payment Status
        const payStatus = app.payment_status || 'pending';
        const payEl = document.getElementById('displayPaymentStatus');
        payEl.innerHTML = `<span class="badge ${payStatus === 'paid' ? 'badge-paid' : 'badge-pending'}">${payStatus}</span>`;

        // 3. Status Banner & Logic
        const banner = document.getElementById('statusBanner');
        const timeline = document.getElementById('timelineSection');
        const payAction = document.getElementById('paymentActionCard');

        if (payStatus === 'pending') {
            banner.className = 'status-banner banner-pending';
            banner.innerHTML = `<i class="fas fa-clock"></i> <div>🟡 Awaiting Payment Confirmation</div>`;
            payAction.classList.remove('hidden');
            timeline.classList.add('hidden');
        } else {
            payAction.classList.add('hidden');
            timeline.classList.remove('hidden');
            this.updateTimeline(app.application_status);
            
            // Status Banner
            switch(app.application_status) {
                case 'under_review':
                    banner.className = 'status-banner banner-review';
                    banner.innerHTML = `<i class="fas fa-search"></i> <div>🔍 Application Under Review</div>`;
                    break;
                case 'approved':
                    banner.className = 'status-banner banner-approved';
                    banner.innerHTML = `<i class="fas fa-check-circle"></i> <div>✅ Application Approved</div>`;
                    break;
                case 'denied':
                    banner.className = 'status-banner banner-denied';
                    banner.innerHTML = `<i class="fas fa-times-circle"></i> <div>❌ Application Denied</div>`;
                    break;
            }
        }

        // 4. Documents
        const docList = document.getElementById('documentList');
        const docs = app.form_data?.documents || [];
        docList.innerHTML = docs.length ? docs.map(d => `<div style="margin-bottom:5px;"><i class="fas fa-file"></i> ${d.name}</div>`).join('') : 'No documents uploaded';
    }

    updateTimeline(status) {
        // Reset steps
        const steps = ['timelinePayment', 'timelineReview', 'timelineDecision'];
        steps.forEach(id => document.getElementById(id).className = 'timeline-step');

        // Payment is confirmed if we are here
        document.getElementById('timelinePayment').classList.add('step-completed');
        document.getElementById('paymentStatusText').textContent = 'Fee Confirmed';

        if (status === 'under_review') {
            document.getElementById('timelineReview').classList.add('step-active');
        } else if (status === 'approved' || status === 'denied') {
            document.getElementById('timelineReview').classList.add('step-completed');
            document.getElementById('timelineDecision').classList.add(status === 'approved' ? 'step-completed' : 'step-denied');
        }
    }

    showLogin() { /* Logic to show login screen */ }
    showError() { /* Logic to show error screen */ }
}

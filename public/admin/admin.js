document.addEventListener('DOMContentLoaded', () => {
    const isDetail = window.location.pathname.includes('application.html');
    if (isDetail) {
        new AdminDetail().init();
    } else {
        new AdminList().init();
    }
});

class AdminList {
    constructor() {
        this.adminConfig = {
            allowlist: ['admin@choiceproperties.com', 'manager@choiceproperties.com']
        };
    }

    isAdmin(email) {
        return this.adminConfig.allowlist.includes(email?.toLowerCase());
    }

    async init() {
        const currentUserEmail = localStorage.getItem('adminUserEmail'); 
        
        if (!this.isAdmin(currentUserEmail)) {
            this.showAccessRestricted();
            return;
        }

        try {
            const response = await fetch('/api/admin/applications');
            const apps = await response.json();
            this.renderTable(apps);
        } catch (err) {
            console.error(err);
        }
    }

    renderTable(apps) {
        const tbody = document.getElementById('applicationTableBody');
        tbody.innerHTML = apps.map(app => `
            <tr>
                <td><code>${app.application_id.substring(0, 8)}</code></td>
                <td><strong>${app.applicant_name}</strong></td>
                <td>${app.property_address || 'N/A'}</td>
                <td><span class="badge status-${app.application_status}">${app.application_status.replace('_', ' ')}</span></td>
                <td><span class="badge pay-${app.payment_status}">${app.payment_status}</span></td>
                <td>${new Date(app.created_at).toLocaleDateString()}</td>
                <td>
                    <a href="application.html?id=${app.application_id}" class="btn-primary" style="text-decoration: none; font-size: 0.8rem;">View</a>
                </td>
            </tr>
        `).join('');
    }
}

class AdminDetail {
    constructor() {
        this.appId = new URLSearchParams(window.location.search).get('id');
    }

    async init() {
        if (!this.appId) return;
        try {
            const response = await fetch(`/api/application-status/${this.appId}`);
            const fullApp = await fetch(`/api/admin/application/${this.appId}`);
            const data = await fullApp.json();
            this.render(data);
        } catch (err) {
            console.error(err);
        }
    }

    render(app) {
        document.getElementById('appHeaderTitle').textContent = `Review: ${app.applicant_name}`;
        
        // Statuses
        const statusBadge = document.getElementById('appStatusBadge');
        statusBadge.textContent = app.application_status.replace('_', ' ');
        statusBadge.className = `badge status-${app.application_status}`;
        
        const payBadge = document.getElementById('payStatusBadge');
        payBadge.textContent = `Payment: ${app.payment_status}`;
        payBadge.className = `badge pay-${app.payment_status}`;

        // Payment Control
        if (app.payment_status === 'pending') {
            document.getElementById('paymentControl').classList.remove('hidden');
            document.getElementById('confirmPaymentBtn').onclick = () => this.updatePaymentStatus('paid');
        }

        // Status Update
        document.getElementById('statusSelect').value = app.application_status;
        document.getElementById('updateStatusBtn').onclick = () => this.updateAppStatus();

        // Data Rendering
        this.renderData(app.form_data);
    }

    renderData(formData) {
        const infoGrid = document.getElementById('applicantInfo');
        const mainFields = ['firstName', 'lastName', 'email', 'phone', 'dob', 'ssn'];
        infoGrid.innerHTML = mainFields.map(key => `
            <div class="data-item">
                <span class="data-label">${this.formatKey(key)}</span>
                <span class="data-value">${formData[key] || 'N/A'}</span>
            </div>
        `).join('');

        const fullGrid = document.getElementById('fullData');
        fullGrid.innerHTML = Object.keys(formData).map(key => `
            <div class="data-item">
                <span class="data-label">${this.formatKey(key)}</span>
                <span class="data-value">${formData[key] || 'N/A'}</span>
            </div>
        `).join('');
    }

    formatKey(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    showAccessRestricted() {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; background: #f1f5f9; color: #0f172a; text-align: center; padding: 20px;">
                <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; width: 100%;">
                    <i class="fas fa-lock" style="font-size: 3rem; color: #dc2626; margin-bottom: 20px; display: block;"></i>
                    <h1 style="font-size: 1.5rem; margin-bottom: 10px;">Access Restricted</h1>
                    <p style="color: #64748b; margin-bottom: 30px;">You do not have permission to access the administration area. Please contact the system administrator if you believe this is an error.</p>
                    <a href="../" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; transition: background 0.2s;">Return to Home</a>
                </div>
            </div>
        `;
    }

    async updatePaymentStatus(status) {
        if (!confirm('Confirm payment has been received?')) return;
        try {
            const res = await fetch(`/api/admin/application/${this.appId}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) window.location.reload();
        } catch (err) { console.error(err); }
    }

    async updateAppStatus() {
        const status = document.getElementById('statusSelect').value;
        if (!confirm(`Change status to ${status.replace('_', ' ')}? An email will be sent to the applicant.`)) return;
        try {
            const res = await fetch(`/api/admin/application/${this.appId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) window.location.reload();
        } catch (err) { console.error(err); }
    }
}

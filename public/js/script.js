// ============================================================
// ENHANCED RENTAL APPLICATION MANAGER (FormSubmit Version)
// ============================================================
class RentalApplication {
    constructor() {
        this.config = {
            LOCAL_STORAGE_KEY: "choicePropertiesRentalApp",
            AUTO_SAVE_INTERVAL: 30000,
            MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
        };
        
        this.state = {
            currentSection: 1,
            isSubmitting: false,
            isOnline: true,
            lastSave: null,
            applicationId: null,
            formData: {}
        };
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.setupOfflineDetection();
        this.populateStaticData();
        this.setupRealTimeValidation();
        this.setupFileUploads();
        this.setupCoApplicants();
        this.setupConditionalFields();
        this.setupCharacterCounters();
        this.restoreSavedProgress();
        this.startAutoSave();
        
        console.log('Rental Application Manager Initialized with FormSubmit');
    }
    
    // =================== EVENT HANDLERS ===================
    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-next') || e.target.closest('.btn-next')) {
                const section = this.getCurrentSection();
                this.nextSection(section);
            }
            if (e.target.matches('.btn-prev') || e.target.closest('.btn-prev')) {
                const section = this.getCurrentSection();
                this.previousSection(section);
            }
        });
        
        // Auto-save on input
        document.addEventListener('input', this.debounce(() => {
            this.queueSave();
        }, 1000));
        
        // Form submission handler
        const form = document.getElementById('rentalApplication');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleFormSubmit(e);
            });
        }

        // SSN Toggle
        const ssnToggle = document.getElementById('ssnToggle');
        if (ssnToggle) {
            ssnToggle.addEventListener('click', () => {
                const ssnInput = document.getElementById('ssn');
                if (ssnInput.type === 'password') {
                    ssnInput.type = 'text';
                    ssnToggle.textContent = 'Hide';
                } else {
                    ssnInput.type = 'password';
                    ssnToggle.textContent = 'Show';
                }
            });
        }
    }
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate all sections
        for (let i = 1; i <= 5; i++) {
            if (!this.validateSection(i)) {
                this.showSection(i);
                this.updateProgressBar();
                return;
            }
        }
        
        if (!confirm('Ready to submit your application? You will receive a confirmation email shortly.')) {
            return;
        }
        
        this.setState({ isSubmitting: true });
        this.showSubmissionProgress();
        
        try {
            this.updateSubmissionProgress(1, 'Processing your information...');
            await this.delay(1000);
            
            this.updateSubmissionProgress(2, 'Validating application data...');
            await this.delay(800);
            
            this.updateSubmissionProgress(3, 'Preparing submission...');
            
            const applicationId = this.generateApplicationId();
            document.getElementById('formApplicationId').value = applicationId;
            
            this.updateSubmissionProgress(4, 'Submitting application...');
            
            await this.delay(1500);
            this.handleSubmissionSuccess(applicationId);
            
        } catch (error) {
            console.error('Submission error:', error);
            this.handleSubmissionError(error);
        }
    }
    
    handleSubmissionSuccess(applicationId) {
        this.updateSubmissionProgress(4, 'Submission complete!');
        this.hideSubmissionProgress();
        this.showSuccessState(applicationId);
        this.clearSavedProgress();
        
        setTimeout(() => {
            document.getElementById('rentalApplication').submit();
        }, 2000);
    }
    
    handleSubmissionError(error) {
        let userMessage = 'We encountered an error while processing your application.';
        const errorMsgEl = document.getElementById('errorMessage');
        if (errorMsgEl) errorMsgEl.textContent = userMessage;
        this.hideSubmissionProgress();
        this.showElement('errorState');
    }
    
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.setState({ isOnline: true });
        });
        
        window.addEventListener('offline', () => {
            this.setState({ isOnline: false });
        });
        
        this.setState({ isOnline: navigator.onLine });
    }
    
    // =================== STATE MANAGEMENT ===================
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUIState();
    }
    
    updateUIState() {
        const offlineIndicator = document.getElementById('offlineIndicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = this.state.isOnline ? 'none' : 'block';
        }
    }
    
    getCurrentSection() {
        const activeSection = document.querySelector('.form-section.active');
        return activeSection ? parseInt(activeSection.id.replace('section', '')) : 1;
    }
    
    // =================== SECTION NAVIGATION ===================
    nextSection(currentSection) {
        if (!this.validateSection(currentSection)) {
            return;
        }
        
        this.hideSection(currentSection);
        this.showSection(currentSection + 1);
        this.updateProgressBar();
        
        if (currentSection + 1 === 5) {
            this.generateApplicationSummary();
            this.generateApplicationId();
        }
    }
    
    previousSection(currentSection) {
        if (currentSection > 1) {
            this.hideSection(currentSection);
            this.showSection(currentSection - 1);
            this.updateProgressBar();
        }
    }
    
    hideSection(sectionNumber) {
        const section = document.getElementById(`section${sectionNumber}`);
        if (section) section.classList.remove('active');
    }
    
    showSection(sectionNumber) {
        const section = document.getElementById(`section${sectionNumber}`);
        if (section) {
            section.classList.add('active');
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    updateProgressBar() {
        const currentSection = this.getCurrentSection();
        const progress = ((currentSection - 1) / 4) * 100;
        const progressFill = document.getElementById('progressFill');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) {
                step.classList.remove('active', 'completed');
                if (i < currentSection) step.classList.add('completed');
                if (i === currentSection) step.classList.add('active');
            }
        }
    }
    
    // =================== VALIDATION ===================
    validateSection(sectionNumber) {
        const requiredFields = this.getRequiredFieldsForSection(sectionNumber);
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                const fieldValid = this.validateField(field);
                if (!fieldValid) isValid = false;
                this.showFieldError(field, !fieldValid);
            }
        });
        
        return isValid;
    }
    
    validateField(field) {
        const value = field.value.trim();
        if (field.required && !value) return false;
        
        if (value && field.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (value && field.type === 'tel') return value.replace(/\D/g, '').length >= 10;
        
        return true;
    }
    
    showFieldError(field, hasError) {
        if (hasError) {
            field.classList.add('error');
            const errorMsg = field.parentElement.querySelector('.error-message');
            if (errorMsg) errorMsg.style.display = 'block';
        } else {
            field.classList.remove('error');
            const errorMsg = field.parentElement.querySelector('.error-message');
            if (errorMsg) errorMsg.style.display = 'none';
        }
    }
    
    getRequiredFieldsForSection(sectionNumber) {
        const fields = {
            1: ['propertyAddress', 'requestedMoveIn', 'desiredLeaseTerm', 'firstName', 'lastName', 'email', 'phone', 'dob'],
            2: ['currentAddress', 'residencyStart', 'rentAmount', 'reasonLeaving', 'landlordName', 'landlordPhone'],
            3: ['employmentStatus', 'employer', 'jobTitle', 'employmentDuration', 'supervisorName', 'supervisorPhone', 'monthlyIncome'],
            4: ['ref1Name', 'ref1Phone', 'ref2Name', 'ref2Phone', 'emergencyName', 'emergencyPhone'],
            5: ['termsAgree']
        };
        return fields[sectionNumber] || [];
    }
    
    // =================== HELPERS ===================
    getElement(id) { return document.getElementById(id); }
    showElement(id) { const el = this.getElement(id); if (el) el.style.display = 'block'; }
    hideElement(id) { const el = this.getElement(id); if (el) el.style.display = 'none'; }
    
    delay(ms) { return new Promise(res => setTimeout(res, ms)); }
    
    generateApplicationId() {
        if (!this.state.applicationId) {
            this.state.applicationId = 'APP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        }
        const display = document.getElementById('successAppId');
        if (display) display.textContent = this.state.applicationId;
        return this.state.applicationId;
    }
    
    generateApplicationSummary() {
        const summary = document.getElementById('applicationSummary');
        if (!summary) return;
        
        const data = this.getAllFormData();
        let html = '<div class="summary-item"><div class="summary-label">Name</div><div class="summary-value">' + (data.firstName || '') + ' ' + (data.lastName || '') + '</div></div>';
        html += '<div class="summary-item"><div class="summary-label">Property</div><div class="summary-value">' + (data.propertyAddress || '') + '</div></div>';
        html += '<div class="summary-item"><div class="summary-label">Monthly Income</div><div class="summary-value">' + (data.monthlyIncome || '') + '</div></div>';
        
        summary.innerHTML = html;
    }
    
    getAllFormData() {
        const form = document.getElementById('rentalApplication');
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        // Also capture by ID for elements that might not have name exactly matching ID
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id) data[input.id] = input.type === 'checkbox' ? input.checked : input.value;
        });
        return data;
    }
    
    // =================== STUBS FOR MISSING METHODS ===================
    setupRealTimeValidation() {}
    setupFileUploads() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', () => {
                const list = document.getElementById('fileList');
                list.innerHTML = Array.from(fileInput.files).map(f => `<div class="file-item">${f.name}</div>`).join('');
            });
        }
    }
    setupCoApplicants() {}
    setupConditionalFields() {
        const petsRadio = document.getElementsByName('Has Pets');
        const petGroup = document.getElementById('petDetailsGroup');
        if (petsRadio && petGroup) {
            petsRadio.forEach(r => r.addEventListener('change', (e) => {
                petGroup.style.display = e.target.value === 'Yes' ? 'block' : 'none';
            }));
        }
    }
    setupCharacterCounters() {}
    populateStaticData() {}
    
    restoreSavedProgress() {
        const saved = localStorage.getItem(this.config.LOCAL_STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // Simple restore logic
                const form = document.getElementById('rentalApplication');
                Object.keys(data).forEach(key => {
                    const el = document.getElementById(key);
                    if (el) {
                        if (el.type === 'checkbox') el.checked = data[key];
                        else el.value = data[key];
                    }
                });
            } catch (e) {}
        }
    }
    
    startAutoSave() {
        setInterval(() => this.saveProgress(), this.config.AUTO_SAVE_INTERVAL);
    }
    
    saveProgress() {
        const data = this.getAllFormData();
        localStorage.setItem(this.config.LOCAL_STORAGE_KEY, JSON.stringify(data));
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.style.display = 'block';
            setTimeout(() => indicator.style.display = 'none', 2000);
        }
    }
    
    queueSave() { this.saveProgress(); }
    
    debounce(func, wait) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }
    
    updateSubmissionProgress(step, message) {
        const msg = document.getElementById('submissionMessage');
        if (msg) msg.textContent = message;
        for (let i = 1; i <= 4; i++) {
            const ind = document.getElementById(`step${i}Indicator`);
            if (ind) {
                ind.classList.remove('active', 'completed');
                if (i < step) ind.classList.add('completed');
                if (i === step) ind.classList.add('active');
            }
        }
    }
    
    showSubmissionProgress() { this.showElement('submissionProgress'); this.hideSection(this.getCurrentSection()); }
    hideSubmissionProgress() { this.hideElement('submissionProgress'); }
    showSuccessState(appId) { this.showElement('successState'); const el = document.getElementById('successAppId'); if (el) el.textContent = appId; }
    clearSavedProgress() { localStorage.removeItem(this.config.LOCAL_STORAGE_KEY); }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RentalApplication();
    // Ensure section 1 is active
    const s1 = document.getElementById('section1');
    if (s1) s1.classList.add('active');
});

// ============================================================
// ENHANCED RENTAL APPLICATION MANAGER (Supabase Version)
// ============================================================
class RentalApplication {
    constructor() {
        this.config = {
            LOCAL_STORAGE_KEY: "choicePropertiesRentalApp",
            AUTO_SAVE_INTERVAL: 30000,
            MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
            SUPABASE_URL: "https://pwqjungiwusflcflukeg.supabase.co/",
            SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cWp1bmdpd3VzZmxjZmx1a2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDIwODAsImV4cCI6MjA4NTA3ODA4MH0.yq_0LfPc81cq_ptDZGnxbs3RDfhW8PlQaTfYUs_bsLE"
        };
        
        // Initialize Supabase if variables are available
        try {
            if (typeof supabase !== 'undefined') {
                this.supabase = supabase.createClient(this.config.SUPABASE_URL, this.config.SUPABASE_KEY);
            }
        } catch (e) {
            console.error('Supabase initialization failed:', e);
        }
        
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
        this.setupGeoapify();
        this.setupInputFormatting();
        
        console.log('Rental Application Manager Initialized with FormSubmit');
    }

    setupGeoapify() {
        const apiKey = "bea2afb13c904abea5cb2c2693541dcf";
        const fields = ['propertyAddress', 'currentAddress'];
        
        fields.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;

            const container = document.createElement('div');
            container.style.position = 'relative';
            input.parentNode.insertBefore(container, input);
            container.appendChild(input);

            const dropdown = document.createElement('div');
            dropdown.className = 'autocomplete-dropdown';
            dropdown.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; z-index: 1000; display: none; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 4px;';
            container.appendChild(dropdown);

            input.addEventListener('input', this.debounce(async (e) => {
                const text = e.target.value;
                if (text.length < 3) {
                    dropdown.style.display = 'none';
                    return;
                }

                try {
                    const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&apiKey=${apiKey}`);
                    const data = await response.json();
                    
                    if (data.features && data.features.length > 0) {
                        dropdown.innerHTML = '';
                        data.features.forEach(feature => {
                            const item = document.createElement('div');
                            item.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 14px;';
                            item.textContent = feature.properties.formatted;
                            item.addEventListener('mouseover', () => item.style.background = '#f0f7ff');
                            item.addEventListener('mouseout', () => item.style.background = 'white');
                            item.addEventListener('click', () => {
                                input.value = feature.properties.formatted;
                                dropdown.style.display = 'none';
                                // Auto-save after selection
                                this.saveProgress();
                            });
                            dropdown.appendChild(item);
                        });
                        dropdown.style.display = 'block';
                    } else {
                        dropdown.style.display = 'none';
                    }
                } catch (err) {
                    console.error('Geoapify error:', err);
                }
            }, 300));

            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) dropdown.style.display = 'none';
            });
        });
    }

    setupInputFormatting() {
        const phoneFields = ['phone', 'landlordPhone', 'supervisorPhone', 'ref1Phone', 'ref2Phone', 'emergencyPhone'];
        phoneFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
                    e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
                });
            }
        });

        const ssnEl = document.getElementById('ssn');
        if (ssnEl) {
            ssnEl.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, '');
                let formatted = '';
                if (val.length > 0) formatted += val.substr(0, 3);
                if (val.length > 3) formatted += '-' + val.substr(3, 2);
                if (val.length > 5) formatted += '-' + val.substr(5, 4);
                e.target.value = formatted;
            });
        }
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
        
        // Start Over
        const startOverBtn = document.getElementById('startOverBtn');
        if (startOverBtn) {
            startOverBtn.addEventListener('click', () => {
                if (confirm('This will clear all entered information. Are you sure you want to start over?')) {
                    this.clearSavedProgress();
                    location.reload();
                }
            });
        }
        
        // Auto-save on input
        document.addEventListener('input', (e) => {
            // Don't save SSN
            if (e.target.id === 'ssn') return;
            this.debounce(() => {
                this.saveProgress();
            }, 1000)();
        });
        
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
            ssnToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ssnInput = document.getElementById('ssn');
                if (ssnInput.type === 'password') {
                    ssnInput.type = 'text';
                    ssnToggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    ssnInput.type = 'password';
                    ssnToggle.innerHTML = '<i class="fas fa-eye"></i>';
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
            
            this.updateSubmissionProgress(4, 'Submitting application to Choice Properties database...');
            
            const formData = this.getAllFormData();
            // Securely remove sensitive/duplicate data before saving
            delete formData.ssn;
            delete formData.SSN;

            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('rental_applications')
                    .insert([
                        { 
                            application_id: applicationId,
                            form_data: formData,
                            property_address: formData.propertyAddress,
                            applicant_email: formData.email,
                            applicant_name: `${formData.firstName} ${formData.lastName}`
                        }
                    ]);

                if (error) throw error;
            } else {
                console.warn('Supabase not initialized, simulation only');
                await this.delay(1500);
            }
            
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
        // Removed FormSubmit auto-submit logic
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
            4: ['ref1Name', 'ref1Phone', 'emergencyName', 'emergencyPhone'],
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
        // Securely ensure SSN is NOT in localStorage
        delete data.SSN;
        delete data.ssn;
        
        localStorage.setItem(this.config.LOCAL_STORAGE_KEY, JSON.stringify(data));
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.style.display = 'block';
            indicator.style.opacity = '1';
            indicator.textContent = 'Progress saved';
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.style.display = 'none', 500);
            }, 2000);
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

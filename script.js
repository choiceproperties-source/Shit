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
        form.addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });
    }
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate all sections
        for (let i = 1; i <= 5; i++) {
            if (!this.validateSection(i)) {
                this.showSectionError(i, 'Please complete all required fields');
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
            // Step 1: Processing
            this.updateSubmissionProgress(1, 'Processing your information...');
            await this.delay(1000);
            
            // Step 2: Validation
            this.updateSubmissionProgress(2, 'Validating application data...');
            await this.delay(800);
            
            // Step 3: Prepare submission
            this.updateSubmissionProgress(3, 'Preparing submission...');
            
            // Generate application ID
            const applicationId = this.generateApplicationId();
            document.getElementById('formApplicationId').value = applicationId;
            
            // Set FormSubmit success URL
            const successURL = `${window.location.origin}${window.location.pathname}?success=true&appId=${applicationId}`;
            document.querySelector('input[name="_next"]').value = successURL;
            
            // Add hidden fields for co-applicants
            this.addCoApplicantFormData();
            
            // Step 4: Submit
            this.updateSubmissionProgress(4, 'Submitting application...');
            
            // Show success state
            await this.delay(1500);
            this.handleSubmissionSuccess(applicationId);
            
        } catch (error) {
            console.error('Submission error:', error);
            this.handleSubmissionError(error);
        }
    }
    
    handleSubmissionSuccess(applicationId) {
        this.updateSubmissionProgress(4, 'Submission complete!');
        
        // Hide progress and show success
        this.hideSubmissionProgress();
        this.showSuccessState(applicationId);
        
        // Clear saved progress
        this.clearSavedProgress();
        
        // Actually submit the form to FormSubmit
        setTimeout(() => {
            document.getElementById('rentalApplication').submit();
        }, 2000);
    }
    
    handleSubmissionError(error) {
        let userMessage = 'We encountered an error while processing your application.';
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            userMessage = 'Network connection failed. Please check your internet connection and try again.';
        }
        
        document.getElementById('errorMessage').textContent = userMessage;
        this.hideSubmissionProgress();
        this.showElement('errorState');
    }
    
    addCoApplicantFormData() {
        const coApplicants = this.getCoApplicants();
        const container = document.getElementById('rentalApplication');
        
        // Remove any existing co-applicant hidden fields
        document.querySelectorAll('[name^="co_applicant_"]').forEach(el => el.remove());
        
        // Add new co-applicant fields
        coApplicants.forEach((co, index) => {
            const fields = [
                { name: `co_applicant_${index}_name`, value: co.fullName },
                { name: `co_applicant_${index}_email`, value: co.email },
                { name: `co_applicant_${index}_phone`, value: co.phone },
                { name: `co_applicant_${index}_relationship`, value: co.relationship }
            ];
            
            fields.forEach(field => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = field.name;
                input.value = field.value || '';
                container.appendChild(input);
            });
        });
    }
    
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.setState({ isOnline: true });
            this.hideOfflineIndicator();
        });
        
        window.addEventListener('offline', () => {
            this.setState({ isOnline: false });
            this.showOfflineIndicator();
        });
        
        this.setState({ isOnline: navigator.onLine });
    }
    
    // =================== STATE MANAGEMENT ===================
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUIState();
    }
    
    updateUIState() {
        if (this.state.isOnline) {
            this.hideOfflineIndicator();
        } else {
            this.showOfflineIndicator();
        }
    }
    
    getCurrentSection() {
        const activeSection = document.querySelector('.form-section.active');
        return activeSection ? parseInt(activeSection.id.replace('section', '')) : 1;
    }
    
    // =================== SECTION NAVIGATION ===================
    nextSection(currentSection) {
        if (!this.validateSection(currentSection)) {
            this.showSectionErrors(currentSection);
            this.shakeSection(currentSection);
            return;
        }
        
        this.hideSection(currentSection);
        this.showSection(currentSection + 1);
        this.updateProgressBar();
        this.checkSectionCompletion(currentSection + 1);
        
        if (currentSection + 1 === 5) {
            this.generateApplicationSummary();
            this.generateApplicationId();
        }
    }
    
    previousSection(currentSection) {
        this.hideSection(currentSection);
        this.showSection(currentSection - 1);
        this.updateProgressBar();
    }
    
    hideSection(sectionNumber) {
        const section = this.getElement(`section${sectionNumber}`);
        if (section) section.classList.remove('active');
    }
    
    showSection(sectionNumber) {
        const section = this.getElement(`section${sectionNumber}`);
        if (section) {
            section.classList.add('active');
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    shakeSection(sectionNumber) {
        const section = this.getElement(`section${sectionNumber}`);
        if (section) {
            section.style.animation = 'none';
            setTimeout(() => {
                section.style.animation = 'shake 0.5s ease-in-out';
            }, 10);
        }
    }
    
    updateProgressBar() {
        const currentSection = this.getCurrentSection();
        const progress = ((currentSection - 1) / 4) * 100;
        const progressFill = this.getElement('progressFill');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        // Update step indicators
        for (let i = 1; i <= 5; i++) {
            const step = this.getElement(`step${i}`);
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
            const field = this.getElement(fieldId);
            if (field && !this.validateField(field)) {
                isValid = false;
                this.showFieldError(fieldId, true);
            } else {
                this.showFieldError(fieldId, false);
            }
        });
        
        return isValid;
    }
    
    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        
        if (field.required && !value) return false;
        
        switch (type) {
            case 'email':
                return this.isValidEmail(value);
            case 'tel':
                return this.isValidPhone(value);
            default:
                if (field.id === 'ssn') return this.isValidSSN(value);
                if (field.id === 'phone' || field.id.includes('Phone')) return this.isValidPhone(value);
                return true;
        }
    }
    
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    isValidPhone(phone) {
        const digits = phone.replace(/\D/g, '');
        return digits.length === 10;
    }
    
    isValidSSN(ssn) {
        return /^\d{3}-\d{2}-\d{4}$/.test(ssn);
    }
    
    showFieldError(fieldId, show) {
        const errorElement = this.getElement(`${fieldId}Error`);
        const field = this.getElement(fieldId);
        
        if (errorElement) {
            errorElement.style.display = show ? 'block' : 'none';
        }
        
        if (field) {
            if (show) {
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        }
    }
    
    showSectionErrors(sectionNumber) {
        const requiredFields = this.getRequiredFieldsForSection(sectionNumber);
        let errorCount = 0;
        
        requiredFields.forEach(fieldId => {
            const field = this.getElement(fieldId);
            if (field && !this.validateField(field)) {
                errorCount++;
            }
        });
        
        if (errorCount > 0) {
            this.showToast(`Please complete ${errorCount} required field${errorCount > 1 ? 's' : ''} before continuing`, 'warning');
        }
    }
    
    getRequiredFieldsForSection(sectionNumber) {
        const requiredFields = {
            1: ['propertyAddress', 'moveInDate', 'leaseTerm', 'fullName', 'dob', 'ssn', 'dlNumber', 'dlState', 'phone', 'email'],
            2: ['numOccupants', 'occupantsList', 'currentAddress', 'currentCity', 'currentState', 'currentZip', 'currentLandlord', 'currentLandlordContact', 'currentResidenceDates', 'currentRent', 'currentReasonLeaving'],
            3: ['employerName', 'employerAddress', 'position', 'supervisorName', 'supervisorContact', 'employmentStart', 'income'],
            4: ['reference1Name', 'reference1Relationship', 'reference1Phone', 'reference1YearsKnown', 'emergencyName', 'emergencyRelationship', 'emergencyPhone', 'backgroundCheckSignature', 'backgroundCheckDate'],
            5: ['applicantSignature', 'signatureDate', 'feeAcknowledged']
        };
        
        return requiredFields[sectionNumber] || [];
    }
    
    checkSectionCompletion(sectionNumber) {
        const requiredFields = this.getRequiredFieldsForSection(sectionNumber);
        let completed = true;
        
        requiredFields.forEach(fieldId => {
            const field = this.getElement(fieldId);
            if (field && !field.value.trim()) {
                completed = false;
            }
        });
        
        const statusIcon = this.getElement(`section${sectionNumber}StatusIcon`);
        const statusText = this.getElement(`section${sectionNumber}Status`);
        
        if (statusIcon && statusText) {
            if (completed) {
                statusIcon.style.display = 'inline';
                statusText.textContent = 'Complete';
                statusText.className = 'completion-status';
            } else {
                statusIcon.style.display = 'none';
                statusText.textContent = 'Incomplete';
                statusText.className = 'completion-status incomplete';
            }
        }
        
        return completed;
    }
    
    // =================== PROGRESS INDICATORS ===================
    updateSubmissionProgress(step, message) {
        for (let i = 1; i <= 4; i++) {
            const indicator = this.getElement(`step${i}Indicator`);
            if (indicator) {
                indicator.classList.remove('active', 'completed');
                if (i < step) indicator.classList.add('completed');
                if (i === step) indicator.classList.add('active');
            }
        }
        
        const messageElement = this.getElement('submissionMessage');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
    
    showSubmissionProgress() {
        this.hideElement('formContainer');
        this.showElement('submissionProgress');
    }
    
    hideSubmissionProgress() {
        this.hideElement('submissionProgress');
    }
    
    showSuccessState(applicationId) {
        this.getElement('successAppId').textContent = applicationId;
        this.hideSubmissionProgress();
        this.showElement('successState');
    }
    
    showErrorState(message) {
        this.getElement('errorMessage').textContent = message;
        this.showElement('errorState');
    }
    
    hideErrorState() {
        this.hideElement('errorState');
    }
    
    showOfflineIndicator() {
        this.showElement('offlineIndicator');
    }
    
    hideOfflineIndicator() {
        this.hideElement('offlineIndicator');
    }
    
    showAutoSaveIndicator() {
        const indicator = this.getElement('autoSaveIndicator');
        this.showElement('autoSaveIndicator');
        setTimeout(() => this.hideElement('autoSaveIndicator'), 3000);
    }
    
    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `auto-save-indicator ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i> ${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
    
    // =================== FILE HANDLING ===================
    setupFileUploads() {
        const uploadConfigs = [
            { uploadId: 'photoIdUpload', fileInputId: 'photoId', fileListId: 'photoIdList' },
            { uploadId: 'incomeVerificationUpload', fileInputId: 'incomeVerification', fileListId: 'incomeVerificationList' }
        ];
        
        uploadConfigs.forEach(config => {
            const area = this.getElement(config.uploadId);
            const input = this.getElement(config.fileInputId);
            const list = this.getElement(config.fileListId);
            
            if (!area || !input) return;
            
            area.addEventListener('click', () => input.click());
            
            area.addEventListener('dragover', e => {
                e.preventDefault();
                area.style.borderColor = 'var(--secondary)';
                area.style.backgroundColor = '#e8f4fc';
            });
            
            area.addEventListener('dragleave', () => {
                area.style.borderColor = '#ddd';
                area.style.backgroundColor = '';
            });
            
            area.addEventListener('drop', e => {
                e.preventDefault();
                area.style.borderColor = '#ddd';
                area.style.backgroundColor = '';
                
                if (e.dataTransfer.files.length > 0) {
                    input.files = e.dataTransfer.files;
                    this.updateFileList(input, list);
                }
            });
            
            input.addEventListener('change', () => this.updateFileList(input, list));
        });
    }
    
    updateFileList(fileInput, fileList) {
        if (!fileList) return;
        
        fileList.innerHTML = '';
        if (!fileInput.files || fileInput.files.length === 0) return;
        
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const item = document.createElement('div');
            item.className = 'file-item';
            
            item.innerHTML = `
                <div class="file-name">
                    <i class="fas fa-file"></i>
                    <span>${file.name} (${this.formatFileSize(file.size)})</span>
                </div>
                <div class="file-remove" data-index="${i}">
                    <i class="fas fa-times"></i>
                </div>
            `;
            
            fileList.appendChild(item);
        }
        
        fileList.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.removeFile(fileInput, index);
                this.updateFileList(fileInput, fileList);
            });
        });
    }
    
    removeFile(fileInput, index) {
        const dt = new DataTransfer();
        const files = fileInput.files;
        
        for (let i = 0; i < files.length; i++) {
            if (i !== index) dt.items.add(files[i]);
        }
        
        fileInput.files = dt.files;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // =================== DATA MANAGEMENT ===================
    queueSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveProgress(), 2000);
    }
    
    saveProgress() {
        const formData = this.getAllFormData();
        const saveData = {
            ...formData,
            currentSection: this.getCurrentSection(),
            applicationId: this.state.applicationId,
            timestamp: new Date().toISOString()
        };
        
        try {
            localStorage.setItem(this.config.LOCAL_STORAGE_KEY, JSON.stringify(saveData));
            this.setState({ lastSave: new Date() });
            this.showAutoSaveIndicator();
        } catch (error) {
            console.error('Save failed:', error);
        }
    }
    
    restoreSavedProgress() {
        const saved = localStorage.getItem(this.config.LOCAL_STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (confirm('Found a saved application. Would you like to restore it?')) {
                    this.restoreFormData(data);
                    this.showAutoSaveIndicator();
                }
            } catch (error) {
                console.error('Restore failed:', error);
            }
        }
    }
    
    restoreFormData(data) {
        if (data.section1) this.fillSection(data.section1);
        if (data.section2) this.fillSection(data.section2);
        if (data.section3) this.fillSection(data.section3);
        if (data.section4) this.fillSection(data.section4);
        if (data.section5) this.fillSection(data.section5);
        
        if (data.currentSection) {
            this.hideSection(this.getCurrentSection());
            this.showSection(data.currentSection);
            this.updateProgressBar();
        }
        
        if (data.applicationId) {
            this.state.applicationId = data.applicationId;
            this.getElement('applicationIdValue').textContent = data.applicationId;
        }
        
        this.updateAllUIStates();
    }
    
    fillSection(sectionData) {
        Object.entries(sectionData).forEach(([key, value]) => {
            const element = this.getElement(key);
            if (!element) return;
            
            if (element.type === 'checkbox') {
                element.checked = !!value;
            } else {
                element.value = value || '';
            }
        });
    }
    
    clearSavedProgress() {
        localStorage.removeItem(this.config.LOCAL_STORAGE_KEY);
    }
    
    hasUnsavedChanges() {
        return true;
    }
    
    startAutoSave() {
        setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.saveProgress();
            }
        }, this.config.AUTO_SAVE_INTERVAL);
    }
    
    // =================== UTILITY METHODS ===================
    getElement(id) {
        return document.getElementById(id);
    }
    
    showElement(id) {
        const element = this.getElement(id);
        if (element) element.style.display = 'block';
    }
    
    hideElement(id) {
        const element = this.getElement(id);
        if (element) element.style.display = 'none';
    }
    
    hideForm() {
        this.hideElement('formContainer');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // =================== INITIALIZATION HELPERS ===================
    populateStaticData() {
        const states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];
        
        ['dlState', 'currentState'].forEach(id => {
            const select = this.getElement(id);
            if (select && select.options.length <= 1) {
                states.forEach(state => {
                    const option = document.createElement('option');
                    option.value = state;
                    option.textContent = state;
                    select.appendChild(option);
                });
            }
        });
        
        // Set today's date for relevant fields
        const today = new Date().toISOString().split('T')[0];
        if (this.getElement('moveInDate')) this.getElement('moveInDate').min = today;
        if (this.getElement('signatureDate')) this.getElement('signatureDate').value = today;
        if (this.getElement('backgroundCheckDate')) this.getElement('backgroundCheckDate').value = today;
        
        // Check for success parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') {
            const appId = urlParams.get('appId');
            this.showSuccessState(appId);
            this.hideElement('formContainer');
        }
    }
    
    setupRealTimeValidation() {
        // Email validation
        const emailField = this.getElement('email');
        if (emailField) {
            emailField.addEventListener('blur', () => {
                this.validateEmailField(emailField);
            });
        }
        
        // Phone validation
        ['phone', 'reference1Phone', 'emergencyPhone'].forEach(fieldId => {
            const field = this.getElement(fieldId);
            if (field) {
                field.addEventListener('input', () => this.formatPhoneNumber(field));
                field.addEventListener('blur', () => this.validatePhoneField(field));
            }
        });
        
        // SSN validation
        const ssnField = this.getElement('ssn');
        if (ssnField) {
            ssnField.addEventListener('input', () => this.formatSSN(ssnField));
            ssnField.addEventListener('blur', () => this.validateSSNField(ssnField));
            
            const ssnToggle = this.getElement('ssnToggle');
            if (ssnToggle) {
                ssnToggle.addEventListener('click', () => this.toggleSSNVisibility(ssnField, ssnToggle));
            }
        }
        
        // Income ratio calculator
        const incomeField = this.getElement('income');
        const incomeTypeField = this.getElement('incomeType');
        const rentField = this.getElement('currentRent');
        
        if (incomeField) incomeField.addEventListener('input', () => this.calculateIncomeRatio());
        if (incomeTypeField) incomeTypeField.addEventListener('change', () => this.calculateIncomeRatio());
        if (rentField) rentField.addEventListener('input', () => this.calculateIncomeRatio());
    }
    
    setupConditionalFields() {
        // Pets toggle
        const hasPets = this.getElement('hasPets');
        if (hasPets) {
            hasPets.addEventListener('change', () => {
                const petDetails = this.getElement('petDetails');
                if (petDetails) {
                    petDetails.style.display = hasPets.checked ? 'block' : 'none';
                }
            });
        }
    }
    
    setupCharacterCounters() {
        const textAreas = ['occupantsList', 'currentReasonLeaving', 'otherIncome'];
        
        textAreas.forEach(id => {
            const textarea = this.getElement(id);
            const counter = this.getElement(id + 'Count');
            if (!textarea || !counter) return;
            
            textarea.addEventListener('input', () => {
                const len = textarea.value.length;
                const max = parseInt(textarea.getAttribute('maxlength')) || 500;
                counter.textContent = `${len}/${max} characters`;
                
                counter.classList.remove('near-limit', 'over-limit');
                if (len > max * 0.9) {
                    counter.classList.add('over-limit');
                } else if (len > max * 0.75) {
                    counter.classList.add('near-limit');
                }
            });
            
            textarea.dispatchEvent(new Event('input'));
        });
    }
    
    setupCoApplicants() {
        const addButton = this.getElement('addCoApplicant');
        const container = this.getElement('coApplicantsContainer');
        
        if (!addButton || !container) return;
        
        addButton.addEventListener('click', () => {
            const count = container.querySelectorAll('.co-applicant-section').length + 1;
            this.addCoApplicantSection(count, container);
        });
    }
    
    addCoApplicantSection(count, container) {
        const section = document.createElement('div');
        section.className = 'co-applicant-section';
        section.innerHTML = `
            <div class="co-applicant-header">
                <h3>Co-Applicant ${count}</h3>
                <button type="button" class="remove-co-applicant">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="form-row">
                <div class="form-col">
                    <label for="coFullName${count}" class="required">Full Legal Name</label>
                    <input type="text" id="coFullName${count}" name="coFullName${count}" required>
                </div>
                <div class="form-col">
                    <label for="coEmail${count}" class="required">Email Address</label>
                    <input type="email" id="coEmail${count}" name="coEmail${count}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-col">
                    <label for="coPhone${count}" class="required">Phone Number</label>
                    <input type="tel" id="coPhone${count}" name="coPhone${count}" required>
                </div>
                <div class="form-col">
                    <label for="coRelationship${count}">Relationship to Primary Applicant</label>
                    <input type="text" id="coRelationship${count}" name="coRelationship${count}" placeholder="Spouse, partner, etc.">
                </div>
            </div>
        `;
        
        container.appendChild(section);
        
        // Setup remove button
        section.querySelector('.remove-co-applicant').addEventListener('click', () => {
            section.remove();
        });
        
        // Setup phone formatting
        const phoneField = this.getElement(`coPhone${count}`);
        if (phoneField) {
            phoneField.addEventListener('input', () => this.formatPhoneNumber(phoneField));
        }
    }
    
    // =================== FIELD FORMATTING & VALIDATION ===================
    validateEmailField(field) {
        const email = field.value.trim();
        const isValid = this.isValidEmail(email);
        
        if (email && !isValid) {
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
        
        this.checkSectionCompletion(this.getCurrentSection());
    }
    
    validatePhoneField(field) {
        const phone = field.value.replace(/\D/g, '');
        const isValid = phone.length === 10 || phone.length === 0;
        
        if (field.value && !isValid) {
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
        
        this.checkSectionCompletion(this.getCurrentSection());
    }
    
    validateSSNField(field) {
        const isValid = this.isValidSSN(field.value) || field.value === '';
        
        if (field.value && !isValid) {
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
        
        this.checkSectionCompletion(this.getCurrentSection());
    }
    
    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '').substring(0, 10);
        
        if (value.length > 6) {
            value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6);
        } else if (value.length > 3) {
            value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
        } else if (value.length > 0) {
            value = '(' + value;
        }
        
        input.value = value;
    }
    
    formatSSN(input) {
        let value = input.value.replace(/\D/g, '').substring(0, 9);
        
        if (value.length > 4) {
            value = value.substring(0, 3) + '-' + value.substring(3, 5) + '-' + value.substring(5);
        } else if (value.length > 3) {
            value = value.substring(0, 3) + '-' + value.substring(3);
        }
        
        input.value = value;
    }
    
    toggleSSNVisibility(input, button) {
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
        } else {
            input.type = 'password';
            button.innerHTML = '<i class="fas fa-eye"></i> Show';
        }
    }
    
    calculateIncomeRatio() {
        const income = parseFloat(this.getElement('income').value) || 0;
        const incomeType = this.getElement('incomeType').value;
        const currentRent = parseFloat(this.getElement('currentRent').value) || 0;
        
        let monthlyIncome = income;
        if (incomeType === 'Annual') {
            monthlyIncome = income / 12;
        }
        
        const ratio = monthlyIncome > 0 ? (currentRent / monthlyIncome) * 100 : 0;
        const ratioDisplay = this.getElement('incomeRatioValue');
        const ratioContainer = this.getElement('incomeRatioDisplay');
        
        if (ratioDisplay && ratioContainer) {
            if (monthlyIncome === 0) {
                ratioDisplay.textContent = '--';
                ratioContainer.className = 'income-ratio';
            } else {
                ratioDisplay.textContent = ratio.toFixed(1) + '%';
                
                ratioContainer.classList.remove('good', 'fair', 'poor');
                if (ratio <= 30) {
                    ratioContainer.classList.add('good');
                } else if (ratio <= 40) {
                    ratioContainer.classList.add('fair');
                } else {
                    ratioContainer.classList.add('poor');
                }
            }
        }
    }
    
    // =================== DATA COLLECTION ===================
    getAllFormData() {
        return {
            section1: this.getSection1Data(),
            section2: this.getSection2Data(),
            section3: this.getSection3Data(),
            section4: this.getSection4Data(),
            section5: this.getSection5Data(),
            coApplicants: this.getCoApplicants()
        };
    }
    
    getSection1Data() {
        return {
            propertyAddress: this.getValue('propertyAddress'),
            unitNumber: this.getValue('unitNumber'),
            moveInDate: this.getValue('moveInDate'),
            leaseTerm: this.getValue('leaseTerm'),
            propertySource: this.getValue('propertySource'),
            propertyViewing: this.getValue('propertyViewing'),
            fullName: this.getValue('fullName'),
            dob: this.getValue('dob'),
            ssn: this.getValue('ssn'),
            dlNumber: this.getValue('dlNumber'),
            dlState: this.getValue('dlState'),
            phone: this.getValue('phone'),
            email: this.getValue('email'),
            maritalStatus: this.getValue('maritalStatus'),
            contactEmail: this.getChecked('contactEmail'),
            contactPhone: this.getChecked('contactPhone'),
            contactSMS: this.getChecked('contactSMS')
        };
    }
    
    getSection2Data() {
        return {
            numOccupants: this.getValue('numOccupants'),
            occupantsList: this.getValue('occupantsList'),
            numVehicles: this.getValue('numVehicles'),
            additionalParking: this.getValue('additionalParking'),
            hasPets: this.getChecked('hasPets'),
            petType: this.getValue('petType'),
            petBreed: this.getValue('petBreed'),
            petWeight: this.getValue('petWeight'),
            petAge: this.getValue('petAge'),
            hasServiceAnimal: this.getChecked('hasServiceAnimal'),
            currentAddress: this.getValue('currentAddress'),
            currentCity: this.getValue('currentCity'),
            currentState: this.getValue('currentState'),
            currentZip: this.getValue('currentZip'),
            currentLandlord: this.getValue('currentLandlord'),
            currentLandlordContact: this.getValue('currentLandlordContact'),
            currentResidenceDates: this.getValue('currentResidenceDates'),
            currentRent: this.getValue('currentRent'),
            currentReasonLeaving: this.getValue('currentReasonLeaving')
        };
    }
    
    getSection3Data() {
        return {
            employerName: this.getValue('employerName'),
            employerAddress: this.getValue('employerAddress'),
            position: this.getValue('position'),
            supervisorName: this.getValue('supervisorName'),
            supervisorContact: this.getValue('supervisorContact'),
            employmentStart: this.getValue('employmentStart'),
            income: this.getValue('income'),
            incomeType: this.getValue('incomeType'),
            otherIncome: this.getValue('otherIncome')
        };
    }
    
    getSection4Data() {
        return {
            creditScore: this.getValue('creditScore'),
            backgroundCheckSignature: this.getValue('backgroundCheckSignature'),
            backgroundCheckDate: this.getValue('backgroundCheckDate'),
            reference1Name: this.getValue('reference1Name'),
            reference1Relationship: this.getValue('reference1Relationship'),
            reference1Phone: this.getValue('reference1Phone'),
            reference1YearsKnown: this.getValue('reference1YearsKnown'),
            emergencyName: this.getValue('emergencyName'),
            emergencyRelationship: this.getValue('emergencyRelationship'),
            emergencyPhone: this.getValue('emergencyPhone'),
            emergencyAddress: this.getValue('emergencyAddress')
        };
    }
    
    getSection5Data() {
        return {
            applicantSignature: this.getValue('applicantSignature'),
            signatureDate: this.getValue('signatureDate'),
            feeAcknowledged: this.getChecked('feeAcknowledged')
        };
    }
    
    getCoApplicants() {
        const sections = document.querySelectorAll('.co-applicant-section');
        const coApplicants = [];
        
        sections.forEach((section, index) => {
            const id = index + 1;
            coApplicants.push({
                fullName: this.getValue(`coFullName${id}`),
                email: this.getValue(`coEmail${id}`),
                phone: this.getValue(`coPhone${id}`),
                relationship: this.getValue(`coRelationship${id}`)
            });
        });
        
        return coApplicants;
    }
    
    getValue(id) {
        const el = this.getElement(id);
        return el ? el.value.trim() : '';
    }
    
    getChecked(id) {
        const el = this.getElement(id);
        return el ? el.checked : false;
    }
    
    // =================== UI UPDATES ===================
    generateApplicationSummary() {
        const summaryContainer = this.getElement('applicationSummary');
        if (!summaryContainer) return;
        
        const data = this.getAllFormData();
        
        let summaryHTML = `
            <div class="summary-item">
                <div class="summary-label">Property Information</div>
                <div class="summary-value">${data.section1.propertyAddress} ${data.section1.unitNumber || ''}</div>
                <div class="summary-value">Move-in: ${data.section1.moveInDate} | Lease: ${data.section1.leaseTerm}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Primary Applicant</div>
                <div class="summary-value">${data.section1.fullName}</div>
                <div class="summary-value">Email: ${data.section1.email} | Phone: ${data.section1.phone}</div>
            </div>
        `;
        
        if (data.coApplicants && data.coApplicants.length > 0) {
            summaryHTML += `
                <div class="summary-item">
                    <div class="summary-label">Co-Applicants</div>
                    ${data.coApplicants.map(co => `
                        <div class="summary-value">${co.fullName} | ${co.relationship || 'Co-applicant'}</div>
                    `).join('')}
                </div>
            `;
        }
        
        summaryHTML += `
            <div class="summary-item">
                <div class="summary-label">Occupancy Details</div>
                <div class="summary-value">${data.section2.numOccupants} occupant(s)</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Employment</div>
                <div class="summary-value">${data.section3.employerName} - ${data.section3.position}</div>
                <div class="summary-value">Income: $${data.section3.income} ${data.section3.incomeType}</div>
            </div>
        `;
        
        summaryContainer.innerHTML = summaryHTML;
    }
    
    generateApplicationId() {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 1000);
        const appId = `CP-${timestamp}-${random}`;
        
        this.state.applicationId = appId;
        this.getElement('applicationIdValue').textContent = appId;
        document.getElementById('formApplicationId').value = appId;
        return appId;
    }
    
    updateAllUIStates() {
        // Update character counters
        document.querySelectorAll('textarea').forEach(ta => {
            ta.dispatchEvent(new Event('input'));
        });
        
        // Update validation states
        document.querySelectorAll('input[type="email"], input[type="tel"]').forEach(input => {
            input.dispatchEvent(new Event('blur'));
        });
        
        // Update income ratio
        this.calculateIncomeRatio();
        
        // Update section completion status
        for (let i = 1; i <= 5; i++) {
            this.checkSectionCompletion(i);
        }
    }
}

// =================== GLOBAL INITIALIZATION ===================
let RentalApp;

document.addEventListener('DOMContentLoaded', function() {
    RentalApp = new RentalApplication();
});

// Global functions for HTML onclick handlers
function nextSection(section) {
    RentalApp.nextSection(section);
}

function previousSection(section) {
    RentalApp.previousSection(section);
}

function submitApplication() {
    // FormSubmit handles submission via form action
}

function retrySubmission() {
    RentalApp.hideErrorState();
    RentalApp.showElement('formContainer');
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

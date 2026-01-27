# Choice Properties Rental Application

## Overview

This is a multi-step rental application form for Choice Properties, a property management company. The application collects comprehensive tenant information including personal details, residency history, employment/income verification, financial information, and references. The form features a 5-step wizard interface with progress tracking, real-time validation, auto-save functionality, and offline detection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Static HTML/CSS/JS Application**: Pure frontend application with no server-side rendering
- **Single Page Design**: Multi-step form wizard contained in a single HTML page with JavaScript-controlled section visibility
- **Component Pattern**: JavaScript class-based architecture (`RentalApplication` class) managing all form functionality

### Form Management
- **Multi-Step Wizard**: 5 progressive sections (Property & Applicant → Residency & Occupancy → Employment & Income → Financial & References → Review & Submit)
- **Local Storage Persistence**: Auto-saves form progress to browser localStorage every 30 seconds with restore capability
- **Real-Time Validation**: Client-side validation with immediate user feedback
- **Offline Detection**: Monitors network status to handle offline scenarios gracefully

### Styling Approach
- **CSS Custom Properties**: Design tokens for consistent theming (colors, shadows, border-radius, transitions)
- **Responsive Design**: Mobile-friendly with max-width container and viewport-aware layouts
- **Font Awesome Icons**: External CDN for iconography

### Form Submission
- **FormSubmit Integration**: Uses FormSubmit service for handling form submissions without backend infrastructure
- **File Upload Support**: Handles document uploads with 10MB file size limit

## External Dependencies

### CDN Resources
- **Font Awesome 6.4.0**: Icon library loaded from cdnjs.cloudflare.com

### Third-Party Services
- **FormSubmit**: External form submission service (no backend required)

### Browser APIs
- **LocalStorage**: For persisting form progress and auto-save functionality
- **Navigator.onLine**: For offline/online status detection

### Data Storage
- **Client-Side Only**: No database - all data is stored in browser localStorage until form submission
- **Storage Key**: `choicePropertiesRentalApp`
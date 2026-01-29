# Choice Properties - Rental Application Manager

## Overview
A professional property management application for handling rental applications. Built with a serverless architecture using Supabase.

## Project Architecture
- **Backend**: Supabase (Database, Auth, Storage, Realtime)
- **Frontend**: Static HTML/CSS/JS (Vanilla JavaScript)

### Directory Structure
```
/
├── public/              # Static frontend assets
│   ├── index.html       # Application form
│   ├── admin/           # Admin dashboard
│   ├── dashboard/       # Applicant dashboard
│   ├── js/              # Frontend logic
│   └── css/             # Styles
└── audit_report.md      # Project audit
```

## Environment Variables
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Supabase integration

## Running the Application
The application is a static site. No backend server is required.

## Recent Changes
- 2026-01-29: Migrated from Python/Flask to serverless Supabase architecture. Removed all Python code and dependencies.

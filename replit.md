# Choice Properties - Rental Application Manager

## Overview
A professional property management application for handling rental applications. Built with Flask and PostgreSQL.

## Project Architecture
- **Backend**: Flask with SQLAlchemy ORM
- **Database**: PostgreSQL (Replit managed)
- **Frontend**: Server-rendered HTML templates with Bootstrap

### Directory Structure
```
/
├── main.py              # Entry point, imports server/main.py
├── pyproject.toml       # Python dependencies
└── server/
    ├── app.py           # Flask app configuration
    ├── main.py          # Routes and business logic
    └── models.py        # SQLAlchemy models (Application)
```

## Key Files
- `server/app.py` - Flask app setup, database configuration
- `server/main.py` - Application routes and business logic
- `server/models.py` - Application model with application tracking

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - Flask session secret
- `ADMIN_NOTIFICATION_EMAIL` - Admin email for notifications
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Supabase integration

## Running the Application
The application runs on port 5000 using gunicorn:
```bash
gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
```

## Recent Changes
- 2026-01-29: Initial import completed, PostgreSQL database provisioned

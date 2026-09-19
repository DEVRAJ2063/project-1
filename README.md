# Medi Dost

**Your Smart Friend for Better Health**

Medi Dost is a responsive health-information companion interface designed to help people understand medicines, symptoms, reminders, health reports, and general health topics in simple language.

## Run locally

This version includes a dependency-free Node backend for local development.

```powershell
python -m http.server 4173
```

Use the app server instead:

```powershell
npm start
```

Open <http://localhost:4173/> in a browser.

## Included in this preview

- Responsive desktop, tablet, and mobile dashboard
- Mobile bottom navigation
- Seeded medicine database with local search
- Direct dashboard access without a login screen
- Medi Dost AI chat endpoint with safety-aware medicine responses
- Medicine reminder dashboard with taken state
- Health tools and emergency guidance
- Report upload and prescription scanner entry states
- Profile and privacy surface
- Dark mode toggle
- English, Hindi, and Hinglish language menu entry state

## Production configuration points

The local backend intentionally uses a small in-memory demo user and deterministic medicine responses. It is not a production medical AI service. A production implementation should add:

- React or Next.js application routes and reusable components
- Server-side AI API integration with structured prompts and retrieval from verified medicine sources
- Authenticated database tables for users, medicines, interactions, reports, prescriptions, reminders, conversations, sources, notifications, and audit logs
- Secure file upload processing with type validation, malware scanning, short retention, and explicit consent
- Authentication, sessions, role-based access, rate limiting, access control, encryption, and audit logging
- OCR review screens that visibly mark uncertain results and require confirmation
- Notification delivery for reminders and missed doses
- Official, reviewed medicine content with source and last-reviewed metadata

Never expose AI API keys or private health data in frontend code.

## Environment variables for a backend

A future server can use environment variables similar to:

```text
AI_API_KEY=
AI_MODEL=
DATABASE_URL=
AUTH_SECRET=
STORAGE_BUCKET=
```

Use the deployment provider's secret manager. Do not commit a `.env` file.

## Medical safety limitations

Medi Dost provides general health information and does not replace a qualified doctor, pharmacist, or emergency medical service. It must not diagnose, prescribe, change a prescription, invent doses, claim that a drug combination is definitely safe, or give confident emergency treatment instructions. For severe difficulty breathing, chest pain, loss of consciousness, seizure, serious allergic reaction, severe bleeding, overdose concerns, or other life-threatening symptoms, contact local emergency services immediately.

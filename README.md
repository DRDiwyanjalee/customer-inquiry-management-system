
# InquiryFlow — Customer Inquiry Management System

A full-stack web application built for the Coffee Ninja (Pvt) Ltd Full-Stack Development Technical Assessment.

InquiryFlow helps staff record customer inquiries, find existing requests, and track each inquiry from creation to resolution.

## Tech Stack

- Frontend: React, Vite, CSS, Lucide React
- Backend: Node.js, Express
- Database: PostgreSQL
- Authentication: JWT, bcrypt
- Validation: Zod
- Testing: Vitest, Supertest, React Testing Library

## Features

- Staff sign-in with backend-enforced authentication
- Create customer inquiries
- Search inquiries by customer, contact, or subject
- Filter inquiries by status
- Track inquiry status: New, In Progress, Resolved
- Reopen resolved inquiries
- Duplicate inquiry warning with manual confirmation
- Form validation and error feedback
- Persistent storage in PostgreSQL

## Prerequisites

- Node.js 22+
- PostgreSQL
- npm

## Database Setup

Create a PostgreSQL database named:

`customer_inquiry_management_system`

Run the SQL schema provided in the `database` directory.

## Backend Setup

Open a terminal in the `server` directory:

```bash
npm install
```

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/customer_inquiry_management_system
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
CLIENT_URL=http://localhost:5173
```

Seed the demo staff accounts:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

Backend API: `http://localhost:5000`

## Frontend Setup

Open another terminal in the `client` directory:

```bash
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Demo Accounts

For local assessment testing only:

| Email | Password |
| --- | --- |
| staff1@coffeeninja.local | DemoStaff123! |
| staff2@coffeeninja.local | DemoStaff456! |

These are seeded demonstration accounts, not production credentials.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Staff login |
| GET | `/api/auth/me` | Current staff profile |
| GET | `/api/inquiries` | List, search, and filter inquiries |
| POST | `/api/inquiries` | Create an inquiry |
| PATCH | `/api/inquiries/:id/status` | Update inquiry status |

Inquiry endpoints require a valid JWT bearer token.

## Testing

### Backend

Create a separate PostgreSQL database:

`customer_inquiry_management_test`

Apply the same database schema and create `server/.env.test` using the test database URL.

Seed the test database with the demo staff accounts.

From the `server` directory:

```bash
npm test
```

### Frontend

From the `client` directory:

```bash
npx vitest run
```

Current test results:

- Backend: 11 passing
- Frontend: 2 passing

Backend tests cover authentication and protected routes. Frontend tests cover login form rendering and invalid-login feedback. Inquiry creation, duplicate handling, and status transitions have also been manually tested, but are not yet covered by automated integration tests.

## Key Design Decisions

See [DECISIONS.md](./DECISIONS.md) for assumptions, design choices, trade-offs, and future improvements.

## Notes

This project is intended for local demonstration. Production hosting and external messaging integrations are outside the assessment scope.

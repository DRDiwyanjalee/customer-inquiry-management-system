# InquiryFlow — Customer Inquiry Management System

A full-stack customer inquiry management application developed for the **Coffee Ninja (Pvt) Ltd Full-Stack Development Technical Assessment**.

InquiryFlow allows staff members to record customer inquiries, identify possible duplicates, search and filter existing inquiries and manage each inquiry throughout its lifecycle.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, CSS, Lucide React |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL |
| Authentication | JSON Web Tokens (JWT), bcrypt |
| Validation | Zod |
| Testing | Vitest, Supertest, React Testing Library |

## Features

- Staff authentication with JWT-protected API endpoints
- Automatic logout after a period of inactivity
- Create customer inquiries with form validation
- Duplicate inquiry detection with a warning and manual confirmation
- Search inquiries by customer information, contact details or subject
- Filter inquiries by status
- Track inquiry status: **New → In Progress → Resolved**
- Reopen resolved inquiries with a required reason
- View inquiry status-change history
- View and edit inquiry details
- Dashboard summary cards for inquiry statuses
- Automatic inquiry refresh and cross-tab updates
- Responsive user interface
- Persistent PostgreSQL storage

## Prerequisites

- Node.js 22 or later
- PostgreSQL
- npm

## Project Setup

### 1. Database Setup

Create a PostgreSQL database named:

`customer_inquiry_management_system`

Execute the SQL schema included in the `database` directory.

### 2. Backend Setup

Open a terminal in the `server` directory:

```bash
cd server
npm install
```

Create `server/.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/customer_inquiry_management_system
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
CLIENT_URL=http://localhost:5173
```

Replace the placeholder database password and JWT secret with your own values.

Seed the demonstration staff accounts:

```bash
npm run seed
```

Start the backend development server:

```bash
npm run dev
```

The backend runs at:

`http://localhost:5000`

### 3. Frontend Setup

Open a separate terminal in the `client` directory:

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open:

`http://localhost:5173`

## Demo Accounts

The following accounts are intended for local assessment testing only.

| Email | Password |
|---|---|
| staff1@coffeeninja.local | DemoStaff123! |
| staff2@coffeeninja.local | DemoStaff456! |

These are demonstration credentials and must not be reused in production.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check API health |
| POST | `/api/auth/login` | Authenticate a staff member |
| GET | `/api/auth/me` | Retrieve the authenticated staff profile |
| GET | `/api/inquiries` | List, search, and filter inquiries |
| POST | `/api/inquiries` | Create an inquiry |
| PATCH | `/api/inquiries/:id/status` | Change an inquiry's status |

Inquiry management endpoints require a valid JWT bearer token.

Additional inquiry detail, editing, and history operations are implemented in the application.

## Testing

### Backend Tests

Create a separate PostgreSQL test database:

`customer_inquiry_management_test`

Apply the database schema and configure `server/.env.test` to use the test database. Seed the required demonstration staff accounts in the test database.

From the `server` directory, run:

```bash
npm test
```

**Latest result: 11 tests passed across 3 test files.**

The automated backend suite covers authentication, inquiry endpoints, and the health endpoint.

### Frontend Tests

From the `client` directory, run:

```bash
npm test
```

Alternatively:

```bash
npx vitest run
```

**Latest result: 2 tests passed.**

The frontend tests verify login form rendering and invalid-login feedback.

### Production Build

From the `client` directory:

```bash
npm run build
```

The production-ready frontend files are generated in `client/dist`.

**Latest result: build successful.**

### Manual Verification

The following workflows have also been manually tested during development:

- Staff login and logout
- Inquiry creation and duplicate warning
- Search and status filtering
- Inquiry detail viewing and editing
- Status transitions
- Reopening a resolved inquiry with a reason
- Status history viewing
- Automatic refresh and cross-tab updates

Not all application workflows currently have automated end-to-end test coverage.

## Design Decisions

See [DECISIONS.md](./DECISIONS.md) for architectural decisions, assumptions, trade-offs, and possible future improvements.

## Project Scope

InquiryFlow is designed for local demonstration as part of a technical assessment.

Production deployment, external notification integrations, and advanced reporting are outside the current scope.
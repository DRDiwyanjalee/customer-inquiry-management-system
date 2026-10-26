# InquiryFlow — Design Decisions

## Assumptions

InquiryFlow is designed for a small customer-support team. Staff accounts are created in advance and public registration is not required. All authenticated staff can access and manage inquiries in a shared workspace. Inquiries use three statuses New, In Progress and Resolved. PostgreSQL stores staff, inquiry and status-history data.

## Key Design Choices

**1. Shared staff access with backend authentication**

Every authenticated staff member can view and manage all inquiries. This avoids complex ownership rules for a small team. Passwords are hashed using bcrypt and inquiry API endpoints require a valid JWT. Unauthenticated users cannot access inquiry data, even when bypassing the frontend or using a direct link.

**2. Controlled status transitions and history**

Inquiries follow New → In Progress → Resolved. A resolved inquiry can be reopened to In Progress, but a reason is required. The backend validates transitions, and status history records workflow changes so staff can understand what happened previously.

**3. Duplicate warnings and input validation**

The application warns staff about possible duplicate unresolved inquiries while allowing explicit confirmation to create a separate record. Frontend validation provides immediate feedback, while backend Zod validation independently rejects invalid input.

## Accepted Trade-off

The application uses periodic polling instead of WebSockets to refresh inquiry data across browser tabs. Polling is simpler to implement and maintain, but updates are not instantaneous. Simultaneous edits may still require additional conflict handling.

## Testing and Gaps

The automated test suite contains 11 passing backend tests and 2 passing frontend tests. Backend tests cover authentication, inquiry API behavior, and health checks. Frontend tests cover login form rendering and invalid-login feedback.

Inquiry creation, duplicate handling, search/filtering, status transitions, reopening and history were also tested manually. Full end-to-end automation and concurrent-update tests remain future improvements.

## AI Assistance

AI tools assisted with architecture discussions, code suggestions, troubleshooting, tests, and documentation. One suggestion I accepted was using a separate PostgreSQL test database to prevent automated tests from modifying demonstration data. Suggestions were reviewed and verified through automated tests and manual checks.

## Future Improvements

Given more time, I would add inquiry assignment, role-based permissions, real-time synchronization, conflict detection for simultaneous edits and broader automated end-to-end test coverage.
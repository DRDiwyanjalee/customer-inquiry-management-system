
# InquiryFlow — Design Decisions

## 1. Assumptions

InquiryFlow is designed for a small customer-support team that needs simple way to record and track customer inquiries.

- Staff accounts are created in advance, public registration is not required.
- All authenticated staff members can view and manage all inquiries.
- Inquiries are managed through three statuses New, In Progress and Resolved.
- PostgreSQL is the source of truth for inquiry and staff data.

## 2. Key Design Decisions

### Shared Staff Access

Every authenticated staff member can view and update all inquiries.

This keeps the workflow simple for a small team and allows any available employee to continue handling a customer request. The backend protects inquiry endpoints using JWT authentication.

A more advanced system could introduce assigned owners and role-based permissions.

### Controlled Status Transitions

An inquiry follows this lifecycle:

- New → In Progress
- In Progress → Resolved
- Resolved → In Progress (reopen)

Other transitions are rejected by the backend.

This prevents accidental status changes while still allowing staff to reopen an inquiry when a customer needs further help. The frontend also asks for confirmation before changing a status.

### Duplicate Inquiry Handling

When a new inquiry resembles an existing unresolved inquiry from the same customer contact, backend returns a duplicate warning.

The user can review the existing inquiry or explicitly choose to create another one.

This avoids silently deleting or merging customer information while still reducing accidental duplicates.

## 3. Trade-off

The application uses a shared inquiry workspace instead of implementing individual assignment or complex permissions.

This is appropriate for the assessment's small-team workflow, but it does not identify one staff member as the person currently responsible for each inquiry.

For stale data, the application refreshes the inquiry list after successful status update. It does not provide real-time synchronization across browser tabs. A second tab may temporarily show an outdated status until its data is refreshed.

## 4. Validation and Error Handling

The backend validates inquiry data independently of frontend form validation.

Protected routes reject requests without valid authentication. Invalid status transitions and missing records are handled through API error responses.

The interface provides feedback for failed requests, duplicate inquiries, empty search results and successful operations.

## 5. Testing

Backend tests cover authentication and access protection.

Frontend tests verify login form rendering and invalid-login feedback.

The inquiry creation, duplicate warning, search/filter, and status workflow have also been manually tested.

Automated integration tests for the full inquiry lifecycle and concurrent updates are areas for future improvement.

## 6. Use of AI Tools

AI assistance was used to discuss architecture, generate initial code suggestions, troubleshoot implementation issues and help prepare tests and documentation.

One suggestion accepted was using a separate PostgreSQL test database to prevent automated tests from affecting demonstration data.

The implementation was tested through terminal commands and manual browser checks and suggestions were adjusted when issues were identified.

## 7. Future Improvements

Given more time, I would add:

- Inquiry assignment and clearer ownership tracking
- Audit history for status changes
- Better handling of stale updates across browser tabs
- More automated integration and frontend tests

The priority for this assessment was a reliable, understandable end-to-end workflow rather than a large feature set.

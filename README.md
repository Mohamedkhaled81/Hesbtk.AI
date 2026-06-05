# Hesbtk.AI Backend

NestJS backend for a multi-tenant SMB ERP/accounting system. The database uses one shared PostgreSQL database, public shared tables for platform data, and one PostgreSQL schema per tenant organization for accounting data.

## Implemented Flows

- Registration creates the user, organization, owner membership, tenant schema, and initial chart of accounts.
- Login returns a JWT plus available tenant contexts.
- Tenant access is enforced through `Authorization: Bearer <token>` and `x-tenant-id: <organizationId>`.
- Owners can invite members and invitees can accept invitations.
- Chart of accounts, customers, vendors, journal entries, customer invoices, customer payments, vendor bills, and vendor payments are implemented.
- Invoices and bills automatically create accounting journal entries.
- Payments automatically create cash/AR/AP journal entries and update document status.
- Recurring entries can be created and run manually; a daily scheduler also evaluates due recurring entries.
- Dashboard KPIs, forecasts, chatbot financial summary, alerts, and suggestions endpoints are available.

## Tech Stack

- NestJS 11
- Prisma 7
- PostgreSQL
- JWT authentication
- `@nestjs/schedule` for recurring jobs

## Environment

Create `.env` from `.env.example` and set real values:

```bash
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hesbtk
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
```

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

The API is served under:

```text
http://localhost:3000/api/v1
```

If Prisma engine download fails on Windows certificate validation, run:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npx prisma generate
```

## Request Conventions

Protected endpoints require:

```text
Authorization: Bearer <JWT>
x-tenant-id: <organizationId>
Content-Type: application/json
```

Use the `organization.id` returned by registration or the `tenants[].organizationId` returned by login as `x-tenant-id`.

## Sample Endpoint Tests

Set helper variables after registration/login:

```bash
BASE=http://localhost:3000/api/v1
TOKEN=<paste-access-token>
TENANT=<paste-organization-id>
```

### Register and Provision Tenant

```bash
curl -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Mona Owner",
    "email": "owner@example.com",
    "password": "Password123!",
    "organizationName": "Nile Retail",
    "industry": "Retail",
    "currency": "EGP"
  }'
```

### Login

```bash
curl -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "Password123!"
  }'
```

### Onboarding

```bash
curl "$BASE/onboarding/$TENANT/next" \
  -H "Authorization: Bearer $TOKEN"
```

```bash
curl -X POST "$BASE/onboarding/$TENANT/answer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionKey": "business_model",
    "answer": "Retail sales with card and cash payments"
  }'
```

### List Tenant Accounts

```bash
curl "$BASE/tenant/accounts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT"
```

### Add Customer and Vendor

```bash
curl -X POST "$BASE/tenant/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Acme Customer", "email": "ap@acme.test" }'
```

```bash
curl -X POST "$BASE/tenant/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Supply Vendor", "email": "billing@supply.test" }'
```

### Create Manual Journal Entry

Use account IDs from `GET /tenant/accounts`.

```bash
curl -X POST "$BASE/tenant/journal-entries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-05",
    "description": "Owner capital deposit",
    "lines": [
      { "accountId": "<cash-account-id>", "debit": 10000, "credit": 0 },
      { "accountId": "<equity-account-id>", "debit": 0, "credit": 10000 }
    ]
  }'
```

### Create Customer Invoice

```bash
curl -X POST "$BASE/tenant/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<customer-id>",
    "issueDate": "2026-06-05",
    "dueDate": "2026-06-20",
    "lines": [
      {
        "description": "Consulting service",
        "quantity": 2,
        "unitPrice": 1500,
        "taxRate": 14
      }
    ]
  }'
```

This creates:

- an invoice
- invoice lines
- a journal entry: debit Accounts Receivable, credit Sales Revenue
- a due-date alert

### Record Customer Payment

```bash
curl -X POST "$BASE/tenant/customer-payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<invoice-id>",
    "amount": 3420,
    "paymentMethod": "cash",
    "paymentDate": "2026-06-06",
    "reference": "RCPT-001"
  }'
```

This creates a journal entry: debit Cash and Bank, credit Accounts Receivable.

### Create Vendor Bill

```bash
curl -X POST "$BASE/tenant/vendor-bills" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "<vendor-id>",
    "issueDate": "2026-06-05",
    "dueDate": "2026-06-18",
    "lines": [
      {
        "description": "Office supplies",
        "quantity": 5,
        "unitPrice": 200,
        "taxRate": 14
      }
    ]
  }'
```

This creates a journal entry: debit Operating Expenses, credit Accounts Payable.

### Record Vendor Payment

```bash
curl -X POST "$BASE/tenant/vendor-payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<vendor-bill-id>",
    "amount": 1140,
    "paymentMethod": "cash",
    "paymentDate": "2026-06-07",
    "reference": "PAY-001"
  }'
```

### Recurring Monthly Expense

```bash
curl -X POST "$BASE/tenant/recurring-entries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly wages",
    "frequency": "monthly",
    "startDate": "2026-06-01",
    "lines": [
      { "accountId": "<expense-account-id>", "debit": 5000, "credit": 0 },
      { "accountId": "<cash-account-id>", "debit": 0, "credit": 5000 }
    ]
  }'
```

Run ready recurring entries manually:

```bash
curl -X POST "$BASE/tenant/recurring-entries/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT"
```

### Dashboard Insights

```bash
curl "$BASE/tenant/insights/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT"
```

### Forecasts

```bash
curl "$BASE/tenant/forecasts?months=12" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT"
```

### Chatbot

```bash
curl -X POST "$BASE/tenant/chatbot" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How is my cash position?"
  }'
```

### Alerts and Suggestions

```bash
curl -X POST "$BASE/tenant/alerts/evaluate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT"
```

```bash
curl "$BASE/tenant/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT"
```

```bash
curl "$BASE/tenant/suggestions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT"
```

### Invite Team Member

```bash
curl -X POST "$BASE/org/$TENANT/invitations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "accountant@example.com",
    "role": "accountant"
  }'
```

### Accept Invitation

The invitee should register or login first, then call:

```bash
curl -X POST "$BASE/auth/accept-invitation" \
  -H "Authorization: Bearer <invitee-token>" \
  -H "Content-Type: application/json" \
  -d '{ "token": "<invitation-token>" }'
```

### Admin Dashboard

Requires a user with `global_role = admin` in the public `users` table.

```bash
curl "$BASE/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN"
```

## Notes

- Runtime tenant tables are created by `TenantService.provisionTenantSchema()` when an organization registers.
- Prisma models cover the shared public schema. Tenant schema tables are accessed with guarded raw SQL because tenant schema names are created dynamically.
- The forecast and chatbot implementations are deterministic baseline services ready to be replaced by ML or LLM integrations later.

# Catering ERP

A full-stack **Catering & Event Management ERP** designed to manage catering operations, events, employees, customers, inventory, billing, payments, reports, notifications, and business activity from a centralized platform.

The system is built around real business workflows rather than static/demo data, with server-side financial calculations, role-based access control, audit logging, and PostgreSQL persistence.

---

## 🚀 Overview

Catering businesses often manage employees, events, rental products, customer payments, invoices, and daily operations across spreadsheets and disconnected systems.

This ERP brings those workflows into a single application.

### Core business flow

```text
Customer
   ↓
Program / Event
   ↓
Employee Staffing
   ↓
Attendance
   ↓
Employee Earnings
   ↓
Employee Payment
```

```text
Customer
   ↓
Products / Services
   ↓
Invoice
   ↓
Customer Payment
   ↓
Outstanding Balance
```

---

## ✨ Key Features

### 🔐 Authentication & Authorization

* Secure authentication
* JWT-based sessions
* Role-based access control
* Admin and Employee portals
* Protected server-side routes
* API authorization
* IDOR protection
* Secure password handling
* Role-specific navigation

---

### 📊 Admin Dashboard

The dashboard provides an overview of the business with live database information.

Includes:

* Business KPIs
* Revenue information
* Outstanding customer balances
* Employee payment information
* Upcoming programs
* Low-stock alerts
* Recent invoices
* Recent activity
* Quick business actions
* Responsive dashboard layout

All dashboard information is retrieved from the database.

---

### 👥 Employee Management

Manage the complete employee lifecycle.

Features include:

* Employee profiles
* Employee codes
* Employee types
* Employee status
* Daily/hourly rates
* Program assignments
* Attendance
* Employee earnings
* Employee payments
* Employee financial ledger
* Employee outstanding balance
* Employee portal

#### Employee ledger

```text
Total Earnings
      -
Total Payments
      =
Outstanding Balance
```

---

### 📅 Program & Event Management

Manage catering programs and events from creation to completion.

Features:

* Create programs
* Customer association
* Event date and time
* Venue information
* Program status
* Employee staffing
* Employee confirmation
* Employee joining workflow
* Program details
* Attendance tracking

### Program lifecycle

```text
UPCOMING
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

or

```text
UPCOMING
   ↓
CANCELLED
```

---

### ⏱️ Attendance & Employee Earnings

Attendance is connected directly to employee earnings.

For hourly employees:

```text
Hours Worked × Hourly Rate = Earnings
```

Example:

```text
5 hours × $30/hour = $150
```

The system automatically creates the corresponding employee earning entry and prevents duplicate earning records.

---

### 💰 Employee Payments

Administrators can record employee payouts.

Supported workflow:

```text
Employee Earnings
       ↓
Payment / Disbursement
       ↓
Employee Ledger
       ↓
Outstanding Balance
```

Payment information is persisted in the database and reflected throughout the ERP.

---

### 🧑💼 Customer Management

Manage customers and their complete business relationship.

Features:

* Customer profiles
* Customer codes
* Contact information
* Company information
* Customer directory
* Customer programs
* Customer invoices
* Customer payments
* Financial overview
* Outstanding balance
* Customer ledger

---

### 📦 Product & Inventory Management

Manage catering and rental products.

Examples:

* Plates
* Glasses
* Chairs
* Tables
* Juice counters
* Lighting equipment
* Serving equipment
* Rental assets
* Other catering products

Features:

* Product catalog
* Product categories
* SKU generation
* Stock quantity
* Minimum stock threshold
* Low-stock alerts
* Stock adjustment
* Stock history
* Inventory valuation

### Stock operations

```text
ADD
DEDUCT
SET
```

Stock adjustments are recorded for traceability.

---

### 🧾 Invoice & Billing

Create customer invoices with multiple products and services.

Features:

* Customer selection
* Program association
* Multiple invoice items
* Product/service items
* Quantity
* Unit price
* Discount
* Tax
* Server-side calculations
* Invoice status
* Payment reconciliation
* Print-friendly invoices

### Invoice calculation

```text
Subtotal
   +
Tax
   -
Discount
   =
Grand Total
```

Financial calculations are performed on the server rather than trusting frontend-submitted totals.

Historical invoice item prices are preserved.

---

### 💳 Customer Payments

Record and reconcile customer payments.

Supports:

* Partial payments
* Full payments
* Payment receipts
* Invoice reconciliation
* Customer ledger
* Outstanding balance calculation

Example:

```text
Invoice       $420
Payment 1     $200
-------------------
Outstanding   $220

Payment 2     $220
-------------------
Outstanding   $0
Status        PAID
```

---

### 📈 Reports & Analytics

Business reporting provides visibility into operational and financial data.

Reports cover areas such as:

* Revenue
* Programs
* Employees
* Customers
* Inventory
* Expenses
* Financial summaries

Reports use database-backed information rather than hardcoded statistics.

---

### 🔔 Notifications

The notification system provides users with important business updates.

Features include:

* User-specific notifications
* Unread notification count
* Mark as read
* Mark all as read
* Business event notifications
* Role-aware notifications

---

### 📝 Activity Logs

Important business actions are recorded for accountability.

Activity logging covers important operations such as:

* Employee changes
* Program changes
* Attendance
* Payments
* Customer operations
* Inventory adjustments
* Invoice-related operations
* Other important business actions

Activity logs are intended to provide an immutable history of important system operations.

---

### ⚙️ Business Settings

Administrative settings allow business-level configuration from the ERP.

The settings area is protected by administrator authorization.

---

## 🏗️ Architecture

The application follows a modern full-stack architecture.

```text
┌─────────────────────────────┐
│        Next.js / React      │
│       Frontend / UI         │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│       Server / API Layer    │
│ Authentication              │
│ Authorization               │
│ Validation                  │
│ Business Logic              │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│           Prisma            │
│        ORM / Database       │
│          Access             │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│    PostgreSQL / Supabase    │
│       Persistent Data       │
└─────────────────────────────┘
```

---

## 🛡️ Security

Security was treated as a core part of the application.

### Role-Based Access Control

The system separates:

* `ADMIN`
* `EMPLOYEE`

Admin-only operations are protected on the server.

Employee users cannot access administrative operations.

---

### IDOR Protection

Employee-specific APIs derive the employee identity from the authenticated server-side session instead of trusting arbitrary IDs supplied by the client.

This prevents users from attempting to access another employee's private information.

---

### Server-Side Financial Validation

Important financial calculations are performed on the server.

This applies to:

* Invoice totals
* Taxes
* Discounts
* Customer payments
* Employee earnings
* Employee payouts
* Outstanding balances

---

### Secret Protection

Sensitive environment variables are never exposed to client-side code.

Examples include:

```text
DATABASE_URL
DIRECT_URL
AUTH_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

Environment files are excluded from Git tracking.

---

## 🧪 Validation & Testing

The completed application was validated through real database workflows using PostgreSQL/Supabase.

### Real-world workflow validation

The following workflows were tested end-to-end:

* Customer creation
* Program creation
* Employee creation
* Employee staffing
* Attendance
* Automatic wage calculation
* Employee payout
* Product creation
* Inventory management
* Invoice generation
* Partial customer payment
* Final customer settlement
* Ledger reconciliation

### Example validation

```text
5 hours × $30/hour
        =
$150 employee earnings

$150 earnings
-
$150 employee payout
        =
$0 outstanding
```

Customer invoice reconciliation was also verified from invoice creation through complete payment settlement.

---

## ✅ Quality Checks

| Check                      | Result |
| -------------------------- | ------ |
| TypeScript                 | ✅ PASS |
| ESLint                     | ✅ PASS |
| Production Build           | ✅ PASS |
| Real Database Workflows    | ✅ PASS |
| RBAC Audit                 | ✅ PASS |
| IDOR Audit                 | ✅ PASS |
| Financial Validation       | ✅ PASS |
| Secret Scan                | ✅ PASS |
| Responsive UI              | ✅ PASS |
| Mock Data Fallback Removal | ✅ PASS |

### Build verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

All completed successfully during final validation.

---

## 📱 Responsive Design

The ERP is designed for:

* Desktop
* Tablet
* Mobile

Responsive behavior includes:

* Collapsible navigation
* Responsive cards
* Mobile-friendly forms
* Internal table scrolling
* Responsive dashboards
* Adaptive layouts
* Print-friendly invoice/report layouts

---

## 🎨 Design System

The application follows a professional enterprise SaaS visual style.

### Visual direction

* White-first interface
* Light gray backgrounds
* Dark slate typography
* Orange brand accent
* Clean cards
* Consistent spacing
* Minimal visual clutter

The design intentionally avoids excessive use of the accent color to maintain a professional ERP appearance.

---

## 🛠️ Technology Stack

The project uses:

* **Next.js**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **Prisma ORM**
* **PostgreSQL**
* **Supabase**
* **JWT Authentication**

Additional dependencies are documented in `package.json`.

---

## 📁 Project Structure

A simplified structure:

```text
src/
├── app/
│   ├── admin/
│   ├── employee/
│   ├── api/
│   ├── login/
│   └── ...
│
├── components/
│   ├── admin/
│   ├── employee/
│   ├── forms/
│   ├── ui/
│   └── ...
│
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   └── ...
│
└── ...

prisma/
├── schema.prisma
└── seed.*

public/
└── ...

.env.example
README.md
package.json
```

---

## ⚙️ Local Development

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd YOUR_PROJECT_DIRECTORY
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create:

```text
.env
```

Use `.env.example` as the reference.

Example:

```env
DATABASE_URL="your_database_url"
DIRECT_URL="your_direct_database_url"
AUTH_SECRET="your_auth_secret"
```

Never commit real credentials.

---

### 4. Generate Prisma Client

```bash
npx prisma generate
```

---

### 5. Run database migrations

Use the migration workflow appropriate for the configured environment.

```bash
npx prisma migrate dev
```

Do not use destructive database reset commands against production databases.

---

### 6. Start development server

```bash
npm run dev
```

The application will be available at the local development address shown by Next.js.

---

## 🚀 Production Deployment

The application is designed for deployment using:

```text
Frontend
Next.js → Vercel

Database
PostgreSQL → Supabase
```

Production environment variables must be configured through the hosting provider.

Never commit:

```text
.env
DATABASE_URL
DIRECT_URL
AUTH_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

or any other private credentials.

---

## 👤 Application Roles

### Admin

Administrators can manage:

* Employees
* Programs
* Customers
* Products
* Inventory
* Invoices
* Payments
* Reports
* Notifications
* Activity Logs
* Settings

### Employee

Employees have access to their own operational information, including:

* Programs
* Assigned work
* Attendance
* Earnings
* Payment history
* Notifications

Employees cannot access administrator-only functionality.

---

## 💡 Business Value

The ERP helps a catering business move away from disconnected spreadsheets and manual calculations.

It centralizes:

```text
Employees
    +
Events
    +
Customers
    +
Inventory
    +
Billing
    +
Payments
    +
Reports
    +
Audit History
```

This provides a single source of operational and financial information.

---

## 🔮 Future Improvements

Potential future improvements could include:

* Advanced business analytics
* Automated invoice delivery
* WhatsApp/SMS notifications
* Advanced expense management
* Multi-branch support
* Advanced inventory forecasting
* Additional reporting dashboards
* Cloud file/document management

These are intentionally outside the current core implementation.

---

## 📌 Project Status

**Production-ready core ERP**

The current implementation has completed:

* Core ERP development
* Real-world workflow validation
* Security audit
* Financial integrity testing
* Responsive UI validation
* Performance checks
* Production build verification
* Portfolio documentation

---

## 👨💻 Developer

**Ramees**

Full-Stack Developer

Specializing in modern web application development with:

```text
React
Next.js
TypeScript
PostgreSQL
Prisma
Supabase
```

---

## 📄 License

Add the project's actual license here if one is configured.

If no license has been selected yet, this repository should not claim an open-source license until one is intentionally added.


## YES YES Marketing ERP

ERP web application for Sales, Accounts, Inventory, Procurement and Admin workflows.

Original UI reference: https://www.figma.com/design/Ejzb6IIYTSmHjzvq9z4kam/Web-Dashboard-UI-Design

## Running the code

- `npm i`
- `npm run dev`

## Implemented Functional Coverage

- Reports module:
  - Admin reports: [src/app/pages/admin/AdminReports.tsx](src/app/pages/admin/AdminReports.tsx)
  - Inventory reports: [src/app/pages/inventory/InventoryReports.tsx](src/app/pages/inventory/InventoryReports.tsx)
  - Procurement reports (live MVP): [src/app/pages/procurement/ProcurementReports.tsx](src/app/pages/procurement/ProcurementReports.tsx)
- Billing / invoice generation:
  - Billing page: [src/app/pages/accounts/Billing.tsx](src/app/pages/accounts/Billing.tsx)
  - Route: `/accounts/billing`
  - Accounts/Admin can transition `Approved → Billed`, assign invoice number and download invoice PDF
- Forgot password:
  - Request reset from login: [src/app/pages/Login.tsx](src/app/pages/Login.tsx)
  - Complete reset at change password: [src/app/pages/ChangePassword.tsx](src/app/pages/ChangePassword.tsx)
  - Recovery flow and forced password change are both supported
- Search & filters:
  - Shared `SearchBar`, `FilterBar`, `FilterField` patterns across operational pages

## Invoice / Billing Explanation

- Who creates the invoice:
  - Accounts role (Admin can access as fallback).
- Where invoice is generated:
  - Accounts → Billing (`/accounts/billing`) via `Bill & PDF` action.
- GST invoice PDF output:
  - Invoice PDF is generated on billing/download actions and saved locally.
  - GST/IGST/NGST type is shown in the document header and tax rows.

## Forgot Password Steps

1. User enters email in login screen and clicks `Forgot password?`.
2. System sends reset link (generic anti-enumeration response) with cooldown.
3. User opens reset link and reaches `/change-password`.
4. User sets new password meeting security rules.
5. Password is updated in auth, and profile flag `must_change_password` is cleared.

## Screenshots

- In-app screenshot capture:
  - Billing page includes `Capture Screenshot` action that downloads a PNG snapshot.
- Naming convention:
  - `billing-snapshot-YYYY-MM-DD.png`
- Documentation screenshot storage path:
  - `public/screenshots/`
  
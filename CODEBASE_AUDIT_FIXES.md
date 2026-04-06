# Codebase Audit - Critical Issues & Fixes

## Status: IN PROGRESS ✅

### CRITICAL ISSUES FIXED

#### ✅ 1. GlobalSearch company_name Bug
- **File**: `src/app/components/GlobalSearch.tsx` (Lines 165-166, 175)
- **Issue**: Referenced non-existent `company_name` field; actual field is `name`
- **Status**: FIXED
- **Changes**:
  - Line 165: `.select('id, company_name, contact_person')` → `.select('id, name, contact_person')`
  - Line 166: `.ilike('company_name', ...)` → `.ilike('name', ...)`
  - Line 175: `s.company_name` → `s.name`

---

### CRITICAL ISSUES IN PROGRESS

#### 🔄 2. Settings Table Deployment
- **Status**: CREATED (migration applied successfully)
- **Database**: Supabase table `settings` with key-value JSONB storage
- **Default Settings**: company_name, GSTIN, address, phone, email, business rules, master data

---

### HIGH PRIORITY ISSUES TO FIX

#### 📋 1. GRN Creation Implementation
- **File**: `src/app/pages/procurement/GRN.tsx` (Line 114)
- **Current State**: Button is disabled, only shows placeholder success toast
- **Required Changes**:
  - Enable form submission
  - Implement database insert for `grn_items`
  - Update product stock levels
  - Validate received qty <= expected qty
  - Add error handling and rollbacks

#### 📋 2. Promise.all Error Handling
- **Affected Files**: 19 files using Promise.all
- **Example File**: `src/app/pages/inventory/Brands.tsx` (Lines 34-37)
- **Current Pattern**:
```typescript
const [{ data: brandData }, { data: productData }] = await Promise.all([...]);
// No error checks! Data could be undefined
```
- **Required Fix**: Check errors on each destructured result

#### 📋 3. Real-time Data Synchronization
- **Issue**: No Supabase subscriptions anywhere
- **Impact**: Changes in one browser tab don't reflect in others
- **Required**: Add `supabase.from('table').on('*').subscribe()` to critical pages

#### 📋 4. Remove Unsafe `as any` Type Assertions
- **Priority Files**:
  - `src/app/pages/sales/ReceiptEntry.tsx` (Line 87)
  - `src/app/pages/inventory/InventoryDashboard.tsx` (Line 104)
  - `src/app/pages/accounts/Payments.tsx` (Line 87)

#### 📋 5. Hardcoded Values Instead of Settings
- **File**: `src/app/pages/admin/CustomerAnalysisReport.tsx` (Lines 96-100)
- **Issue**: Locations hardcoded as `['Kottakkal', 'Chenakkal']`
- **Fix**: Load from `settings` table key: 'godowns'

---

### MEDIUM PRIORITY ISSUES

#### ⚠️ 1. Missing Loading States
- **File**: `src/app/pages/sales/CreateOrder.tsx` (Line 28)
- **Issue**: `loading` state defined but never used

#### ⚠️ 2. Unused State Variables
- **File**: `src/app/pages/sales/CreateOrder.tsx` (Lines 39-41)
- **Issue**: `phoneAutoFilled`, `addressAutoFilled`, `gstAutoFilled` flags set but never used

#### ⚠️ 3. Missing Error Boundaries
- **Issue**: Critical pages don't have ErrorBoundary wrappers

---

## Implementation Plan

### Phase 1 (DONE) ✅
- [x] Settings table created in Supabase
- [x] Fixed GlobalSearch company_name bug
- [x] Created audit document

### Phase 2 (TODAY)
- [ ] Implement GRN creation functionality
- [ ] Add Promise.all error handling to all files
- [ ] Add Supabase real-time subscriptions

### Phase 3 (NEXT)
- [ ] Replace hardcoded values with settings
- [ ] Remove `as any` type assertions
- [ ] Add missing loading states
- [ ] Clean up unused state variables

### Phase 4 (CLEANUP)
- [ ] Add ErrorBoundary wrappers
- [ ] Add role-based access control validation
- [ ] Fix race conditions in stock operations

---

## Testing Checklist

- [ ] GlobalSearch returns supplier results correctly
- [ ] GRN form is enabled and creates records
- [ ] Settings changes persist across browser tabs
- [ ] Real-time updates work for inventory/orders
- [ ] No TypeScript errors in build
- [ ] All Promise.all calls handle errors
- [ ] Hardcoded locations load from settings

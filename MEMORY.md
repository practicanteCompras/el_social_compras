# MEMORY.md — El Social Bodega | Project Memory & Changelog

> This file is the living memory of the project. It must be updated continuously as the project evolves.
> Every significant decision, architectural change, bug fix, or feature addition should be logged here.
> This file is intended for future developers and LLM agents picking up the project.

---

## Project Overview

**Project Name:** El Social Bodega — Warehouse Management System  
**Client:** El Social Medellín S.A.S  
**Type:** Internal web application  
**Status:** 🟡 In Development  
**Started:** 2026  

**One-line summary:** A smart, Kardex-style warehouse management system for a 7-location gastro-bar chain, featuring supplier price comparison, purchase order workflows, and cost savings analytics.

---

## Business Context Summary

- El Social Medellín S.A.S operates 7 gastro-bar locations across the Valle de Aburrá, Colombia.
- The purchasing department manages a central warehouse with PPE, staff uniforms, and packaging.
- Two core problems: (1) store leaders buy from expensive suppliers due to lack of price visibility, (2) no formal inventory tracking system exists.
- Existing data (products and suppliers) lives in Excel / Google Sheets and must be migrated at launch.

---

## Tech Stack Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Backend framework | FastAPI + Python | Modern, async, excellent for REST APIs, strong typing with Pydantic |
| Frontend framework | React.js + Tailwind CSS | Component-based, widely supported, rapid UI development |
| Database | Supabase (PostgreSQL) | Managed Postgres with built-in auth, RLS, realtime, and storage |
| Deployment | Cloud (Railway / Render) | Simple CI/CD, managed infra, suitable for small teams |
| PDF export | ReportLab | For cost savings report export |
| CSV import | pandas + openpyxl | For Excel/Google Sheets data migration |
| Frontend build tool | Vite | Fast dev server and build tool |
| HTTP client | axios | API calls with auth interceptor |
| Charts | Recharts | Dashboard visualizations |
| File upload | react-dropzone | CSV/Excel drag-and-drop upload |

---

## Architecture Decisions

### ADR-001: Shared Product Catalog
**Date:** 2026  
**Decision:** All 7 locations share a single product catalog, not per-location catalogs.  
**Reason:** Simplifies inventory management, ensures price consistency, reduces data duplication.  
**Consequences:** Orders must always reference a `sede_id` (store location ID) to track which location is requesting.

### ADR-002: Role-Based Access Control (RBAC)
**Date:** 2026  
**Decision:** Three roles — `admin`, `user`, `reviewer` — enforced at both API and UI level.  
**Reason:** Business requirement. Líderes should not be able to freely modify catalog data.  
**Implementation:** Supabase RLS policies + FastAPI dependency injection for role checks.

### ADR-003: Price History Append-Only
**Date:** 2026  
**Decision:** Monthly prices are never overwritten. New price entries are always appended with a timestamp.  
**Reason:** Preserves historical data for trend analysis and the savings report comparisons.

### ADR-004: Up to 3 Suppliers Per Product
**Date:** 2026  
**Decision:** Each product supports up to 3 supplier price slots by default, displayed side-by-side.  
**Reason:** Business requirement to enable price comparison at a glance. Minimum 1 supplier required.

### ADR-005: Order Approval Workflow
**Date:** 2026  
**Decision:** Orders go through states: `draft → sent → in_review → approved → dispatched → delivered`.  
**Reason:** Business requirement. The purchasing team must validate and approve before dispatching.

### ADR-006: In-App Notifications Only (v1)
**Date:** 2026  
**Decision:** Notifications (stock alerts, new orders, price spikes) are in-app only for v1. No email/SMS.  
**Reason:** Keeps v1 scope manageable. External notifications can be added in v2 via Supabase Edge Functions.

### ADR-007: API Versioning
**Date:** 2026  
**Decision:** All API routes are prefixed with `/api/v1/`.  
**Reason:** Allows future breaking changes without disrupting existing clients.

---

## Module Status Tracker

| Module                    | Status        | Notes |
|---------------------------|---------------|-------|
| Authentication / RBAC     | ✅ Done | Supabase Auth + JWT middleware + role dependencies (admin/user/reviewer) |
| Supplier Module           | ✅ Done | Full CRUD + search/filter, admin-only write, modal forms |
| Inventory / Kardex        | ✅ Done | Product CRUD, supplier linking, price history, movements, stock alerts, price comparison |
| Purchase Orders           | ✅ Done | Full workflow (draft→delivered), smart suggestions, status timeline |
| Cost Savings Report       | ✅ Done | PDF export via ReportLab with per-item and total savings |
| Dashboard / Statistics    | ✅ Done | Recharts: stock summary, movement history, price trends, savings history |
| Notifications System      | ✅ Done | In-app CRUD, triggers for low stock/new orders/price spikes, bell icon |
| CSV / Excel Import        | ✅ Done | pandas parsing, validation, drag-and-drop upload with preview |
| Database Schema           | ✅ Done | Full SQL migration with enums, indexes, RLS policies, seed data |

> Status legend: ⬜ Not started | 🟡 In Progress | ✅ Done | 🔴 Blocked

---

## Database Schema (Implemented)

### Tables (see `database/schema.sql` for full SQL)

```
users             — id, email, role (admin|user|reviewer), sede_id, created_at
sedes             — id, name, address, city
suppliers         — id, nit, company_name, category, advisor_name, phone_1, phone_2, email, response_days, credit_days
products          — id, category, code, name, unit, min_stock, created_at, updated_at
product_suppliers — id, product_id, supplier_id, slot (1|2|3)
price_history     — id, product_id, supplier_id, price, recorded_month, recorded_year, created_at
inventory_stock   — id, product_id, current_quantity, updated_at
inventory_movements — id, product_id, movement_type, quantity, user_id, sede_id, notes, created_at
orders            — id, sede_id, user_id, status, created_at, updated_at
order_items       — id, order_id, product_id, quantity_requested, suggested_supplier_id, suggested_price
notifications     — id, user_id, type, message, read, created_at
```

---

## Changelog

### [v0.1.0] — 2026 — Project Kickoff
- AGENTS.md created with full project specification.
- MEMORY.md initialized with architecture decisions and tech stack.
- Business requirements gathered and documented.
- Initial database schema planned.

### [v1.0.0] — 2026-02-19 — Full Implementation
- **Backend (FastAPI):** All API routes implemented under `/api/v1/` — auth, suppliers, inventory, orders, dashboard, notifications, import.
- **Frontend (React + Vite + Tailwind):** Full SPA with 10 pages — login, dashboard, suppliers, inventory, product detail, orders list, order detail, new order, notifications, import.
- **Database:** Complete SQL schema with 11 tables, custom enums, indexes, RLS policies for 3 roles, triggers, and 7 sede seed data.
- **Services:** supplier_service, inventory_service, order_service, suggestion_service, notification_service, dashboard_service, import_service, pdf_service.
- **Auth:** Supabase Auth integration with JWT middleware and role-based dependencies (admin, user, reviewer).
- **Smart Features:** Lowest-price supplier suggestion engine, cost savings mini-reports with PDF export (ReportLab).
- **Notifications:** In-app notification triggers for low stock, new orders, and price spikes (>10% MoM).
- **Import:** CSV/XLSX import for suppliers and products with pandas validation and error reporting.
- **UI:** Fully responsive, Spanish-facing labels, modern card-based design with green primary (#1B5E20) and amber secondary (#FF8F00).

---

## Known Constraints & Limitations

- User base is small (< 10 users), so performance optimization is not a v1 priority.
- No offline/PWA support required.
- All 7 sedes share one deployment instance (no multi-tenancy isolation needed).
- PDF generation uses ReportLab (server-side).
- Excel/CSV import uses pandas + openpyxl. Required columns documented in import_service.py.

---

## Pending Decisions (To Be Resolved)

- [x] Confirm PDF generation library — **ReportLab** chosen for server-side PDF generation.
- [x] Define "significant price increase" threshold — **>10% month-over-month** (configurable in notification_service).
- [x] Define CSV import column mapping — Suppliers: nit, company_name, category, contact_phone_1 (required) + optional fields. Products: code, name, category, unit (required) + min_stock.
- [ ] Confirm deployment platform (Railway vs Render vs other).
- [x] Define notification UI pattern — **Bell icon with badge** in navbar, dropdown panel with mark-as-read.

---

## Notes for Future Developers / LLM Agents

- Always read `AGENTS.md` first for the full system specification.
- UI text is in **Spanish**, code and docs are in **English** — maintain this convention strictly.
- The `user` role (líderes) has intentionally limited write access — do not grant them admin capabilities even if it seems convenient.
- Price history must never be overwritten — always insert new rows.
- The smart supplier suggestion logic is purely based on lowest current price — no ML involved in v1.
- When adding new modules, update the Module Status Tracker table in this file.
- When making architectural decisions, add a new `ADR-XXX` entry in the Architecture Decisions section.
# AGENTS.md — El Social Medellín S.A.S | Warehouse Management System

## Business Context

**El Social Medellín S.A.S** is a gastro-bar chain with **7 locations** across the Valle de Aburrá region in Colombia. The purchasing department (`área de compras`) manages a central warehouse containing PPE (EPP), staff uniforms (dotación), and packaging materials (empaques).

### Core Problems Being Solved

1. **Unoptimized supplier selection:** Point-of-sale leaders (líderes de punto de venta) purchase from suppliers without price comparison, generating avoidable overspending.
2. **No formal inventory management:** There is no system for tracking stock entries, exits, or counts in the central warehouse.

---

## Project Goal

Build a **web-based warehouse management platform** — a smart Kardex system with a friendly UI — that enables:
- Tracking inventory entries and exits with full traceability
- Managing and comparing suppliers and their pricing
- Generating smart purchase order suggestions to minimize costs
- Providing dashboards with statistical and graphical data

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | FastAPI + Python                  |
| Frontend   | React.js + Tailwind CSS           |
| Database   | Supabase (PostgreSQL)             |
| Deployment | Cloud (Railway / Render or similar) |

- The system must be **fully responsive** (mobile + desktop).
- All **code and technical documentation must be written in English**.
- All **UI-facing text and labels must be in Spanish**.

---

## System Modules

### 1. Authentication & Role-Based Access Control (RBAC)

Three user roles with different permission levels. User base is small (< 10 users).

| Role           | Spanish Label         | Permissions |
|----------------|-----------------------|-------------|
| `admin`        | Administrador         | Full access: create, read, update, delete all data across all modules |
| `user`         | Usuario (Líder)       | Limited: can change quantities, register movements, and submit requests for admin review |
| `reviewer`     | Revisor               | Read-only: can view dashboards, charts, and statistical reports only |

> Each user must be associated with one of the 7 store locations (sedes).

---

### 2. Supplier Module (Módulo de Proveedores)

An enriched supplier directory — more than a contact list, it stores commercial and operational data.

**Fields per supplier:**

| Field                  | Description                              |
|------------------------|------------------------------------------|
| `nit`                  | Tax ID number (NIT)                      |
| `company_name`         | Supplier company name                    |
| `category`             | Product/service category                 |
| `advisor_name`         | Name of the commercial advisor           |
| `contact_phone_1`      | Primary phone number                     |
| `contact_phone_2`      | Secondary phone number                   |
| `email`                | Contact email                            |
| `response_days`        | Average days to respond to a quote       |
| `credit_days`          | Payment credit term in days              |

---

### 3. Inventory Module — Smart Kardex (Módulo de Inventario)

A **shared catalog** used across all 7 locations (not per-location). Products are managed centrally from the warehouse.

**Fields per product:**

| Field            | Description                                              |
|------------------|----------------------------------------------------------|
| `category`       | Product category                                         |
| `code`           | Internal product code                                    |
| `name`           | Product name                                             |
| `unit`           | Unit of measure (UM) — e.g., unidad, caja, kg, litro    |
| `supplier_1`     | Primary linked supplier                                  |
| `supplier_2`     | Secondary supplier slot (default empty)                  |
| `supplier_3`     | Tertiary supplier slot (default empty)                   |
| `monthly_prices` | Price per supplier per month (historical tracking)       |
| `price_variation`| Month-over-month percentage change per supplier          |

**Price comparison table** must show all 3 supplier prices side by side per product, with visual indicators for the best price.

**Inventory Movement Types (Kardex entries):**

| Type                    | Spanish Label                    |
|-------------------------|----------------------------------|
| Purchase entry          | Entrada por compra a proveedor   |
| Exit by store request   | Salida por pedido de sede        |
| Inventory adjustment    | Ajuste de inventario (corrección)|
| Loss / damage           | Merma o daño de producto         |

Each movement must record: timestamp, responsible user, quantity, movement type, and optional notes.

**Stock Alerts:**
- Configurable minimum stock per product.
- Automatic alert triggered when stock drops below the defined minimum.
- Alert visible in UI and sent as a notification.

---

### 4. Purchase Orders Module (Módulo de Pedidos)

Workflow for store leaders to request supplies from the central warehouse/purchasing team.

#### Order Flow (States)

```
BORRADOR → ENVIADO → EN REVISIÓN → APROBADO → DESPACHADO → ENTREGADO
(Draft)   (Sent)   (In Review)  (Approved) (Dispatched) (Delivered)
```

- **Líder (user role):** Creates and submits orders.
- **Compras (admin role):** Reviews, approves or rejects, and marks as dispatched.

#### Smart Supplier Suggestion Engine

When a leader builds an order:
1. The system reads the current prices from the inventory module for each requested product.
2. It automatically **highlights the supplier with the lowest price** per product.
3. It generates a **cost savings mini-report** showing:
   - Highest available price per product
   - Suggested (lowest) price per product and its supplier
   - Item-level savings (difference)
   - Total estimated savings for the full order
4. The mini-report can be **exported to PDF**.

---

### 5. Dashboard & Statistics Module (Módulo de Reportes)

Accessible to all roles (with detail level depending on role).

**Visualizations to include:**

- Inventory movement history (entries vs exits over time)
- Current stock levels per product / category
- Monthly price variation per supplier and product
- Supplier price comparison charts
- Savings report history
- Warehouse data visualizations (graphical overview of stock status)

---

### 6. Notifications & Alerts System

| Trigger                                      | Recipients              |
|----------------------------------------------|-------------------------|
| Stock drops below minimum threshold          | Admin / Compras team    |
| A store leader submits a new purchase order  | Admin / Compras team    |
| A supplier's price increases significantly   | Admin / Compras team    |

Notifications should be visible within the app (in-app notification center). External notifications (email/SMS) are out of scope for v1 unless specified later.

---

## Data Migration

The company has **existing data in Excel / Google Sheets** (products and/or suppliers). The system must support an **import mechanism** (CSV or Excel upload) for the initial data load into the supplier and inventory modules.

---

## Coding & Documentation Conventions

- **Language:** All code, comments, docstrings, variable names, function names, API routes, and documentation files must be in **English**.
- **UI Language:** All user-facing labels, buttons, messages, and text must be in **Spanish**.
- **Backend:** Follow FastAPI best practices — use Pydantic models for validation, dependency injection, async routes, and proper HTTP status codes.
- **Frontend:** Use functional React components with hooks. Keep components modular and reusable. Use Tailwind utility classes consistently.
- **Database:** Use Supabase (PostgreSQL). Define clear table schemas with proper foreign keys, indexes, and RLS (Row Level Security) policies aligned with the RBAC roles.
- **Clean Code:** Separation of concerns, single responsibility principle, no business logic in route handlers.
- **API:** RESTful design. Version the API under `/api/v1/`.

---

## Project File Structure (Suggested)

```
el-social-bodega/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/       # Route handlers per module
│   │   ├── core/                # Config, security, dependencies
│   │   ├── models/              # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   └── db/                  # Supabase client and queries
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page-level components per module
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API call functions
│   │   ├── context/             # Auth context and global state
│   │   └── utils/               # Helper functions
│   └── package.json
├── AGENTS.md                    # This file — AI agent context
└── MEMORY.md                    # Project changelog and decisions log
```

---

## Key Business Rules

1. A product always has up to 3 supplier slots; at least 1 must be filled.
2. Price history is stored monthly — do not overwrite past prices, only append.
3. Only `admin` users can approve, reject, or dispatch orders.
4. Only `admin` users can add or edit supplier information and product catalog.
5. `user` role changes are flagged for admin review before being committed.
6. The smart suggestion always picks the **lowest current price** among filled supplier slots.
7. Minimum stock thresholds are set per product by an admin.
8. All 7 store locations share the same product catalog but each order is tied to a specific sede.
9. Data migration from Excel/Google Sheets must be supported at launch via CSV import.
10. PDF export of cost savings reports must be available for any completed order.


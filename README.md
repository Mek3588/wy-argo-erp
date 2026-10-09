# 🥛 WY Argo Dairy ERP

Enterprise Resource Planning (ERP) platform specifically designed for dairy manufacturing, collection, and retail sales companies.

Includes **Inventory Management** (with perishable batch tracking & FEFO stock dispatch), **POS Sales Counter**, **Expense Management** (categorized for dairy operations), **Cash Flow & Liquidity Management**, and **Role-Based Access Control (RBAC)**.

---

## 🌟 Key Features

### 1. 🥛 Dairy Inventory & Freshness Tracking
- **Dairy Catalog**: Products categorized as *Milk*, *Cheese*, *Butter*, *Yogurt*, *Cream*, and *Other* with custom units (*Liters*, *Kg*, *Packs*, *Bottles*).
- **Perishable Batch Tracking**: Batches with production dates, expiry dates, and real-time days-to-expiry calculation.
- **FEFO (First Expired, First Out)**: Sales automatically consume stock from the earliest expiring batches first to prevent spoilage.
- **Spoilage / Wastage Logging**: Record curdling, leaks, or audit adjustments with audit log history.
- **Health Indicators**: Real-time warnings for low stock levels and batches expiring within ≤ 3 days.

### 2. 🛒 Sales & Cashier Counter (POS)
- Fast POS interface for walk-in retail customers and wholesale clients.
- Multi-payment channel support: **Cash**, **Telebirr**, **Bank Transfer (CBE)**, and **Credit**.
- Real-time stock availability validation.
- Automatic creation of customer receipts and instant linkage to the Cash Flow ledger.

### 3. 💸 Dairy Expense Management
- Tailored dairy operational categories:
  - `Raw Milk Procurement` (purchases from smallholder farmers & cooperatives)
  - `Cattle Feed & Fodder`
  - `Packaging Materials` (bottles, foils, tubs)
  - `Cold Chain / Power / Diesel` (chiller room power, generator fuel)
  - `Transport & Delivery Logistics`
  - `Staff & Processing Wages`
  - `Equipment & Chiller Maintenance`
  - `Cleaning CIP & Supplies`
- Automatic reflection as **Cash Outflow** in Cash Flow management.

### 4. 📈 Cash Flow & Multi-Channel Liquidity
- Real-time **Net Working Capital** and cash balance calculations.
- Liquid balances broken down across payment channels (**Cash in Hand**, **Telebirr**, and **Bank Transfer**).
- Complete immutable audit journal (`cash_transactions`).
- Ability to record manual cash deposits (initial float, owner capital) or drawings.

### 5. 👥 Role Management & RBAC
- Four distinct pre-configured roles:
  | Role | Inventory | Sales / POS | Expenses | Cash Flow | User Admin |
  | :--- | :---: | :---: | :---: | :---: | :---: |
  | **ADMIN** | Full | Full | Full | Full | Full |
  | **MANAGER** | Full | Full | Full | Full | View Only |
  | **SALES_CASHIER** | View Only | Process | None | None | None |
  | **INVENTORY_CLERK**| Batches & Waste | None | Record Sourcing | None | None |
- Demo role quick-switcher on top navigation bar for immediate one-click testing between roles!

---

## 🔑 Pre-Seeded Demo User Accounts

| Role | Username / Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@wyargo.com` | `admin123` | Full administrative control |
| **Dairy Manager** | `manager@wyargo.com` | `manager123` | Production, sales & financial operations |
| **Sales Cashier** | `cashier@wyargo.com` | `cashier123` | Front-desk cashier & retail billing |
| **Inventory Clerk** | `inventory@wyargo.com` | `inventory123` | Cold-room intake & wastage recording |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
From the project root:
```bash
npm run install:all
```

### Running the Project

#### Run Both Backend & Frontend Simultaneously:
```bash
npm run dev
```
- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`

#### Or Run Individually:
- **Backend**:
  ```bash
  npm run dev:backend
  ```
- **Frontend**:
  ```bash
  npm run dev:frontend
  ```

---

## 🗄️ Architecture & Tech Stack

```
wy-argo-erp/
├── backend/
│   ├── src/
│   │   ├── config/ / db/      # SQLite database initialization & auto-seeding
│   │   ├── middleware/        # JWT auth & Role-Based Access Control (RBAC)
│   │   ├── routes/            # Auth, Users, Inventory, Sales, Expenses, CashFlow, Dashboard
│   │   └── server.ts          # Express API server entry
│   └── data/
│       └── dairy_erp.db       # Embedded SQLite DB
├── frontend/
│   ├── src/
│   │   ├── api/               # Typed API client
│   │   ├── context/           # AuthContext with 1-click role switcher
│   │   ├── components/        # Navbar, Sidebar, Modal
│   │   ├── pages/             # Dashboard, Inventory, Sales, Expenses, CashFlow, Roles, Login
│   │   ├── types/             # Domain TypeScript definitions
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── vite.config.ts         # Vite + Tailwind CSS plugin + API Proxy
└── package.json               # Monorepo management scripts
```

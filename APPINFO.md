
# Application-Connect 2.0: Technical & Operational Intelligence Report

## 1. Executive Summary & Status
**Current Status: STAGING / SIMULATION MODE (MVP)**

**Application-Connect 2.0** is an enterprise-grade Digital Public Infrastructure (DPI) platform designed to streamline the beneficiary identification and validation process for the **Pradhan Mantri Awas Yojana (PMAY)**.

**⚠️ Important Operational Note:**
The application is currently configured in **Simulation Mode**. 
*   **Data Persistence**: Data is stored in browser memory and will reset on refresh.
*   **Authentication**: Uses hardcoded mock users (admin/password123).
*   **Scanning**: Simulates hardware interaction using timers.
*   **Backend**: The Node.js server is implemented but the Frontend is disconnected (Toggle: `OFF`).

To go live, the "Production Readiness Checklist" (Section 6) must be executed.

---

## 2. Technology Stack

### **Frontend (Client-Side)**
*   **Core Framework**: **React 19** (Functional Components, Hooks, Context API).
*   **Language**: **TypeScript** (Ensures type safety).
*   **Build Tool**: **Vite**.
*   **UI System**: Tailwind CSS + Lucide React.
*   **Data Visualization**: Recharts.
*   **State**: React `useState` (Currently holding the Mock DB).

### **Backend (Server-Side - Ready for Activation)**
*   **Runtime**: **Node.js** (v18+).
*   **Framework**: **Express.js**.
*   **Security**: Helmet, JWT, Bcryptjs, IP Lockout Middleware.
*   **Database**: **SQLite** (Default) / PostgreSQL (Supported).
*   **File Handling**: Multer (Disk Storage).

---

## 3. Technical Complexity Analysis

**Overall Rating: High-Intermediate (7.5/10)**

### **1. Frontend Logic Complexity**
*   **Fuzzy Deduplication**: Implements client-side Jaro-Winkler logic to detect duplicate applicants across name, Aadhaar, and phonetics in real-time.
*   **Dynamic State**: The "Staging" vs. "Production" lifecycle requires complex state transitions.
*   **Document Previewing**: Handles Blob URLs for instant previews.

### **2. Security Complexity**
*   **Intrusion Detection**: Backend tracks IP addresses/timestamps to enforce 24-hour bans after 5 failed attempts.
*   **Role-Based Access Control (RBAC)**: Segregation of duties (DEO vs Validator vs Admin).

---

## 4. Operational & Business Guide

### **A. Agency Development Costing (Estimate)**
*   **Total Estimated Effort**: ~600 Hours.
*   **Estimated Cost**: ~$34,400 (USD) / ~₹27,30,000 (INR).

### **B. Operational Staffing Requirements**
*   **Data Entry Operator (DEO)**: 4-6 staff (Target: 40 apps/day/person).
*   **Validation Officer**: 2 staff (Govt Official/Senior).
*   **System Admin**: 1 staff.

### **C. Infrastructure Costs (Monthly)**
*   **Cloud Server**: $100 - $200 (AWS/Azure).
*   **Storage**: Variable (~₹1 per GB).

---

## 5. Granular Feature Details

### **1. Data Lifecycle**
*   **Staging**: Raw data entry (Mutable).
*   **Production**: Validated data (Immutable).
*   **Audit Logging**: Centralized, append-only logs for all actions.

### **2. Hardware Integration Strategy**
*   **Current (Simulation)**: `setTimeout` mimics scanner delay.
*   **Production Goal**: TWAIN Bridge (Electron App) running on local port 8888.

---

## 6. CRITICAL: Production Readiness Checklist

To transition from **Simulation** to **Live Production**:

1.  **Activate Backend Connection**:
    *   File: `services/dataService.ts`
    *   Action: Set `const USE_PRODUCTION_API = true;`

2.  **Database Migration**:
    *   The backend currently uses `sqlite3` (file-based).
    *   Action: Switch `backend/server.js` to use `pg` (PostgreSQL) for concurrent user support.

3.  **Secrets Configuration**:
    *   Action: Replace default `JWT_SECRET` in `backend/server.js` or `.env` with a secure key.

4.  **Scanner Bridge Installation**:
    *   Action: Install the local TWAIN-to-HTTP bridge service on DEO machines.
    *   File: `components/DataEntryForm.tsx` (Update `triggerScan` to call `localhost:8888`).

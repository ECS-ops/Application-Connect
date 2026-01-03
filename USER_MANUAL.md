
# Application-Connect 2.0 - User Operations Manual

**Version:** 2.0  
**Date:** October 2023  
**Audience:** Admin, Data Entry Operators, Validation Officers

---

## Table of Contents
1.  [Getting Started](#1-getting-started)
2.  [System Roles](#2-system-roles)
3.  [Admin Operations (Setup)](#3-admin-operations)
4.  [Data Entry Operator (DEO) Workflow](#4-data-entry-operator-workflow)
5.  [Validation Officer Workflow](#5-validation-officer-workflow)
6.  [Dashboard & Reporting](#6-dashboard--reporting)

---

## 1. Getting Started

### Accessing the Portal
1.  Open Google Chrome or Microsoft Edge.
2.  Navigate to the URL provided by your System Administrator (e.g., `http://192.168.x.x` or `https://portal.yourcity.gov.in`).

### Logging In
1.  Enter your **Username** and **Password**.
2.  Click **Sign In**.
3.  If this is your first time, please contact the Admin to reset your default password.

**Safety Feature:** After 5 incorrect password attempts, your IP address will be locked out for 24 hours. Contact IT Support to unlock it.

---

## 2. System Roles

*   **Admin**: Full control. Creates projects, users, and modifies system settings.
*   **Data Entry Operator (DEO)**: Can only access the "Data Capture" form. Cannot delete validated records.
*   **Validation Officer**: Can only access the "Validation Queue". Approves or Rejects applications.
*   **Viewer**: Read-only access to the Dashboard statistics.

---

## 3. Admin Operations

The Admin Panel is the control center. Only users with the `ADMIN` role can see this.

### A. Creating a Project
Before anyone can enter data, a "Project" must exist.
1.  Go to **Admin Panel** -> **Projects**.
2.  Click **+ Create New Project**.
3.  Enter Name (e.g., "City Housing Phase 1") and Description.
4.  Click **Add Project**.

### B. Creating Users
1.  Go to **Admin Panel** -> **Users**.
2.  Click **Create New User**.
3.  Enter Full Name, Username, and Password.
4.  **Important**: Select the correct Role (DEO, Validator, etc.).
5.  Click **Create**.

### C. System Configuration
Go to **Admin Panel** -> **Config**. Here you can:
*   Edit the **Document Checklist** (e.g., add "Electricity Bill").
*   Edit **Rejection Reasons** (e.g., add "Out of Jurisdiction").
*   Change **Data Retention** policies.

---

## 4. Data Entry Operator (DEO) Workflow

Your goal is to digitize physical forms quickly and accurately.

### Step 1: Select Project
Upon login, select the active project you are working on.

### Step 2: Enter Application Data
1.  Navigate to **Data Entry** tab.
2.  **Application ID**: Enter the ID printed on the physical form.
    *   *Tip:* Use the Search bar to load an existing ID if you need to edit it before submission.
3.  **Fill Details**: Name, Aadhaar, Mobile, Address, etc.
    *   *Mandatory fields* are marked with a red asterisk (*).

### Step 3: Scanning Documents
1.  **Method A (Direct Scan)**: If a scanner is connected via the Bridge, click **Scan Now**.
2.  **Method B (File Upload)**: Click **Upload File** to select a PDF or Image from your computer.
3.  Ensure the preview appears on the right side of the screen.

### Step 4: Family Members
1.  Scroll to "Family Composition".
2.  Click **+ Add Family Member**.
3.  Enter Name, Relation, and Aadhaar for each member.

### Step 5: Save & Print
1.  Review the Document Checklist checkboxes.
2.  Click **Save Application** (or press `Ctrl+S`).
3.  If successful, click **Print Consent Form** (or `Ctrl+P`) to generate the receipt for the applicant.

---

## 5. Validation Officer Workflow

Your goal is to verify the digital entry against the scanned documents.

### Step 1: Access the Queue
1.  Navigate to **Validation** tab.
2.  The left sidebar shows the **Validation Queue** (Pending applications).
3.  Click on an application to open it.

### Step 2: Verification Process
The screen is split into two halves:
*   **Left Side**: The Scanned Document (PDF/Image).
*   **Right Side**: The Data entered by the operator.

**Action:** Read the document on the left and compare it with the text on the right.

### Step 3: Duplicate Check
*   Look at the "Duplicate Check" status box.
*   If it says **"Found Matches"** (Red), click the Eye icon to compare the duplicate records. You must decide if it is a genuine duplicate (Reject) or a false alarm (Approve).

### Step 4: Decision
1.  **Approve**: Click **Approve & Mark Eligible**.
2.  **Reject**:
    *   Select a **Reason** from the dropdown (e.g., "Incomplete Documents").
    *   Add **Remarks**.
    *   Click the **Red Reject Button**.

---

## 6. Dashboard & Reporting

The Dashboard provides real-time insights.

*   **Filters**: Use the top bar to filter by Date Range, Caste Category, or Status.
*   **Export**:
    1.  Go to **Admin Panel** -> **Reports**.
    2.  Click **Export Validated Data** to download a CSV (Excel) file of all approved beneficiaries.
    3.  Click **System PDF Report** for a printable summary.

---

**Support:**
For technical issues, contact the System Administrator at `admin@example.com`.

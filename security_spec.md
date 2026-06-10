# Security Specification: SDN Cibojong 1 SPMB Portal

This database uses a **Zero-Trust Backend-Proxy Architecture**.

## Data Invariants
1. Database access is restricted to the Node.js Server (`server.ts`) using the `firebase-admin` SDK.
2. Direct client-side SDK access is entirely disabled via Firestore rules to prevent unauthorized reads/writes.
3. All sensitive updates are mediated by JWT Session Tokens and verified locally on the backend.

## The Eight Pillars Evaluation
* **Master Gate**: Evaluated dynamically during JWT verification in the backend before allowing writes.
* **Relational Integrity**: Enforced via Express validation gates.
* **Path / Value Poisoning Guard**: Handled at server level using schema validators.
* **PII Isolation**: Complete physical and route isolation is enforced through server-to-server TLS connections, and direct client access is blocked.
* **Default Deny**: Standard default catch-all rule `allow read, write: if false;` deployed.

## The Test Matrix
All simulated direct connections return `PERMISSION_DENIED`.

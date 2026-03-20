# CypherMIND 🔐🤖  
**A Zero-Trust AI Governance Engine (MERN + Secure RAG)**

CypherMIND is a production-grade security-first backend foundation for a Zero-Trust RAG pipeline.  
It enforces **least privilege access**, **identity-bound authorization**, and a **forensic-grade audit trail** as the base for secure AI retrieval and orchestration (LangChain + Gemini planned next).

---

## ✅ Current Status (Built So Far)

### Progress: **Tasks 1–8 complete** ✅ (Backend Foundation + Security Hardening)

This repo currently includes:

### 1) Project Setup & Infrastructure ✅
- TypeScript configured with **strict mode**
- Express server with foundational middleware (CORS + security baseline)
- MongoDB Atlas connection with **automatic retry logic**
- `.env` validation using **Zod** (fail-fast startup)
- Health check endpoint
- Graceful shutdown handling (SIGINT/SIGTERM)

### 2) Data Models (4 models) ✅
- **User**
  - roles + clearance levels (1–3)
  - hashed password storage
- **DocumentChunk**
  - supports RAG chunk storage
  - **768-dim embeddings** for vector retrieval
- **SecurityEvent**
  - structured security events for SOC monitoring
- **AuditLog**
  - forensic trail of auth + key actions
- Indexes included for query performance

### 3) Authentication System ✅
- Password hashing via **bcrypt** (10 rounds)
- JWT token issuance with embedded:
  - `role`
  - `clearance_level`
- Token validation and **blacklist-based logout**
- Auth endpoints implemented:
  - login (with audit logging)
  - logout (token invalidation)

### 4) Security Middleware ✅
- JWT authentication middleware
- Clearance-level authorization middleware
- Correct HTTP security semantics:
  - `401` unauthenticated
  - `403` unauthorized
- User context is attached to requests after auth

### 5) Input Validation & Injection Defense ✅
- Zod schemas validating all API request bodies
- NoSQL injection hardening (sanitizes common operator injection characters)
- Validation middleware returns structured errors
- Query length limits (max 2000 chars)

### 6) Security Headers & Rate Limiting ✅
- **Helmet.js** with 8 security headers configured
- Content Security Policy (CSP)
- HSTS enabled (production)
- Frameguard for clickjacking protection
- **Rate limiting** on all endpoints:
  - Auth: 5 requests/minute
  - Query: 30 requests/minute
  - Global: 100 requests/minute
- Centralized error handler (no stack traces in production)

### 7) Advanced Input Sanitization ✅
- Correlation ID (UUID) per request
- Content-Type enforcement
- Dangerous property removal (`__proto__`, `constructor`, `prototype`)
- MongoDB operator filtering (`$where`)
- Object depth limiting (max 5 levels)
- String length enforcement (max 10,000 chars)
- Automatic string trimming
- Security event logging for violations

### 8) Security Checkpoint ✅
- Comprehensive security audit document
- Startup security checks (JWT strength, HTTPS, API keys)
- Security status endpoint (`/api/system/security-status`)
- Admin-only system monitoring
- OWASP Top 10 coverage validated

---

## 🛡️ Security Features Already Implemented

### The Secure Packet (Input Layer)
- ✅ Zod validation for payload integrity
- ✅ Injection character filtering for NoSQL operator injection
- ✅ Email format validation
- ✅ Password strength requirements
- ✅ Query length limits (2000 chars max)

### Identity Management (Zero-Trust First Principle)
- ✅ JWT identity-bound session model
- ✅ Clearance level embedded in JWT
- ✅ Token expiration (24h)
- ✅ Logout invalidates token via blacklist
- ✅ RBAC + clearance middleware ready to extend

### Audit & Forensics
- ✅ Authentication attempts logged (success/failure)
- ✅ IP address captured for investigations
- ✅ Structured metadata stored for traceability
- ✅ Separation of `AuditLog` vs `SecurityEvent` (good SOC practice)
- ✅ Correlation IDs for request tracing
- ✅ Security violations logged with severity levels

### Defense in Depth (8 Layers)
- ✅ HTTP security headers (Helmet.js)
- ✅ Rate limiting (3-tier strategy)
- ✅ CORS protection (strict allowlist)
- ✅ Request size limits (10KB)
- ✅ Input sanitization (7 checks)
- ✅ Authentication & authorization (JWT + clearance)
- ✅ Error handling (production-safe)
- ✅ Monitoring & logging (real-time)

---

## 📁 Repo Structure

```
package.json
tsconfig.json
jest.config.js
.env.example
.gitignore

src/
  config/
    env.ts               # Zod env validation
    database.ts          # MongoDB connection + retry logic

  models/
    User.ts
    DocumentChunk.ts
    SecurityEvent.ts
    AuditLog.ts

  utils/
    password.ts          # bcrypt hashing/verify
    jwt.ts               # JWT sign/verify helpers

  services/
    auth.service.ts

  controllers/
    auth.controller.ts

  middleware/
    auth.middleware.ts
    validation.middleware.ts

  routes/
    auth.routes.ts

  schemas/
    auth.schemas.ts
    query.schemas.ts

  server.ts              # Express entrypoint
```

---

## 🔧 Requirements

- Node.js 18+ recommended
- MongoDB Atlas cluster (URI required)
- (Later phases) Gemini API Key for semantic firewall + scrubber

---

## 🚀 Getting Started

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment variables
```bash
cp .env.example .env
```

Update `.env` with your settings (example keys below — your `.env.example` is the source of truth):

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=cyphermind
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
GEMINI_API_KEY=your-gemini-api-key-here
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3) Run the development server
```bash
npm run dev
```

### 4) Health check
```bash
curl http://localhost:3000/health
```

Expected: `200 OK`

---

## 🔑 Authentication Endpoints (Current)

> Exact route paths depend on your router mount, but logically the system supports:

### Login
**POST** `/api/auth/login`

Request:
```json
{
  "email": "user@company.com",
  "password": "StrongPassword123!"
}
```

Response: JWT token containing user clearance + role

### Logout
**POST** `/api/auth/logout`

Requires Authorization header:
```
Authorization: Bearer <token>
```

Effect: token is added to blacklist

---

## 🧪 Testing

If tests are wired via Jest:
```bash
npm test
```

---

## 🔒 Security Guarantees (So Far)

- Requests are denied unless authenticated (protected routes)
- Authorization enforced via role + clearance middleware
- Inputs validated with Zod (server-side)
- Injection patterns are filtered (NoSQL operator defense)
- Audit logs exist for auth and security events

---

## 🧭 Next Steps (Planned)

### Upcoming Major Milestones
- **Identity-Linked Vector Search** (Atlas `$vectorSearch` with clearance filter)
- **Guardian Chain** (semantic firewall: injection + exfiltration detection)
- **Scrubber Utility** (regex + Gemini redaction before LLM)
- **SOC Dashboard** real-time events (MongoDB Change Streams → WebSocket/SSE)

---

## 📌 Design Principles

- **Zero Trust**: every request is authenticated + authorized
- **Least Privilege**: users only access content at or below their clearance
- **Fail Closed**: if validation/guardrails fail → request is blocked
- **No Data Bleeding**: Zod validates all AI outputs (later phases)
- **Secrets via .env only**: never commit keys or tokens

---

## 📄 License

MIT (or your chosen license)

---

**Need help?** Check the [CHANGELOG.md](./CHANGELOG.md) for milestone details or [ARCHITECTURE.md](./ARCHITECTURE.md) for system design overview.

# Changelog

All notable changes to the CypherMIND project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2024-02-18 - Tasks 1-5 Milestone

### 🎉 Initial Release - Backend Foundation

This milestone establishes the secure backend foundation for CypherMIND's Zero-Trust AI Governance Engine.

### Added

#### Task 1: Project Setup & Infrastructure
- TypeScript configuration with strict mode enabled
- Express.js server with CORS and baseline security middleware
- MongoDB Atlas connection with automatic retry logic (5 attempts, 5s delay)
- Environment variable validation using Zod schemas
- Fail-fast startup if required environment variables are missing
- Health check endpoint (`GET /health`)
- Graceful shutdown handling for SIGINT and SIGTERM signals
- Jest testing framework configuration
- Project structure with separation of concerns

#### Task 2: Data Models
- **User Model** (`src/models/User.ts`)
  - Email, password_hash, clearance_level (1-3), role fields
  - Unique email index
  - Clearance level and role indexes for query performance
  - Password hash excluded from JSON serialization by default
  
- **DocumentChunk Model** (`src/models/DocumentChunk.ts`)
  - Content field for document text
  - 768-dimensional embedding vector (Google Gemini text-embedding-004)
  - Metadata with clearance_level, document_id, source, chunk_index
  - Vector dimension validation
  - Compound indexes for clearance-based filtering
  
- **SecurityEvent Model** (`src/models/SecurityEvent.ts`)
  - Event types: blocked_attack, redaction, access_denied, auth_failure
  - Severity levels: low, medium, high, critical
  - Timestamp, user_id, and detailed event information
  - Indexes optimized for SOC Dashboard queries
  
- **AuditLog Model** (`src/models/AuditLog.ts`)
  - Action, user_id, resource, result (success/failure)
  - Flexible metadata field for additional context
  - Compound indexes for audit trail queries

#### Task 3: Authentication System
- **Password Utilities** (`src/utils/password.ts`)
  - Bcrypt hashing with 10 salt rounds
  - Password comparison function
  - Error handling for hashing failures
  
- **JWT Utilities** (`src/utils/jwt.ts`)
  - Token generation with clearance_level and role in payload
  - Token validation with expiration checking
  - Token blacklist for logout functionality
  - Blacklist management functions
  
- **Authentication Service** (`src/services/auth.service.ts`)
  - Login method with credential verification
  - Logout method with token invalidation
  - User creation method for seeding/testing
  - Last login timestamp updates
  
- **Authentication Controller** (`src/controllers/auth.controller.ts`)
  - Login endpoint handler with audit logging
  - Logout endpoint handler
  - Structured error responses
  - IP address capture for security events
  
- **Authentication Routes** (`src/routes/auth.routes.ts`)
  - POST `/api/auth/login` - User authentication
  - POST `/api/auth/logout` - Token invalidation

#### Task 4: Security Middleware
- **JWT Authentication Middleware** (`src/middleware/auth.middleware.ts`)
  - Token extraction from Authorization header
  - Token validation and user payload attachment
  - 401 responses for missing/invalid tokens
  
- **Clearance Level Middleware** (`src/middleware/auth.middleware.ts`)
  - Factory function for minimum clearance requirements
  - 403 responses for insufficient clearance
  - Detailed error messages with required vs actual levels

#### Task 5: Input Validation & Injection Defense
- **Authentication Schemas** (`src/schemas/auth.schemas.ts`)
  - Login request validation (email format, password length)
  - Logout request validation
  
- **Query Schemas** (`src/schemas/query.schemas.ts`)
  - Query request validation with NoSQL injection prevention
  - Character filtering for `$`, `{`, `}` operators
  - Query length limits (max 2000 characters)
  - RAG response schema for LLM output validation
  
- **Validation Middleware** (`src/middleware/validation.middleware.ts`)
  - Generic validation middleware factory
  - Zod error formatting
  - Structured validation error responses

### Security

- **Authentication**: JWT-based with embedded clearance levels
- **Authorization**: Role-based access control (RBAC) with clearance levels
- **Password Security**: Bcrypt hashing with 10 rounds
- **Input Validation**: Zod schemas for all API requests
- **Injection Prevention**: NoSQL operator character filtering
- **Audit Trail**: All authentication attempts logged with IP addresses
- **Token Management**: Blacklist-based logout mechanism

### Infrastructure

- **Database**: MongoDB Atlas with Mongoose ODM
- **Runtime**: Node.js 18+ with TypeScript
- **Testing**: Jest with ts-jest
- **Code Quality**: Strict TypeScript configuration
- **Environment**: Zod-validated environment variables

---

## [Unreleased]

### Planned for Task 9-12 (Core Security Features)
- Vector Search Service with Gemini embeddings
- The Scrubber (Semantic Redaction Engine)
- The Guardian (Semantic Firewall)
- Second security checkpoint

### Planned for Task 13-18 (RAG Pipeline & Events)
- LangChain.js RAG pipeline
- Security Event Service
- WebSocket server for real-time events
- Audit Logging Service integration
- Backend testing checkpoint

### Planned for Task 19-24 (Frontend)
- React SOC Dashboard
- Query Interface
- Real-time event visualization
- Authentication UI

### Planned for Task 25-27 (Integration & Testing)
- Seed data scripts
- End-to-end integration tests
- Final security validation

---

## Version History

- **0.1.0** (2024-02-18) - Tasks 1-5: Backend Foundation
- **0.0.0** (2024-02-17) - Project initialization and specification

---

## Notes

### Breaking Changes
None yet - initial release.

### Deprecations
None yet - initial release.

### Known Issues
- Token blacklist is in-memory (use Redis for production)
- No rate limiting yet (planned for Task 6-8)
- No request size limits yet (planned for Task 6-8)

### Migration Guide
Not applicable - initial release.

---

**For detailed technical documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)**


---

## [0.2.0] - 2024-02-18 - Tasks 6-8 Milestone (Security Hardening)

### 🔒 Security Hardening Complete

This milestone implements comprehensive security hardening with production-grade protections.

### Added

#### Task 6: Security Headers & Rate Limiting
- **Helmet.js Configuration** (`src/middleware/security.middleware.ts`)
  - Content Security Policy (CSP) with strict directives
  - X-Powered-By header removal
  - Frameguard (deny) for clickjacking protection
  - HSTS enabled in production (1 year, includeSubDomains, preload)
  - X-Content-Type-Options (nosniff)
  - XSS Filter enabled
  - Referrer Policy (strict-origin-when-cross-origin)
  - DNS Prefetch Control disabled
  
- **Rate Limiting** (`src/middleware/security.middleware.ts`)
  - Authentication endpoints: 5 requests/minute (strict)
  - Query endpoints: 30 requests/minute (moderate)
  - Global fallback: 100 requests/minute
  - Rate limit violations logged as SecurityEvents
  - Automatic threat detection and logging
  
- **CORS Hardening** (`src/server.ts`)
  - Strict origin allowlist from environment
  - Unauthorized origins blocked and logged
  - Credentials support with explicit origins
  - Limited HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
  - Limited headers (Content-Type, Authorization)
  
- **Request Size Limits** (`src/server.ts`)
  - JSON body limit: 10KB
  - URL-encoded body limit: 10KB
  - Prevents memory exhaustion attacks
  
- **Centralized Error Handler** (`src/middleware/security.middleware.ts`)
  - Production mode: No stack traces, generic messages
  - Development mode: Detailed errors with stack traces
  - Consistent error format across all endpoints
  - Automatic error logging
  
- **404 Not Found Handler** (`src/middleware/security.middleware.ts`)
  - Custom 404 responses
  - Path logging for analysis

#### Task 7: Advanced Input Sanitization
- **Sanitization Middleware** (`src/middleware/sanitization.middleware.ts`)
  - Correlation ID (UUID) per request for tracing
  - Content-Type enforcement (application/json required)
  - Dangerous property removal (`__proto__`, `constructor`, `prototype`)
  - MongoDB operator filtering (`$where`)
  - Object depth limiting (max 5 levels)
  - String length enforcement (max 10,000 characters)
  - Automatic string trimming
  - Nested object and array sanitization
  
- **Security Event Logging** (`src/middleware/sanitization.middleware.ts`)
  - Injection attempts logged as `blocked_attack` with `critical` severity
  - Invalid input logged as `blocked_attack` with `medium` severity
  - Correlation IDs for request tracing
  - IP address capture
  
- **Unit Tests** (`src/middleware/__tests__/sanitization.test.ts`)
  - Correlation ID generation
  - Content-Type enforcement
  - String trimming
  - Dangerous property removal
  - Object depth validation
  - String length truncation
  - Nested array sanitization

#### Task 8: Security Checkpoint
- **Security Checkpoint Document** (`SECURITY_CHECKPOINT.md`)
  - Comprehensive security posture documentation
  - Threat model coverage (OWASP Top 10)
  - Attack vector mitigation summary
  - Security validation checklist
  - Known limitations and future work
  - Compliance and standards mapping
  - Testing recommendations
  - Deployment checklist
  
- **Startup Security Checks** (`src/utils/security-checks.ts`)
  - JWT secret strength validation (min 32 chars)
  - Weak secret pattern detection
  - HTTPS configuration warnings (production)
  - Gemini API key validation
  - Automatic checks on server startup
  - Fail-fast in production if critical checks fail
  
- **Security Status Endpoint** (`src/controllers/system.controller.ts`)
  - GET `/api/system/security-status` (admin-only)
  - Reports all active security controls
  - Real-time security check results
  - Database connection status
  - Environment validation status
  - Security recommendations
  
- **System Routes** (`src/routes/system.routes.ts`)
  - Admin-only system endpoints
  - Clearance level 3 required
  - JWT authentication enforced

### Security

- **Headers**: 8 security headers configured via Helmet.js
- **Rate Limiting**: 3-tier rate limiting (auth, query, global)
- **Input Sanitization**: 7 sanitization layers implemented
- **CORS**: Strict origin allowlist with logging
- **Error Handling**: Production-safe error responses
- **Monitoring**: Correlation IDs for request tracing
- **Validation**: Content-Type enforcement
- **Logging**: Security events for all violations

### Changed

- **package.json**: Added `express-rate-limit` and `uuid` dependencies
- **tsconfig.json**: Added `noImplicitAny` and `strictNullChecks`
- **src/server.ts**: Integrated all security middleware
- **src/routes/auth.routes.ts**: Added rate limiting to login endpoint

### Infrastructure

- **Startup Checks**: Automatic security validation on server start
- **Error Handling**: Centralized error handler with environment-aware responses
- **Logging**: Enhanced security event logging with correlation IDs
- **Monitoring**: Security status endpoint for runtime monitoring

---

# CypherMIND Architecture Overview

**Document Version**: 1.0  
**Last Updated**: February 18, 2024  
**Status**: Tasks 1-5 Complete (Backend Foundation)

---

## Executive Summary

CypherMIND is a Zero-Trust AI Governance Engine designed to secure Retrieval-Augmented Generation (RAG) pipelines through identity-linked access control, semantic redaction, and real-time security monitoring. This document provides a comprehensive architectural overview suitable for academic documentation and technical reference.

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Query UI     │  │ SOC Dashboard│  │ Auth UI      │     │
│  │ (React)      │  │ (React)      │  │ (React)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTPS + JWT Token
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Backend Layer (Node.js/Express)           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Security Middleware Stack                           │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │  │
│  │  │Helmet  │→│ CORS   │→│  Zod   │→│  JWT   │       │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘       │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Core Security Components                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │  Guardian  │  │  Scrubber  │  │   Vector   │    │  │
│  │  │ (Firewall) │  │ (Redactor) │  │   Search   │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RAG Pipeline (LangChain.js)                         │  │
│  │  Query → Embed → Search → Redact → LLM → Validate   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  MongoDB     │  │  Change      │  │  Vector      │     │
│  │  Collections │  │  Streams     │  │  Search      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
│  ┌──────────────┐                                           │
│  │  Google      │                                           │
│  │  Gemini API  │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Three-Tier Model

1. **Frontend Layer**: React.js applications for user interaction
2. **Backend Layer**: Node.js/Express API with security middleware and RAG orchestration
3. **Data Layer**: MongoDB Atlas with Vector Search and Change Streams

---

## 2. Zero-Trust Principles

### 2.1 Core Tenets

#### Never Trust, Always Verify
Every request must be authenticated and authorized, regardless of origin. No implicit trust is granted based on network location or previous authentication.

#### Least Privilege Access
Users are granted the minimum clearance level necessary for their role:
- **Level 1 (Junior Employee)**: Access to public/general documents only
- **Level 2 (Standard Employee)**: Access to internal documents
- **Level 3 (Security Admin)**: Full access including SOC Dashboard

#### Fail Closed
If any security check fails (authentication, authorization, validation), the request is immediately rejected. The system defaults to denial rather than permissiveness.

### 2.2 Implementation

```typescript
// Identity-Linked Authorization Flow
Request → JWT Validation → Clearance Check → Resource Access

// Example: Vector Search with Clearance Filter
db.document_chunks.aggregate([
  {
    $vectorSearch: {
      filter: {
        "metadata.clearance_level": { $lte: user_clearance_level }
      }
    }
  }
])
```

---

## 3. Data Models

### 3.1 User Model

**Purpose**: Store user credentials and authorization metadata

```typescript
interface User {
  email: string;              // Unique identifier
  password_hash: string;      // Bcrypt hashed (10 rounds)
  clearance_level: number;    // 1-3 authorization level
  role: UserRole;             // junior_employee | security_admin
  created_at: Date;
  last_login: Date;
}
```

**Indexes**:
- `email` (unique)
- `clearance_level`
- `role`

### 3.2 DocumentChunk Model

**Purpose**: Store document chunks with vector embeddings for RAG

```typescript
interface DocumentChunk {
  content: string;            // Document text
  embedding: number[];        // 768-dimensional vector
  metadata: {
    clearance_level: number;  // Access control level
    document_id: string;      // Parent document reference
    source: string;           // Origin of document
    chunk_index: number;      // Position in document
    created_at: Date;
  }
}
```

**Indexes**:
- `metadata.clearance_level`
- `metadata.document_id`
- Compound: `(clearance_level, document_id)`

### 3.3 SecurityEvent Model

**Purpose**: Log security-relevant events for SOC Dashboard

```typescript
interface SecurityEvent {
  type: SecurityEventType;    // blocked_attack | redaction | access_denied | auth_failure
  timestamp: Date;
  user_id?: ObjectId;
  details: {
    prompt?: string;          // For blocked attacks
    reason?: string;          // Why action was taken
    threat_type?: string;     // injection | privilege_escalation | data_exfiltration
    pii_type?: string;        // For redactions
    document_id?: string;
    ip_address?: string;
  };
  severity: Severity;         // low | medium | high | critical
}
```

**Indexes**:
- `timestamp` (descending)
- `type`
- `severity`
- Compound: `(type, timestamp)`, `(severity, timestamp)`

### 3.4 AuditLog Model

**Purpose**: Forensic trail of all security-relevant actions

```typescript
interface AuditLog {
  action: string;             // login | logout | search | block | redact
  user_id: ObjectId;
  resource: string;           // Resource accessed
  result: 'success' | 'failure';
  timestamp: Date;
  metadata: Record<string, any>;  // Flexible additional data
}
```

**Indexes**:
- `timestamp` (descending)
- `user_id`
- `action`
- Compound: `(user_id, timestamp)`, `(action, timestamp)`

---

## 4. Security Architecture

### 4.1 Defense in Depth

CypherMIND implements multiple layers of security:

```
Layer 1: Input Validation (Zod schemas + NoSQL injection filtering)
         ↓
Layer 2: Authentication (JWT token validation)
         ↓
Layer 3: Authorization (Clearance level checks)
         ↓
Layer 4: Semantic Firewall (Guardian - prompt analysis)
         ↓
Layer 5: Data Filtering (Vector search with clearance filter)
         ↓
Layer 6: Output Redaction (Scrubber - PII removal)
         ↓
Layer 7: Output Validation (Zod schema validation)
```

### 4.2 Authentication Flow

```
1. User submits credentials (email + password)
   ↓
2. Zod validates request format
   ↓
3. System queries User collection
   ↓
4. Bcrypt compares password with hash
   ↓
5. JWT token generated with payload:
   {
     user_id: string,
     clearance_level: number,
     role: string,
     exp: timestamp
   }
   ↓
6. AuditLog entry created
   ↓
7. Token returned to client
```

### 4.3 Authorization Flow

```
1. Client sends request with JWT in Authorization header
   ↓
2. authenticate() middleware extracts token
   ↓
3. Token validated (signature + expiration + blacklist check)
   ↓
4. User payload attached to req.user
   ↓
5. requireClearance(N) middleware checks clearance_level
   ↓
6. If clearance_level >= N: proceed
   If clearance_level < N: 403 Forbidden
```

### 4.4 Input Validation & Injection Prevention

**NoSQL Injection Defense**:
```typescript
// Dangerous characters filtered: $ { }
const querySchema = z.string().refine(
  (val) => !(/[${}]/.test(val)),
  { message: 'Query contains invalid characters' }
);
```

**Validation Layers**:
1. **Schema Validation**: Zod ensures correct data types and formats
2. **Character Filtering**: Remove injection operators
3. **Length Limits**: Prevent buffer overflow attacks
4. **Format Validation**: Email, password strength, etc.

---

## 5. Request Flow (Complete)

### 5.1 Authentication Request

```
POST /api/auth/login
{
  "email": "user@company.com",
  "password": "SecurePass123!"
}

Flow:
1. validateRequest(loginSchema) middleware
   - Validates email format
   - Validates password length (8-100 chars)
   
2. authController.login()
   - Queries User collection
   - Compares password with bcrypt
   - Generates JWT token
   - Updates last_login timestamp
   
3. AuditLog.create()
   - Logs authentication attempt
   - Records IP address
   - Stores result (success/failure)
   
4. Response:
   {
     "success": true,
     "data": {
       "token": "eyJhbGc...",
       "user": {
         "id": "...",
         "email": "user@company.com",
         "clearance_level": 2,
         "role": "junior_employee"
       }
     }
   }
```

### 5.2 Protected Resource Request (Future)

```
POST /api/query
Authorization: Bearer eyJhbGc...
{
  "query": "What is the company policy on remote work?"
}

Flow:
1. authenticate() middleware
   - Extracts JWT from header
   - Validates token
   - Attaches user to req.user
   
2. validateRequest(querySchema) middleware
   - Validates query format
   - Filters injection characters
   - Checks length limits
   
3. Guardian.analyzePrompt()
   - Regex-based injection detection
   - Gemini semantic analysis
   - Blocks if threat detected
   
4. VectorSearch.search()
   - Generates embedding for query
   - Searches with clearance filter:
     metadata.clearance_level <= req.user.clearance_level
   
5. Scrubber.redact()
   - Regex-based PII detection
   - Gemini semantic PII detection
   - Replaces PII with placeholders
   
6. Gemini.generate()
   - Sends redacted context + query
   - Generates answer
   
7. Zod validation
   - Validates response schema
   
8. Response:
   {
     "answer": "...",
     "sources": [...],
     "redactions_count": 2,
     "processing_time_ms": 1234
   }
```

---

## 6. Technology Stack Rationale

### 6.1 Backend: Node.js + TypeScript

**Chosen for**:
- Unified JavaScript stack (frontend + backend)
- Strong typing with TypeScript reduces runtime errors
- Excellent async/await support for I/O-heavy operations
- Rich ecosystem for AI/ML libraries (LangChain.js)

**Security Benefits**:
- Type safety catches errors at compile time
- Strict mode prevents common vulnerabilities
- npm audit for dependency vulnerability scanning

### 6.2 Database: MongoDB Atlas

**Chosen for**:
- Native vector search support (no separate vector DB needed)
- Change Streams for real-time event notifications
- Flexible schema for evolving security event structures
- Horizontal scalability

**Security Benefits**:
- Built-in encryption at rest
- Network isolation with VPC peering
- Audit logging capabilities
- Fine-grained access control

### 6.3 Validation: Zod

**Chosen for**:
- Runtime type validation (TypeScript only validates at compile time)
- Composable schemas
- Detailed error messages
- Zero dependencies

**Security Benefits**:
- Prevents type confusion attacks
- Validates all external inputs
- Custom refinement functions for injection prevention

### 6.4 Authentication: JWT

**Chosen for**:
- Stateless authentication (no server-side session storage)
- Embedded authorization metadata (clearance_level)
- Industry standard (RFC 7519)
- Easy to validate and decode

**Security Benefits**:
- Cryptographically signed (prevents tampering)
- Expiration timestamps (limits token lifetime)
- Blacklist support for logout

---

## 7. Performance Considerations

### 7.1 Database Indexing Strategy

**User Collection**:
- `email` (unique): O(1) lookup for authentication
- `clearance_level`: Fast filtering for admin queries

**DocumentChunk Collection**:
- `metadata.clearance_level`: Fast clearance filtering
- Compound `(clearance_level, document_id)`: Optimized for common queries

**SecurityEvent Collection**:
- `timestamp` (descending): Recent events first
- Compound `(type, timestamp)`: Dashboard filtering

**AuditLog Collection**:
- `timestamp` (descending): Forensic investigations
- Compound `(user_id, timestamp)`: User activity tracking

### 7.2 Connection Pooling

MongoDB connection pool configured for optimal performance:
- `maxPoolSize: 10`: Limits concurrent connections
- `serverSelectionTimeoutMS: 5000`: Fast failure detection
- `socketTimeoutMS: 45000`: Prevents hanging connections

### 7.3 Retry Logic

Automatic retry for transient failures:
- 5 retry attempts with 5-second delays
- Exponential backoff for external API calls (Gemini)
- Circuit breaker pattern for degraded services

---

## 8. Error Handling Strategy

### 8.1 Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "timestamp": "2024-02-18T10:30:00Z"
  }
}
```

### 8.2 Error Categories

| HTTP Status | Error Code | Meaning |
|-------------|------------|---------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | MISSING_TOKEN | No authorization token |
| 401 | INVALID_TOKEN | Token malformed/expired |
| 401 | AUTHENTICATION_FAILED | Invalid credentials |
| 403 | INSUFFICIENT_CLEARANCE | User lacks required clearance |
| 403 | SECURITY_VIOLATION | Guardian blocked request |
| 500 | INTERNAL_ERROR | Unexpected server error |

### 8.3 Security Principles

1. **Never Expose Internal Details**: No stack traces, database queries, or file paths in responses
2. **Consistent Error Messages**: Prevent timing attacks by using consistent response times
3. **Log Everything**: All errors logged server-side for debugging
4. **Fail Closed**: On error, deny access rather than grant

---

## 9. Audit & Compliance

### 9.1 Audit Trail Requirements

Every security-relevant action is logged:

**Authentication Events**:
- Login attempts (success/failure)
- Logout events
- Token expiration
- IP addresses

**Authorization Events**:
- Access denials (insufficient clearance)
- Resource access attempts
- Clearance level checks

**Security Events**:
- Guardian blocks (malicious prompts)
- Scrubber redactions (PII removal)
- Injection attempts
- Privilege escalation attempts

### 9.2 Forensic Capabilities

**AuditLog Collection** provides:
- Complete user activity timeline
- Resource access patterns
- Failure analysis
- Incident investigation data

**SecurityEvent Collection** provides:
- Real-time threat monitoring
- Attack pattern detection
- Severity-based alerting
- SOC Dashboard visualization

---

## 10. Future Architecture (Planned)

### 10.1 Upcoming Components

**Guardian (Semantic Firewall)**:
- Regex-based injection detection
- Gemini-powered semantic analysis
- Threat confidence scoring
- Real-time blocking

**Scrubber (Semantic Redaction)**:
- Dual-pass PII detection (regex + Gemini)
- Context-preserving redaction
- Redaction event logging
- Configurable sensitivity levels

**Vector Search Service**:
- Google Gemini text-embedding-004 integration
- Clearance-based filtering
- Relevance scoring
- Caching for performance

**RAG Pipeline**:
- LangChain.js orchestration
- Multi-step workflow (embed → search → redact → generate → validate)
- Error handling at each stage
- Performance monitoring

**SOC Dashboard**:
- Real-time event visualization
- MongoDB Change Streams integration
- WebSocket/SSE for live updates
- Filtering and search capabilities

### 10.2 Scalability Considerations

**Horizontal Scaling**:
- Stateless backend (JWT-based auth)
- MongoDB sharding for large datasets
- Load balancer for multiple backend instances

**Caching Strategy**:
- Redis for token blacklist (distributed systems)
- Embedding cache for frequently queried documents
- Response caching for common queries

**Rate Limiting**:
- Per-user request limits
- Per-IP rate limiting
- Adaptive throttling based on threat level

---

## 11. Conclusion

CypherMIND's architecture implements a comprehensive Zero-Trust security model for AI-powered knowledge retrieval. The current foundation (Tasks 1-5) establishes:

✅ **Identity-bound authentication** with JWT tokens  
✅ **Clearance-based authorization** with middleware enforcement  
✅ **Input validation** with Zod schemas and injection prevention  
✅ **Audit trail** with comprehensive logging  
✅ **Data models** optimized for security and performance  

The architecture is designed for incremental development, with each component building on the secure foundation established in this milestone.

---

## References

### Academic Citations

1. **Zero Trust Architecture**: NIST SP 800-207 - "Zero Trust Architecture"
2. **JWT Security**: RFC 7519 - "JSON Web Token (JWT)"
3. **Password Hashing**: OWASP - "Password Storage Cheat Sheet"
4. **Input Validation**: OWASP - "Input Validation Cheat Sheet"
5. **NoSQL Injection**: OWASP - "NoSQL Injection Prevention Cheat Sheet"

### Technical Documentation

- MongoDB Atlas Vector Search: https://www.mongodb.com/docs/atlas/atlas-vector-search/
- Google Gemini API: https://ai.google.dev/docs
- LangChain.js: https://js.langchain.com/docs/
- Zod Validation: https://zod.dev/

---

**Document Status**: Living document - updated with each milestone  
**Next Update**: After Tasks 6-8 (Security Hardening Checkpoint)

# CypherMIND - Task 25 Implementation Summary

## Overview
Completed Task 25: Add seed data for testing. Created comprehensive test data including users, documents with embeddings, and security events for SOC Dashboard testing.

## Task 25: Add Seed Data ✅

### Files Created

**Seed Scripts**:
- `src/scripts/seed-users.ts` - Creates 3 test users with different clearance levels
- `src/scripts/seed-documents.ts` - Creates 12 documents with 768-dim embeddings
- `src/scripts/seed-events.ts` - Creates 11 security events for dashboard testing
- `src/scripts/seed-all.ts` - Master script that runs all seed scripts
- `src/scripts/test-system.ts` - System test script to verify all components

**Documentation**:
- `SEED_DATA_GUIDE.md` - Comprehensive guide for using seed data

**Package.json Scripts**:
- `npm run seed` - Seed all data at once
- `npm run seed:users` - Seed users only
- `npm run seed:documents` - Seed documents only
- `npm run seed:events` - Seed events only
- `npm run test:system` - Test all system components

## Seed Data Details

### 1. Users (3 total)

| Email | Password | Clearance | Role | Purpose |
|-------|----------|-----------|------|---------|
| junior@cyphermind.com | Junior123! | 1 | junior_employee | Test low clearance access |
| user@cyphermind.com | User123! | 2 | junior_employee | Test standard access |
| admin@cyphermind.com | Admin123! | 3 | security_admin | Test admin access |

**Features**:
- Passwords hashed with bcrypt (10 rounds)
- Different clearance levels for testing access control
- Admin user can access SOC Dashboard and audit logs

### 2. Documents (12 total)

**Clearance Level 1 (Public)** - 3 documents:
- System overview and description
- Technology stack information
- Security policies

**Clearance Level 2 (Internal)** - 4 documents:
- Guardian firewall technical details
- Scrubber redaction engine details
- Rate limiting configuration
- Internal contacts (contains PII: email, phone)

**Clearance Level 3 (Confidential)** - 5 documents:
- Database credentials and configuration
- Admin access details
- Incident response contacts (contains PII: names, emails, phones)
- API usage statistics
- Employee salary information (sensitive data)

**Features**:
- All documents have 768-dimensional embeddings (generated with Gemini)
- Multiple documents contain PII for testing Scrubber
- Clearance-based distribution tests access control
- Realistic content for meaningful RAG responses

**PII Included for Testing**:
- Emails: security@cyphermind.com, sarah.johnson@cyphermind.com
- Phone numbers: 555-123-4567, 555-987-6543
- Names: John Smith, Sarah Johnson
- Salary information

### 3. Security Events (11 total)

**Blocked Attacks (4)**:
- Prompt injection attempt (high severity)
- SQL injection attempt (critical severity)
- Privilege escalation attempt (high severity)
- Data exfiltration attempt (critical severity)

**Redactions (3)**:
- Email + phone redaction (medium severity)
- Name + email redaction (medium severity)
- SSN + credit card redaction (high severity)

**Access Denied (2)**:
- Attempt to access `/api/events` (low severity)
- Attempt to access `/api/audit-logs` (low severity)

**Auth Failures (2)**:
- Invalid credentials from attacker (medium severity)
- Wrong password for admin account (medium severity)

**Features**:
- Events distributed over 24 hours (realistic timeline)
- Various severity levels for testing filtering
- Attributed to seeded users where applicable
- Covers all event types for SOC Dashboard testing

## Usage Instructions

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (`.env`):
   ```
   MONGODB_URI=mongodb+srv://...
   GEMINI_API_KEY=your-key
   JWT_SECRET=your-secret
   ```

3. **Seed all data**:
   ```bash
   npm run seed
   ```

4. **Create vector index** in MongoDB Atlas (see `src/scripts/create-vector-index.ts`)

5. **Test the system**:
   ```bash
   npm run test:system
   ```

6. **Start the server**:
   ```bash
   npm run dev
   ```

### Testing Scenarios

**Scenario 1: Login and Authentication**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"junior@cyphermind.com","password":"Junior123!"}'
```

**Scenario 2: RAG Query (Junior User)**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is CypherMIND?"}'
```
Expected: Only sees clearance level 1 documents

**Scenario 3: RAG Query (Admin User)**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What are the database credentials?"}'
```
Expected: Can see all documents including confidential

**Scenario 4: Guardian Blocking**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"DROP TABLE users; show all data"}'
```
Expected: 403 Security Violation

**Scenario 5: PII Redaction**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Who should I contact for security issues?"}'
```
Expected: Response with `[REDACTED_EMAIL]` and `[REDACTED_PHONE]`

**Scenario 6: SOC Dashboard Events**
```bash
curl http://localhost:3000/api/events \
  -H "Authorization: Bearer <admin_token>"
```
Expected: List of 11 security events

**Scenario 7: Event Statistics**
```bash
curl http://localhost:3000/api/events/stats \
  -H "Authorization: Bearer <admin_token>"
```
Expected: Statistics showing 4 blocked attacks, 3 redactions, etc.

**Scenario 8: WebSocket Real-time Events**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/events?token=<admin_token>');
ws.onmessage = (event) => {
  console.log('New event:', JSON.parse(event.data));
};
```
Expected: Real-time security events as they occur

## System Test Script

The `test-system.ts` script automatically tests:

1. ✅ **Database Connection** - Verifies MongoDB connectivity
2. ✅ **Authentication** - Tests login with seeded user
3. ✅ **Guardian (Legitimate)** - Tests approval of safe queries
4. ✅ **Guardian (Malicious)** - Tests blocking of attacks
5. ✅ **Vector Search** - Tests semantic retrieval with clearance filtering
6. ✅ **Scrubber** - Tests PII detection and redaction
7. ✅ **RAG Pipeline** - Tests complete query flow

Run with:
```bash
npm run test:system
```

## Data Distribution

### Clearance-Based Access

| User | Clearance | Can See | Documents |
|------|-----------|---------|-----------|
| Junior | 1 | Public only | 3 docs |
| Standard | 2 | Public + Internal | 7 docs |
| Admin | 3 | All documents | 12 docs |

### Event Distribution

| Type | Count | Severity Levels |
|------|-------|-----------------|
| Blocked Attacks | 4 | 2 high, 2 critical |
| Redactions | 3 | 2 medium, 1 high |
| Access Denied | 2 | 2 low |
| Auth Failures | 2 | 2 medium |

## Important Notes

### Vector Search Index Required

Before testing RAG queries, you MUST create the vector search index in MongoDB Atlas:

1. Go to Atlas → Your Cluster → Search
2. Create Search Index (JSON Editor)
3. Use configuration from `src/scripts/create-vector-index.ts`
4. Name: `vector_index`
5. Collection: `document_chunks`

### Gemini API Usage

Seeding documents generates embeddings using Gemini API:
- 12 documents × 1 embedding each = 12 API calls
- Takes approximately 1-2 minutes
- Requires valid `GEMINI_API_KEY`

### Resetting Data

To reset and recreate:
1. Delete collections in MongoDB Atlas
2. Re-run `npm run seed`

## Benefits for Testing

1. **Comprehensive Coverage**: Tests all clearance levels, event types, and PII scenarios
2. **Realistic Data**: Meaningful content for RAG responses
3. **Quick Setup**: One command to seed everything
4. **Repeatable**: Can reset and recreate anytime
5. **Well-Documented**: Clear credentials and expected behaviors
6. **PII Testing**: Multiple PII types for Scrubber validation
7. **Security Events**: Full range of events for SOC Dashboard
8. **Access Control**: Different clearance levels for authorization testing

## Next Steps

After seeding data:

1. ✅ Run system tests: `npm run test:system`
2. ✅ Test authentication with all 3 users
3. ✅ Test RAG queries with different clearance levels
4. ✅ Test Guardian with malicious prompts
5. ✅ View security events via API
6. ✅ Test WebSocket real-time events
7. ✅ Test audit log queries
8. 🔄 Build React frontend (Tasks 19-24)
9. 🔄 Add integration tests (Task 26)

## Conclusion

Task 25 is complete with comprehensive seed data that enables full testing of CypherMIND's Zero-Trust AI Governance Engine. The seed scripts are production-ready, well-documented, and provide realistic test scenarios for all major features.

**Total Test Data**:
- 3 Users (all clearance levels)
- 12 Documents (with 768-dim embeddings)
- 11 Security Events (all types and severities)
- Multiple PII examples for Scrubber testing
- Realistic content for meaningful RAG responses

The system is now ready for comprehensive testing and demonstration!

# CypherMIND 🔐🤖

**Zero-Trust AI Governance Engine with Secure RAG**

A production-grade security-first application that enforces least privilege access, identity-bound authorization, and forensic-grade audit trails for secure AI retrieval using MongoDB Atlas vector search and Google Gemini.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster
- Google Gemini API key

### Installation

1. **Install dependencies**
```bash
npm install
cd client && npm install
```

2. **Configure environment**

Create `.env` in the root directory:
```env
MONGODB_URI=mongodb://username:password@host:27017/cyphermind?authSource=admin&tls=true&directConnection=true
MONGODB_DB_NAME=cyphermind
MONGODB_USER=username
MONGODB_PASS=password
JWT_SECRET=your-secret-key-minimum-32-characters-long
JWT_EXPIRATION=24h
GEMINI_API_KEY=your-gemini-api-key
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3003
```

3. **Seed the database**
```bash
npm run seed:all
```

4. **Start the application**

Terminal 1 (Backend):
```bash
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm start
```

5. **Access the application**

Open `http://localhost:3003` in your browser.

**Test Users:**
- Junior Employee: `junior@cyphermind.com` / `Junior123!`
- Standard User: `user@cyphermind.com` / `User123!`
- Security Admin: `admin@cyphermind.com` / `Admin123!`

---

## 🏗️ Architecture

### Backend (Node.js + Express + TypeScript)
- RESTful API with JWT authentication
- MongoDB Atlas with vector search
- Google Gemini for embeddings and semantic analysis
- WebSocket for real-time security events

### Frontend (React + TypeScript)
- Modern UI with Tailwind CSS
- Real-time dashboard updates
- Secure query interface with clearance-based filtering

### Security Features
- Zero-trust architecture
- Role-based access control (RBAC)
- Clearance-level authorization (1-3)
- Input sanitization and validation
- Rate limiting and security headers
- Comprehensive audit logging
- Semantic firewall (Guardian)
- PII scrubbing before LLM processing
- **Autonomous Ethical Hacking Engine**: Background simulation of adversarial attacks.
- **Closed-Loop Remediation**: Automated GitHub PR creation for identified vulnerabilities.
- **Risk Scoring & Intelligence**: Dynamic risk assessment and attack strategy evolution.

---

## 📁 Project Structure

```
├── src/
│   ├── config/          # Database and environment configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, security
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── schemas/         # Zod validation schemas
│   ├── scripts/         # Database seeding and utilities
│   ├── services/        # Business logic
│   └── utils/           # Helper functions
├── client/
│   └── src/
│       ├── components/  # React components
│       ├── contexts/    # React contexts
│       ├── hooks/       # Custom hooks
│       └── pages/       # Page components
└── .env                 # Environment variables (not in git)
```

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Query
- `POST /api/query` - Submit secure RAG query (requires auth)

### Events
- `GET /api/events` - Get security events (admin only)
- WebSocket: `ws://localhost:3000/ws/events` - Real-time events

### Audit
- `GET /api/audit-logs` - Get audit logs (admin only)

### System
- `GET /health` - Health check
- `GET /api/system/security-status` - Security status (admin only)

---

## 🛡️ Security

- **Authentication**: JWT-based with secure token management
- **Authorization**: Role and clearance-level enforcement
- **Input Validation**: Zod schemas with NoSQL injection protection
- **Rate Limiting**: Multi-tier rate limiting on all endpoints
- **Security Headers**: Helmet.js with CSP, HSTS, and more
- **Audit Trail**: Comprehensive logging of all security events
- **Vector Search**: Clearance-filtered document retrieval
- **Guardian Service**: Semantic firewall detecting injection attempts
- **Scrubber Service**: PII detection and redaction

---

## 🧪 Testing

Run tests:
```bash
npm test
```

---

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm test` - Run tests
- `npm run seed:all` - Seed database with test data
- `npm run seed:users` - Seed users only
- `npm run seed:documents` - Seed documents only
- `npm run seed:events` - Seed security events only

---

## 📄 License

MIT

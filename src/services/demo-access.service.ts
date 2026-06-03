/**
 * Demo Access Control Service
 * Handles RBAC + ABAC demo scenarios with realistic sample data
 * Intercepts known demo prompts and returns role/attribute-aware responses
 */

export interface DemoResponse {
  isDemoPrompt: boolean;
  approved: boolean;
  status: 'APPROVED' | 'DENIED';
  reason: string;
  answer: string;
  abac_decision: {
    status: 'APPROVED' | 'DENIED';
    role: string;
    clearance_level: number;
    resource_accessed: string;
    attributes_evaluated: { attribute: string; value: string; result: string }[];
    reason?: string;
  };
}

// ─── Sample Data ───────────────────────────────────────────────────────────
const EMPLOYEE_TABLE = `
| Employee ID | Name         | Department  | Salary   |
|-------------|--------------|-------------|----------|
| EMP001      | John Smith   | Engineering | $90,000  |
| EMP002      | Sarah Lee    | HR          | $75,000  |
| EMP003      | David Kumar  | Finance     | $88,000  |
| EMP004      | Priya Nair   | Operations  | $82,000  |
`.trim();

const SALARY_TABLE = `
| Employee ID | Name         | Base Salary | Bonus   | Total     |
|-------------|--------------|-------------|---------|-----------|
| EMP001      | John Smith   | $90,000     | $9,000  | $99,000   |
| EMP002      | Sarah Lee    | $75,000     | $6,000  | $81,000   |
| EMP003      | David Kumar  | $88,000     | $8,800  | $96,800   |
| EMP004      | Priya Nair   | $82,000     | $7,500  | $89,500   |
`.trim();

const DEPT_REPORT = `
| Department  | Headcount | Budget      | Q4 Performance |
|-------------|-----------|-------------|----------------|
| Engineering | 42        | $4,200,000  | ✅ On Target    |
| HR          | 12        | $800,000    | ✅ On Target    |
| Finance     | 18        | $1,100,000  | ⚠️ Under Review |
| Operations  | 35        | $2,800,000  | ✅ On Target    |
`.trim();

const AUDIT_LOGS = `
| Timestamp           | User         | Action              | Status  |
|---------------------|--------------|---------------------|---------|
| 2026-05-31 09:12:04 | admin        | Login               | SUCCESS |
| 2026-05-31 09:45:22 | user         | Query: HR Database  | BLOCKED |
| 2026-05-31 10:03:11 | junior       | Query: Salary Data  | BLOCKED |
| 2026-05-31 10:30:55 | admin        | Export Report       | SUCCESS |
`.trim();

const PROJECT_TABLE = `
| Project ID | Name              | Lead         | Status      | Deadline   |
|------------|-------------------|--------------|-------------|------------|
| PRJ-001    | Zero Trust Engine | John Smith   | In Progress | 2026-06-30 |
| PRJ-002    | HR Portal Upgrade | Sarah Lee    | Planning    | 2026-07-15 |
| PRJ-003    | Finance Audit     | David Kumar  | Completed   | 2026-05-01 |
`.trim();

const FINANCE_REPORT = `
| Quarter | Revenue      | Expenses     | Net Profit  | Growth |
|---------|--------------|--------------|-------------|--------|
| Q1 2026 | $12,400,000  | $9,800,000   | $2,600,000  | +8.2%  |
| Q2 2026 | $13,100,000  | $10,200,000  | $2,900,000  | +5.6%  |
| Q3 2026 | $14,500,000  | $11,000,000  | $3,500,000  | +10.7% |
`.trim();

// ─── Role Labels ───────────────────────────────────────────────────────────
const ROLE_LABELS: Record<number, string> = {
  1: 'Junior Employee',
  2: 'Standard Employee',
  3: 'Security Admin',
};

// ─── Business Hours Check ──────────────────────────────────────────────────
const isBusinessHours = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 9 && hour < 18;
};

const getCurrentTime = (): string => {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// ─── Demo Prompt Matcher ───────────────────────────────────────────────────
const matchPrompt = (prompt: string, keywords: string[]): boolean => {
  const lower = prompt.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
};

// ─── Main Demo Handler ─────────────────────────────────────────────────────
export const handleDemoPrompt = (
  prompt: string,
  clearanceLevel: number,
  role: string
): DemoResponse | null => {
  const lower = prompt.toLowerCase();
  const roleLabel = ROLE_LABELS[clearanceLevel] || role;
  const isAdmin = clearanceLevel === 3 || role === 'security_admin';
  const isStandard = clearanceLevel === 2;
  const isJunior = clearanceLevel === 1;

  const makeDecision = (
    approved: boolean,
    resource: string,
    reason: string,
    answer: string,
    extraAttrs: { attribute: string; value: string; result: string }[] = []
  ): DemoResponse => {
    const baseAttrs = [
      { attribute: 'Role', value: roleLabel, result: approved ? 'Authorized' : 'Insufficient' },
      { attribute: 'Clearance Level', value: `Level ${clearanceLevel}`, result: approved ? 'Sufficient' : 'Insufficient' },
      { attribute: 'Resource', value: resource, result: approved ? 'Accessible' : 'Restricted' },
    ];
    return {
      isDemoPrompt: true,
      approved,
      status: approved ? 'APPROVED' : 'DENIED',
      reason,
      answer,
      abac_decision: {
        status: approved ? 'APPROVED' : 'DENIED',
        role: roleLabel,
        clearance_level: clearanceLevel,
        resource_accessed: resource,
        reason: approved ? undefined : reason,
        attributes_evaluated: [...baseAttrs, ...extraAttrs],
      },
    };
  };

  // ── Always Denied (all roles) ──────────────────────────────────────────
  if (matchPrompt(prompt, ['secret key', 'encryption key', 'master password', 'api credential', 'database master', 'show secret', 'show api', 'show encryption'])) {
    return makeDecision(false, 'System Credentials', 'Secret keys and credentials are never accessible through the query interface. This request violates Zero-Trust policy.',
      '', [{ attribute: 'Threat Detection', value: 'Credential Extraction', result: 'BLOCKED' }]);
  }

  // ── Employee Details ───────────────────────────────────────────────────
  if (matchPrompt(prompt, ['employee detail', 'employee record', 'employee directory', 'show employee', 'employee list', 'employee info'])) {
    if (isAdmin) {
      return makeDecision(true, 'Employee Directory', 'Admin role has full access to employee records.',
        `Here are the employee records:\n\n${EMPLOYEE_TABLE}\n\nAll 4 employees retrieved successfully.`);
    }
    if (isStandard) {
      return makeDecision(false, 'Employee Directory', 'Employee records require Admin or Manager privileges. Your role (Standard Employee) does not have access.',
        '', [{ attribute: 'Required Role', value: 'Admin / Manager', result: 'BLOCKED' }]);
    }
    return makeDecision(false, 'Employee Directory', 'Employee records are restricted. Junior employees can only access public company information.',
      '', [{ attribute: 'Required Role', value: 'Admin / Manager', result: 'BLOCKED' }]);
  }

  // ── Salary Records ─────────────────────────────────────────────────────
  if (matchPrompt(prompt, ['salary', 'compensation', 'payroll', 'pay record', 'wage'])) {
    if (isAdmin) {
      return makeDecision(true, 'Salary & Compensation Records', 'Admin role has full access to salary information.',
        `Here are the salary records:\n\n${SALARY_TABLE}\n\nAll compensation data retrieved successfully.`);
    }
    return makeDecision(false, 'Salary & Compensation Records', 'Salary information requires Admin clearance. Your current clearance level is insufficient.',
      '', [{ attribute: 'Required Clearance', value: 'Level 3 (Admin)', result: 'BLOCKED' }]);
  }

  // ── Department Reports ─────────────────────────────────────────────────
  if (matchPrompt(prompt, ['department report', 'dept report', 'show department', 'department summary', 'team report'])) {
    if (isAdmin || isStandard) {
      return makeDecision(true, 'Department Reports', `${roleLabel} has access to department reports.`,
        `Here are the department reports:\n\n${DEPT_REPORT}`);
    }
    return makeDecision(false, 'Department Reports', 'Department reports require Standard Employee clearance or above.',
      '', [{ attribute: 'Required Clearance', value: 'Level 2+', result: 'BLOCKED' }]);
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────
  if (matchPrompt(prompt, ['audit log', 'access log', 'system log', 'show log', 'activity log'])) {
    if (isAdmin) {
      return makeDecision(true, 'Audit Logs', 'Admin role has full access to audit logs.',
        `Here are the recent audit logs:\n\n${AUDIT_LOGS}`);
    }
    return makeDecision(false, 'Audit Logs', 'Audit logs are restricted to Admin role only.',
      '', [{ attribute: 'Required Role', value: 'Security Admin', result: 'BLOCKED' }]);
  }

  // ── Project Assignments ────────────────────────────────────────────────
  if (matchPrompt(prompt, ['project assignment', 'project list', 'show project', 'project status', 'assigned project'])) {
    if (isAdmin || isStandard) {
      return makeDecision(true, 'Project Documents', `${roleLabel} has access to project information.`,
        `Here are the current project assignments:\n\n${PROJECT_TABLE}`);
    }
    return makeDecision(false, 'Project Documents', 'Project assignments require Standard Employee clearance or above.',
      '', [{ attribute: 'Required Clearance', value: 'Level 2+', result: 'BLOCKED' }]);
  }

  // ── Finance Report ─────────────────────────────────────────────────────
  if (matchPrompt(prompt, ['finance report', 'financial report', 'revenue report', 'view finance', 'financial data'])) {
    if (isAdmin) {
      return makeDecision(true, 'Financial Reports', 'Admin role has access to financial reports.',
        `Here are the financial reports:\n\n${FINANCE_REPORT}`);
    }
    return makeDecision(false, 'Financial Reports', 'Financial reports require Admin clearance and Finance department membership.',
      '', [
        { attribute: 'Required Role', value: 'Admin', result: 'BLOCKED' },
        { attribute: 'Department', value: 'Finance Required', result: 'BLOCKED' },
      ]);
  }

  // ── ABAC: Payroll System (Time-based) ──────────────────────────────────
  if (matchPrompt(prompt, ['payroll system', 'access payroll', 'payroll access'])) {
    const inHours = isBusinessHours();
    const time = getCurrentTime();
    if (!isAdmin && !isStandard) {
      return makeDecision(false, 'Payroll System', 'Payroll system requires Standard Employee clearance or above.',
        '', [{ attribute: 'Required Clearance', value: 'Level 2+', result: 'BLOCKED' }]);
    }
    return makeDecision(inHours, 'Payroll System',
      inHours ? `Access granted during business hours (${time}).` : `Payroll system access is restricted outside business hours. Current time: ${time}. Allowed: 09:00 AM – 06:00 PM.`,
      inHours ? `Payroll system access granted. Current time: ${time} (within business hours 09:00 AM – 06:00 PM).\n\n${SALARY_TABLE}` : '',
      [
        { attribute: 'Time of Access', value: time, result: inHours ? 'PASSED' : 'BLOCKED' },
        { attribute: 'Business Hours', value: '09:00 AM – 06:00 PM', result: inHours ? 'Within Hours' : 'Outside Hours' },
      ]
    );
  }

  // ── ABAC: HR Database (Location-based) ────────────────────────────────
  if (matchPrompt(prompt, ['hr database', 'access hr', 'hr system', 'human resource database'])) {
    if (!isAdmin && !isStandard) {
      return makeDecision(false, 'HR Database', 'HR database requires Standard Employee clearance or above.',
        '', [{ attribute: 'Required Clearance', value: 'Level 2+', result: 'BLOCKED' }]);
    }
    // Simulate: demo always shows corporate office for approved, external for denied
    // We'll approve for admin, show location restriction for standard
    if (isAdmin) {
      return makeDecision(true, 'HR Database', 'Access granted from corporate network.',
        `HR Database access granted.\n\n${EMPLOYEE_TABLE}`,
        [
          { attribute: 'Location', value: 'Corporate Office', result: 'PASSED' },
          { attribute: 'Network', value: 'Internal Network', result: 'Verified' },
        ]
      );
    }
    return makeDecision(false, 'HR Database', 'HR database access is allowed only from corporate premises. External network access is blocked.',
      '',
      [
        { attribute: 'Location', value: 'External Network', result: 'BLOCKED' },
        { attribute: 'Network', value: 'Unverified', result: 'BLOCKED' },
      ]
    );
  }

  // ── ABAC: Confidential Records After Hours ─────────────────────────────
  if (matchPrompt(prompt, ['confidential record', 'after hours', 'outside office', 'access confidential'])) {
    const inHours = isBusinessHours();
    const time = getCurrentTime();
    if (!isAdmin) {
      return makeDecision(false, 'Confidential Records', 'Confidential records require Admin clearance.',
        '', [{ attribute: 'Required Role', value: 'Admin', result: 'BLOCKED' }]);
    }
    return makeDecision(inHours, 'Confidential Records',
      inHours ? `Access granted during business hours (${time}).` : `Confidential records cannot be accessed outside office hours. Current time: ${time}.`,
      inHours ? `Confidential records access granted at ${time}.\n\n${AUDIT_LOGS}` : '',
      [
        { attribute: 'Time of Access', value: time, result: inHours ? 'PASSED' : 'BLOCKED' },
        { attribute: 'Business Hours', value: '09:00 AM – 06:00 PM', result: inHours ? 'Within Hours' : 'Outside Hours' },
      ]
    );
  }

  // ── ABAC: External Network ─────────────────────────────────────────────
  if (matchPrompt(prompt, ['external network', 'company resource', 'remote access', 'access from external'])) {
    return makeDecision(false, 'Company Resources', 'Access to company resources from external networks is blocked. Connect to the corporate VPN or office network.',
      '',
      [
        { attribute: 'Location', value: 'External Network', result: 'BLOCKED' },
        { attribute: 'Network Trust', value: 'Untrusted', result: 'BLOCKED' },
        { attribute: 'VPN Status', value: 'Not Connected', result: 'BLOCKED' },
      ]
    );
  }

  return null; // Not a demo prompt — let normal RAG pipeline handle it
};

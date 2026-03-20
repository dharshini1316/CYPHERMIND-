import { env } from '../config/env';

/**
 * Security check results interface
 */
export interface SecurityCheckResult {
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Check if JWT secret is strong enough
 */
export const checkJWTSecret = (): SecurityCheckResult => {
  const secret = env.JWT_SECRET;

  if (secret.length < 32) {
    return {
      passed: false,
      message: 'JWT_SECRET is too short. Minimum 32 characters recommended.',
      severity: 'error',
    };
  }

  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', '12345', 'test', 'admin', 'changeme'];
  const lowerSecret = secret.toLowerCase();

  for (const weak of weakSecrets) {
    if (lowerSecret.includes(weak)) {
      return {
        passed: false,
        message: `JWT_SECRET contains weak pattern: "${weak}". Use a strong random string.`,
        severity: 'warning',
      };
    }
  }

  return {
    passed: true,
    message: 'JWT_SECRET is strong',
    severity: 'info',
  };
};

/**
 * Check if running in production without HTTPS
 */
export const checkHTTPS = (): SecurityCheckResult => {
  if (env.NODE_ENV === 'production') {
    // In production, we expect HTTPS to be handled by reverse proxy
    // This is a warning to ensure it's configured
    return {
      passed: true,
      message: 'Ensure HTTPS is configured in your reverse proxy/load balancer',
      severity: 'warning',
    };
  }

  return {
    passed: true,
    message: 'HTTPS check skipped in development',
    severity: 'info',
  };
};

/**
 * Check if Gemini API key is configured
 */
export const checkGeminiKey = (): SecurityCheckResult => {
  const key = env.GEMINI_API_KEY;

  if (!key || key.length === 0) {
    return {
      passed: false,
      message: 'GEMINI_API_KEY is not configured. Guardian and Scrubber will not work.',
      severity: 'warning',
    };
  }

  if (key === 'your-gemini-api-key-here') {
    return {
      passed: false,
      message: 'GEMINI_API_KEY is using placeholder value. Replace with actual API key.',
      severity: 'error',
    };
  }

  return {
    passed: true,
    message: 'GEMINI_API_KEY is configured',
    severity: 'info',
  };
};

/**
 * Run all security checks on startup
 */
export const runStartupSecurityChecks = (): void => {
  console.log('\n🔒 Running security checks...\n');

  const checks = [
    { name: 'JWT Secret Strength', check: checkJWTSecret },
    { name: 'HTTPS Configuration', check: checkHTTPS },
    { name: 'Gemini API Key', check: checkGeminiKey },
  ];

  let hasErrors = false;
  let hasWarnings = false;

  for (const { name, check } of checks) {
    const result = check();

    const icon = result.passed ? '✅' : result.severity === 'error' ? '❌' : '⚠️';
    console.log(`${icon} ${name}: ${result.message}`);

    if (result.severity === 'error') {
      hasErrors = true;
    } else if (result.severity === 'warning') {
      hasWarnings = true;
    }
  }

  console.log('');

  if (hasErrors) {
    console.error('❌ Security checks failed. Please fix errors before proceeding.\n');
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  } else if (hasWarnings) {
    console.warn('⚠️  Security checks passed with warnings. Review warnings before production deployment.\n');
  } else {
    console.log('✅ All security checks passed.\n');
  }
};

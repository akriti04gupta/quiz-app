/**
 * Environment Configuration Module
 * 
 * Manages environment-specific settings and database URLs
 * Loads from .env file based on NODE_ENV
 */

require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

// ============================================================================
// VALIDATE ENVIRONMENT
// ============================================================================

const validEnv = ['development', 'staging', 'production'];
if (!validEnv.includes(nodeEnv)) {
  throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be one of: ${validEnv.join(', ')}`);
}

console.log(`✅ Environment: ${nodeEnv.toUpperCase()}`);

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

const dbConfig = {
  development: {
    name: 'Development Database',
    url: process.env.DEV_DATABASE_URL,
    enforceRules: false, // Less strict rules for development
    enableLogging: true,
    region: 'us-central1'
  },
  staging: {
    name: 'Staging Database',
    url: process.env.STAGING_DATABASE_URL,
    enforceRules: true, // Same rules as production
    enableLogging: true,
    region: 'us-central1'
  },
  production: {
    name: 'Production Database',
    url: process.env.PRODUCTION_DATABASE_URL,
    enforceRules: true, // Strict rules enforcement
    enableLogging: true, // Always log in production
    region: 'us-central1',
    backup: {
      enabled: process.env.ENABLE_BACKUPS === 'true',
      storage: process.env.BACKUP_STORAGE,
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || 30)
    }
  }
};

const selectedConfig = dbConfig[nodeEnv];

if (!selectedConfig.url) {
  throw new Error(`Database URL not configured for ${nodeEnv} environment`);
}

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

const securityConfig = {
  cloudFunctionSecret: process.env.CLOUD_FUNCTION_SECRET,
  appCheckEnabled: process.env.ENABLE_APP_CHECK === 'true',
  recaptchaV3: {
    siteKey: process.env.RECAPTCHA_V3_SITE_KEY,
    secretKey: process.env.RECAPTCHA_V3_SECRET_KEY,
    enabled: process.env.RECAPTCHA_V3_SITE_KEY !== undefined
  },
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(url => url.trim())
};

// Validate production secret
if (nodeEnv === 'production' && !securityConfig.cloudFunctionSecret) {
  console.warn('⚠️  WARNING: CLOUD_FUNCTION_SECRET not set in production');
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

const featureFlags = {
  questionBank: process.env.ENABLE_QUESTION_BANK !== 'false',
  userSubmissions: process.env.ENABLE_USER_SUBMISSIONS !== 'false',
  dashboard: process.env.ENABLE_DASHBOARD !== 'false',
  analytics: process.env.ENABLE_ANALYTICS === 'true',
  auditLogs: process.env.ENABLE_AUDIT_LOGS !== 'false'
};

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

const rateLimitConfig = {
  quizSubmission: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.QUIZ_SUBMISSION_RATE_LIMIT || 10)
  },
  questionCreation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.QUESTION_CREATION_RATE_LIMIT || 50)
  },
  apiGeneral: {
    windowMs: 60 * 1000, // 1 minute
    max: 100
  }
};

// Stricter limits in production
if (nodeEnv === 'production') {
  rateLimitConfig.quizSubmission.max = Math.min(5, rateLimitConfig.quizSubmission.max);
  rateLimitConfig.questionCreation.max = Math.min(20, rateLimitConfig.questionCreation.max);
}

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

const serverConfig = {
  port: parseInt(process.env.PORT || 3000),
  host: process.env.HOST || 'localhost',
  environment: nodeEnv,
  loggingEnabled: selectedConfig.enableLogging,
  logLevel: process.env.LOG_LEVEL || 'info'
};

// ============================================================================
// QUIZ CONFIGURATION
// ============================================================================

const quizConfig = {
  maxQuestionsPerQuiz: parseInt(process.env.MAX_QUESTIONS_PER_QUIZ || 20),
  timeLimit: parseInt(process.env.QUIZ_TIME_LIMIT || 3600),
  pointsPerCorrect: parseInt(process.env.POINTS_PER_QUESTION || 10)
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if running in specific environment
 */
function isEnvironment(env) {
  return nodeEnv === env;
}

/**
 * Get environment-specific setting
 */
function getSetting(key, defaultValue) {
  const envKey = `${nodeEnv.toUpperCase()}_${key}`;
  return process.env[envKey] || process.env[key] || defaultValue;
}

/**
 * Validate all required environment variables
 */
function validateEnvironment() {
  const required = [
    'FIREBASE_SERVICE_ACCOUNT_PATH',
    'CLOUD_FUNCTION_SECRET',
    'ADMIN_EMAIL'
  ];

  if (nodeEnv === 'production') {
    required.push(
      'PRODUCTION_DATABASE_URL',
      'RECAPTCHA_V3_SITE_KEY',
      'RECAPTCHA_V3_SECRET_KEY'
    );
  }

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ All required environment variables configured');
  return true;
}

/**
 * Log environment configuration (non-sensitive values only)
 */
function logConfig() {
  console.log('\n📋 Environment Configuration:');
  console.log(`  Environment: ${nodeEnv.toUpperCase()}`);
  console.log(`  Database: ${selectedConfig.name}`);
  console.log(`  Server Port: ${serverConfig.port}`);
  console.log(`  App Check: ${securityConfig.appCheckEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`  Audit Logs: ${featureFlags.auditLogs ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`  Rate Limiting: ${rateLimitConfig.quizSubmission.max} submissions per 15 min`);
  console.log('');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Environment info
  environment: nodeEnv,
  isProduction: isEnvironment('production'),
  isStaging: isEnvironment('staging'),
  isDevelopment: isEnvironment('development'),

  // Configuration objects
  database: selectedConfig,
  server: serverConfig,
  security: securityConfig,
  features: featureFlags,
  rateLimit: rateLimitConfig,
  quiz: quizConfig,

  // Utility functions
  isEnvironment,
  getSetting,
  validateEnvironment,
  logConfig
};

import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  trustProxy: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production',
  enableScheduler: process.env.ENABLE_SCHEDULER === 'true' || (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SCHEDULER !== 'false'),
  // AWS S3 Storage
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsS3Bucket: process.env.AWS_S3_BUCKET || '',
  awsCloudfrontUrl: process.env.AWS_CLOUDFRONT_URL ? process.env.AWS_CLOUDFRONT_URL.replace(/\/$/, '') : '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  // AWS SES Email
  enableSes: process.env.ENABLE_SES === 'true',
  emailFrom: process.env.EMAIL_FROM || 'noreply@socialcup.com',
  awsSesRegion: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1',
  // Resend transactional email (additive alternative to SES - takes
  // precedence over SES when set, since it needs no AWS account at all).
  resendApiKey: process.env.RESEND_API_KEY || '',
  // Auth Rate Limiting
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
};


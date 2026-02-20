import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
};

// Validate required environment variables
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

if (config.nodeEnv === 'production' && config.jwtSecret === 'your-secret-key') {
  throw new Error('JWT_SECRET must be set in production');
}

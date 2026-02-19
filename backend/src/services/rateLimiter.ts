import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';

// Gemini 1.5 Flash Free Tier Limits
const LIMITS = {
  RPM: 15,    // Requests per minute
  RPD: 1500,  // Requests per day
  TPM: 1000000, // Tokens per minute (not strictly enforced, but tracked)
};

interface UsageStats {
  rpm: { used: number; limit: number; remaining: number };
  rpd: { used: number; limit: number; remaining: number };
  tpm?: { used: number; limit: number; remaining: number };
}

/**
 * Check if request can proceed without hitting Gemini rate limits
 * Throws error if limits would be exceeded
 */
export async function checkGeminiLimits(): Promise<UsageStats> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check requests per minute (RPM)
  const requestsLastMinute = await prisma.geminiUsage.count({
    where: {
      timestamp: { gte: oneMinuteAgo },
      success: true,
    },
  });

  if (requestsLastMinute >= LIMITS.RPM) {
    const secondsUntilReset = 60 - Math.floor((now.getTime() - oneMinuteAgo.getTime()) / 1000);
    throw createError(
      429,
      `Rate limit exceeded: ${LIMITS.RPM} requests per minute. Try again in ${secondsUntilReset} seconds.`
    );
  }

  // Check requests per day (RPD)
  const requestsLastDay = await prisma.geminiUsage.count({
    where: {
      timestamp: { gte: oneDayAgo },
      success: true,
    },
  });

  if (requestsLastDay >= LIMITS.RPD) {
    const resetTime = new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000);
    const hoursUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 60 * 1000));
    throw createError(
      429,
      `Daily AI limit reached (${LIMITS.RPD}/${LIMITS.RPD}). Resets in ${hoursUntilReset} hours at ${resetTime.toLocaleString()}.`
    );
  }

  // Optional: Check tokens per minute (TPM)
  const tokensLastMinute = await prisma.geminiUsage.aggregate({
    where: {
      timestamp: { gte: oneMinuteAgo },
      success: true,
    },
    _sum: {
      tokensUsed: true,
    },
  });

  const tpmUsed = tokensLastMinute._sum.tokensUsed || 0;

  return {
    rpm: {
      used: requestsLastMinute,
      limit: LIMITS.RPM,
      remaining: LIMITS.RPM - requestsLastMinute,
    },
    rpd: {
      used: requestsLastDay,
      limit: LIMITS.RPD,
      remaining: LIMITS.RPD - requestsLastDay,
    },
    tpm: {
      used: tpmUsed,
      limit: LIMITS.TPM,
      remaining: LIMITS.TPM - tpmUsed,
    },
  };
}

/**
 * Record a Gemini API usage event
 */
export async function recordGeminiUsage(
  userId: string,
  requestType: 'url' | 'video' | 'pdf',
  tokensUsed?: number,
  success: boolean = true
): Promise<void> {
  await prisma.geminiUsage.create({
    data: {
      userId,
      requestType,
      tokensUsed,
      success,
      timestamp: new Date(),
    },
  });
}

/**
 * Get current usage statistics for display
 */
export async function getGeminiUsageStats(): Promise<UsageStats> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [requestsLastMinute, requestsLastDay, tokensLastMinute] = await Promise.all([
    prisma.geminiUsage.count({
      where: { timestamp: { gte: oneMinuteAgo }, success: true },
    }),
    prisma.geminiUsage.count({
      where: { timestamp: { gte: oneDayAgo }, success: true },
    }),
    prisma.geminiUsage.aggregate({
      where: { timestamp: { gte: oneMinuteAgo }, success: true },
      _sum: { tokensUsed: true },
    }),
  ]);

  return {
    rpm: {
      used: requestsLastMinute,
      limit: LIMITS.RPM,
      remaining: LIMITS.RPM - requestsLastMinute,
    },
    rpd: {
      used: requestsLastDay,
      limit: LIMITS.RPD,
      remaining: LIMITS.RPD - requestsLastDay,
    },
    tpm: {
      used: tokensLastMinute._sum.tokensUsed || 0,
      limit: LIMITS.TPM,
      remaining: LIMITS.TPM - (tokensLastMinute._sum.tokensUsed || 0),
    },
  };
}

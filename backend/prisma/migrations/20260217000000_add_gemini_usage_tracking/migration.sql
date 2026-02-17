-- Track Gemini API usage for rate limiting
CREATE TABLE "gemini_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL, -- 'url' or 'video'
    "tokens_used" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gemini_usage_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient rate limit queries
CREATE INDEX "gemini_usage_timestamp_idx" ON "gemini_usage"("timestamp");
CREATE INDEX "gemini_usage_user_timestamp_idx" ON "gemini_usage"("user_id", "timestamp");

-- Foreign key to users table
ALTER TABLE "gemini_usage" ADD CONSTRAINT "gemini_usage_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

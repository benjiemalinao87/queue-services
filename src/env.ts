import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Redis
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_USER: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    
    // Bull Board Authentication
    BULL_BOARD_USERNAME: z.string().default("admin"),
    BULL_BOARD_PASSWORD: z.string().default("admin123"),
    
    // SMS API
    SMS_API_URL: z.string().default("https://cc.automate8.com"),
    
    // Email API
    EMAIL_API_URL: z.string().default("https://cc.automate8.com"),
    
    // Queue Service URL
    QUEUE_SERVICE_URL: z.string().default("https://secivres-eueuq.customerconnects.app"),
    
    // Server
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default("0.0.0.0"),
    
    // Metrics
    USE_SAMPLE_METRICS: z.enum(["true", "false"]).default("false"),
    
    // Supabase
    SUPABASE_URL: z.string().default("https://ycwttshvizkotcwwyjpt.supabase.co"),
    SUPABASE_ANON_KEY: z.string().default("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNDQ5NzUsImV4cCI6MjA1MzgyMDk3NX0.7Mn5vXXre0KwW0lKgsPv1lwSXn5CiRjTRMw2RuH_55g"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().default("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODI0NDk3NSwiZXhwIjoyMDUzODIwOTc1fQ.blOq_yJX-J-N7znR-4220THNruoI7j_bLONliOtukmQ"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,

    // Redis
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_USER: process.env.REDIS_USER,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    
    // Bull Board Authentication
    BULL_BOARD_USERNAME: process.env.BULL_BOARD_USERNAME,
    BULL_BOARD_PASSWORD: process.env.BULL_BOARD_PASSWORD,
    
    // SMS API
    SMS_API_URL: process.env.SMS_API_URL || "https://cc.automate8.com",
    
    // Email API
    EMAIL_API_URL: process.env.EMAIL_API_URL || "https://cc.automate8.com",
    
    // Queue Service URL
    QUEUE_SERVICE_URL: process.env.QUEUE_SERVICE_URL || "https://secivres-eueuq.customerconnects.app",
    
    // Server
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    
    // Metrics
    USE_SAMPLE_METRICS: process.env.USE_SAMPLE_METRICS || "false",
    
    // Supabase
    SUPABASE_URL: process.env.SUPABASE_URL || "https://ycwttshvizkotcwwyjpt.supabase.co",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNDQ5NzUsImV4cCI6MjA1MzgyMDk3NX0.7Mn5vXXre0KwW0lKgsPv1lwSXn5CiRjTRMw2RuH_55g",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODI0NDk3NSwiZXhwIjoyMDUzODIwOTc1fQ.blOq_yJX-J-N7znR-4220THNruoI7j_bLONliOtukmQ",
  },
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

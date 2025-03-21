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
    
    // Server
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default("0.0.0.0"),
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
    SMS_API_URL: "https://cc.automate8.com",
    
    // Email API
    EMAIL_API_URL: "https://cc.automate8.com",
    
    // Server
    PORT: process.env.PORT,
    HOST: process.env.HOST,
  },
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

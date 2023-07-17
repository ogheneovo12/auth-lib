import dotenv from "dotenv";

dotenv.config();

const APP_CONFIG = {
  PORT: process.env.PORT || 9000,
  JWT_ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_TOKEN_SECRET || "abcd",
  JWT_REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_TOKEN_SECRET || "123",
  REDIS_URL: process.env.REDIS_URL || "123",
};

export default APP_CONFIG;

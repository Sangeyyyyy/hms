import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
}));

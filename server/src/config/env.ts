import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function buildDatabaseUrl(): string {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  const host = process.env['DB_HOST'] || 'localhost';
  const port = process.env['DB_PORT'] || '5432';
  const user = required('DB_USER');
  const pass = required('DB_PASSWORD');
  const name = required('DB_NAME');
  return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
}

export const env = {
  PORT: parseInt(process.env['PORT'] || '5000', 10),
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  DATABASE_URL: buildDatabaseUrl(),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] || '7d',
  UPLOAD_DIR: process.env['UPLOAD_DIR'] || './uploads',
};

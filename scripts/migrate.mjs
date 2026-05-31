import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(sql);

try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Database migrations applied.');
} finally {
  await sql.end();
}

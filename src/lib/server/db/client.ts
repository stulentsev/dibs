import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config';
import * as schema from './schema';

let client: postgres.Sql | null = null;

export function getSqlClient(): postgres.Sql {
  client ??= postgres(env('DATABASE_URL'), {
    max: 10,
    prepare: false
  });
  return client;
}

export function getDb() {
  return drizzle(getSqlClient(), { schema });
}

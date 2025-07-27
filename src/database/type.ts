import type { NeonDatabase } from 'drizzle-orm/neon-serverless';

import * as schema from './schemas';

export type TryonDatabaseSchema = typeof schema;

export type TryonDatabase = NeonDatabase<TryonDatabaseSchema>;

export type Transaction = Parameters<Parameters<TryonDatabase['transaction']>[0]>[0];

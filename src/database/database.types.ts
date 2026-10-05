import type { DatabaseService } from './database.service.js';
export type DbTransaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];

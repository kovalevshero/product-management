import { Global, Module } from '@nestjs/common';
import { DatabaseService, DRIZZLE_TOKEN } from './database.service.js';

@Global()
@Module({
  providers: [
    DatabaseService,
    {
      provide: DRIZZLE_TOKEN,
      useFactory: (databaseService: DatabaseService) => databaseService.db,
      inject: [DatabaseService],
    },
  ],
  exports: [DatabaseService, DRIZZLE_TOKEN],
})
export class DatabaseModule {}

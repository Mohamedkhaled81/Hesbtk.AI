import { Module, Global } from '@nestjs/common';
import { DatabaseService, PublicPrismaService } from './database.service';

@Global()
@Module({
  providers: [
    PublicPrismaService,
    DatabaseService,
  ],
  exports: [
    PublicPrismaService,
    DatabaseService,
  ],
})
export class DatabaseModule {}
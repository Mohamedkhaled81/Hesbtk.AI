import {
  Injectable,
  OnModuleDestroy,
  Scope,
} from '@nestjs/common';
import { PrismaClient as PublicClient } from '@prisma/client-public';
import { PrismaClient as TenantClient } from '@prisma/client-tenant';
import { tenantStorage } from '../common/utils/tenant-context';

@Injectable()
export class PublicPrismaService
  extends PublicClient
  implements OnModuleDestroy
{
  constructor() {
    super({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  /**
   * Cache for tenant clients
   */
  private tenantClients = new Map<string, TenantClient>();

  private readonly baseDbUrl = process.env.DATABASE_URL;

  constructor(public readonly publicDb: PublicPrismaService) {}

  /**
   * Get tenant-specific Prisma client
   */
  get tenantDb(): TenantClient {
    const schemaName = tenantStorage.getStore();

    if (!schemaName) {
      throw new Error(
        'Tenant context is missing. Ensure TenantMiddleware is applied.',
      );
    }

    /**
     * Return cached client if exists
     */
    const existingClient = this.tenantClients.get(schemaName);
    if (existingClient) {
      return existingClient;
    }

    /**
     * Build connection URL with schema
     */
    const separator = this.baseDbUrl!.includes('?') ? '&' : '?';
    const tenantConnectionUrl = `${this.baseDbUrl}${separator}schema=${schemaName}`;

    /**
     * Create new tenant client
     */
    const client = new TenantClient({
      datasources: {
        db: {
          url: tenantConnectionUrl,
        },
      },
    });

    /**
     * Cache client
     */
    this.tenantClients.set(schemaName, client);

    return client;
  }

  /**
   * Cleanup all tenant connections on shutdown
   */
  async onModuleDestroy() {
    for (const client of this.tenantClients.values()) {
      await client.$disconnect();
    }
  }
}
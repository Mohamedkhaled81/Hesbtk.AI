import { Injectable, NestMiddleware, BadRequestException, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantStorage } from '../utils/tenant-context';
import { PublicPrismaService } from '../../database/database.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  // Inject only the Public DB to resolve tenant metadata
  constructor(private readonly publicDb: PublicPrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;

    // Allow auth and public routes without tenant context
    if (!tenantId) {
      console.log(req.baseUrl);
      if (req.baseUrl.startsWith('/api/v1/auth') || req.baseUrl.startsWith('/api/v1/public')) {
        return next();
      }
      throw new BadRequestException('X-Tenant-ID header is missing');
    }

    // Fetch organization and its schema name from the shared public database
    const org = await this.publicDb.organization.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    });

    if (!org || !org.schemaName) {
      throw new NotFoundException('Organization not found or has no database schema assigned');
    }

    // Run the request inside the tenant-specific schema context
    tenantStorage.run(org.schemaName, () => {
      next();
    });
  }
}
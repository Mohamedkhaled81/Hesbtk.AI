import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PublicPrismaService } from '../../database/database.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client-public';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PublicPrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * REGISTER FLOW (User + Org + Membership)
   */
  async register(dto: any) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 1. Create User
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
      },
    });

    // 2. Create Organization
    const schemaName = `tenant_${user.id.replace(/-/g, '')}`;

    const org = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
        industry: dto.industry,
        currency: dto.currency,
        schemaName,
      },
    });

    // 3. Create membership (OrganizationUser)
    await this.prisma.organizationUser.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: Role.OWNER,
        isActive: true,
      },
    });

    return this.generateToken(user.id, org.id, user.email);
  }

  /**
   * LOGIN FLOW
   */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // get user organization
    const membership = await this.prisma.organizationUser.findFirst({
      where: { userId: user.id },
      include: {
        organization: true,
      },
    });

    return this.generateToken(
      user.id,
      membership?.organizationId,
      user.email,
    );
  }

  /**
   * JWT
   */
  private generateToken(
    userId: string,
    orgId: string | undefined,
    email: string,
  ) {
    return {
      access_token: this.jwtService.sign({
        sub: userId,
        orgId,
        email,
      }),
    };
  }
}
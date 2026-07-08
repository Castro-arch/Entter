import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY, type PermissionKey } from '../decorators/permission.decorator';
import { JwtPayload } from '../types/jwt-payload.type';

const FIELD_BY_KEY: Record<PermissionKey, 'canCheckIn' | 'canCertificates' | 'canEventos'> = {
  checkIn: 'canCheckIn',
  certificates: 'canCertificates',
  eventos: 'canEventos',
};

/** OWNER always passes. STAFF is checked live against the DB (not the JWT,
 * which is issued at login and would go stale if the OWNER changes a
 * permission mid-session). */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<PermissionKey | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (user.role === 'OWNER') return true;

    const field = FIELD_BY_KEY[permission];
    const record = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { [field]: true },
    });
    if (!record?.[field]) {
      throw new ForbiddenException('You do not have access to this area');
    }
    return true;
  }
}

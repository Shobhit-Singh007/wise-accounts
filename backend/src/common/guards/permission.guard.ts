import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { hasPermission } from '../../staff/permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const businessId = request.params?.businessId;

    if (!user?.sub || !businessId) {
      return true;
    }

    const membership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: user.sub, businessId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this business');
    }

    if (membership.role === 'BUSINESS_ADMIN') {
      const permissions = membership.permissions as string[];
      if (permissions && permissions.length > 0) {
        const allRequired = requiredPermissions.every((p) => hasPermission(permissions, p));
        if (!allRequired) {
          throw new ForbiddenException(
            `Missing permissions: ${requiredPermissions.filter((p) => !hasPermission(permissions, p)).join(', ')}`,
          );
        }
      }
    }

    request.userBusinessRole = membership.role;
    request.userPermissions = membership.permissions;

    return true;
  }
}

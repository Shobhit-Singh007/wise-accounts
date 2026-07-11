import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BusinessOwnershipGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const businessId = request.params?.businessId;
    const userId = request.user?.sub;

    if (!businessId) return true;

    const membership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this business');
    }
    request.userBusinessRole = membership.role;
    return true;
  }
}

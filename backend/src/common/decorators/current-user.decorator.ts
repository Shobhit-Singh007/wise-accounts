import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  businessId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) return undefined as any;
    return data ? (user[data] ?? undefined as any) : user;
  },
);

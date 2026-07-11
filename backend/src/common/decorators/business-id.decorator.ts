import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const BusinessId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.params?.businessId || request.user?.businessId;
  },
);

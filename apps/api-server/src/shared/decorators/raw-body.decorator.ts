import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const extractRawBadyStrategy = Object.freeze({
  http: (ctx: ExecutionContext) => ctx.switchToHttp().getRequest().rawBody,
});

export const RawBody = createParamDecorator((data: unknown, ctx: ExecutionContext): unknown => {
  const ctxType = ctx.getType();
  return extractRawBadyStrategy[ctxType](ctx);
});

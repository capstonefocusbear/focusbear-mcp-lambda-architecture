import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const extractHeadersStrategy = Object.freeze({
  http: (ctx: ExecutionContext): unknown => ctx.switchToHttp().getRequest().raw.headers,
});

export const Headers = createParamDecorator((data: unknown, ctx: ExecutionContext): unknown => {
  const ctxType = ctx.getType();
  return extractHeadersStrategy[ctxType](ctx);
});
